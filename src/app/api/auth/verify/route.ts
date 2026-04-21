/**
 * POST /api/auth/verify
 *
 * Server-side Pi Network token verification and custom JWT minting.
 *
 * Flow:
 *   1. Receive `{ accessToken, user }` from the client (obtained via Pi SDK).
 *   2. Verify the token with the Pi Network Developer API (server-to-server).
 *   3. Upsert the verified user into the `profiles` table via the service role
 *      client, mapping `pi_uid` to the Pi user UID and updating `username`,
 *      `avatar_url`, and `last_login`.
 *   4. Mint a custom Supabase-compatible JWT containing the `pi_uid` claim.
 *   5. Return `{ token, user }` to the client.
 *
 * SECURITY:
 *   - Pi API call is server-to-server — the client never touches api.minepi.com.
 *   - JWT is signed with SUPABASE_JWT_SECRET; Supabase verifies this signature
 *     on every query, so `auth.jwt() ->> 'pi_uid'` in RLS is tamper-proof.
 *   - Tokens produced by this route are verified by the `verifyAuthToken`
 *     utility (`@/lib/authHelper`) in all protected API routes.
 *   - No client-side set_config() or RPC is used.
 *
 * Required environment variables (server-side only):
 *   SUPABASE_URL            — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key
 *   SUPABASE_JWT_SECRET     — Supabase JWT signing secret
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AuthPayload } from '@/lib/authHelper'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PiMeResponse {
  uid: string
  username: string
}

interface VerifyRequestBody {
  accessToken?: unknown
  user?: {
    uid: string
    username: string
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse and validate input — accept both accessToken and user from Pi SDK.
    const body = await req.json() as VerifyRequestBody
    const { accessToken } = body

    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
      return NextResponse.json({ error: 'Missing or invalid accessToken' }, { status: 400 })
    }

    // 2. Verify the token with the Pi Network Developer API (server-to-server).
    //    The Pi API returns the user's verified uid and username.
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!piResponse.ok) {
      const piError = await piResponse.text()
      console.error('[auth/verify] Pi API error:', piResponse.status, piError)
      return NextResponse.json(
        { error: 'Failed to verify Pi access token' },
        { status: 401 }
      )
    }

    const piUser = await piResponse.json() as PiMeResponse

    if (!piUser.uid) {
      return NextResponse.json({ error: 'Invalid Pi API response: missing uid' }, { status: 502 })
    }

    // 3. Upsert the verified user into the `profiles` table using the service
    //    role client (bypasses RLS — this is intentional for the auth route only).
    //    Map `pi_uid` to the Pi user UID, update `username`, `avatar_url`, and
    //    `last_login`.
    const { data: dbUser, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          pi_uid: piUser.uid,
          username: piUser.username ?? 'Pioneer',
          avatar_url: '',
          last_login: new Date().toISOString(),
        },
        { onConflict: 'pi_uid' }
      )
      .select('id, pi_uid, username, avatar_url')
      .single()

    if (upsertError || !dbUser) {
      console.error('[auth/verify] DB upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to persist user' }, { status: 500 })
    }

    // 4. Mint a custom Supabase-compatible JWT.
    //    The JWT includes a `pi_uid` custom claim that RLS policies read via
    //    `auth.jwt() ->> 'pi_uid'`. Supabase validates the signature using
    //    SUPABASE_JWT_SECRET, so this claim cannot be forged by clients.
    //    The resulting token is verified by `verifyAuthToken` (see AuthPayload).
    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!jwtSecret) {
      console.error('[auth/verify] SUPABASE_JWT_SECRET is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    if (!supabaseUrl) {
      console.error('[auth/verify] SUPABASE_URL is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const JWT_EXPIRY_SECONDS = 3600 // 1 hour
    const now = Math.floor(Date.now() / 1000)

    const payload: Omit<AuthPayload, 'iat' | 'exp'> & { iat: number; exp: number } = {
      sub: dbUser.id,            // Supabase user UUID
      pi_uid: dbUser.pi_uid,     // Custom claim — read by RLS policies
      role: 'authenticated',     // Required by Supabase RLS role checks
      aud: 'authenticated',      // Required audience
      iss: supabaseUrl,          // Issuer — Supabase project URL
      iat: now,
      exp: now + JWT_EXPIRY_SECONDS,
    }

    const customToken = jwt.sign(payload, jwtSecret)

    // 5. Return the token and basic user info.
    return NextResponse.json({
      token: customToken,
      user: {
        pi_uid: dbUser.pi_uid,
        username: dbUser.username ?? null,
        avatar_url: dbUser.avatar_url ?? null,
      },
    })
  } catch (error) {
    console.error('[auth/verify] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
