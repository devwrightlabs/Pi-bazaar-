/**
 * POST /api/auth/verify
 *
 * Server-side Pi Network token verification and custom JWT minting.
 *
 * Flow:
 *   1. Receive `{ accessToken }` from the client (obtained via Pi SDK).
 *   2. Verify the token with the Pi Network Developer API (server-to-server).
 *   3. Upsert the verified user into the `users` table via the service role client.
 *   4. Mint a custom Supabase-compatible JWT containing the `pi_uid` claim.
 *   5. Return `{ token, user }` to the client.
 *
 * SECURITY:
 *   - Pi API call is server-to-server — the client never touches api.minepi.com.
 *   - JWT is signed with SUPABASE_JWT_SECRET; Supabase verifies this signature
 *     on every query, so `auth.jwt() ->> 'pi_uid'` in RLS is tamper-proof.
 *   - No client-side set_config() or RPC is used.
 *
 * Required environment variables (server-side only):
 *   SUPABASE_URL            — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key
 *   SUPABASE_JWT_SECRET     — Supabase JWT signing secret
 *   PI_API_KEY              — Pi Network Developer API key (if required by Pi API)
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PiMeResponse {
  uid: string
  username: string
}

interface VerifyRequestBody {
  accessToken?: unknown
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse and validate input.
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
        ...(process.env.PI_API_KEY ? { 'X-Api-Key': process.env.PI_API_KEY } : {}),
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

    // 3. Upsert the verified user into the `users` table using the service role
    //    client (bypasses RLS — this is intentional for the auth route only).
    const { data: dbUser, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          pi_uid: piUser.uid,
          pi_username: piUser.username ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'pi_uid' }
      )
      .select('id, pi_uid, pi_username')
      .single()

    if (upsertError || !dbUser) {
      console.error('[auth/verify] DB upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to persist user' }, { status: 500 })
    }

    // 4. Mint a custom Supabase-compatible JWT.
    //    The JWT includes a `pi_uid` custom claim that RLS policies read via
    //    `auth.jwt() ->> 'pi_uid'`. Supabase validates the signature using
    //    SUPABASE_JWT_SECRET, so this claim cannot be forged by clients.
    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!jwtSecret) {
      console.error('[auth/verify] SUPABASE_JWT_SECRET is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const JWT_EXPIRY_SECONDS = 3600 // 1 hour
    const now = Math.floor(Date.now() / 1000)

    const customToken = jwt.sign(
      {
        sub: dbUser.id,            // Supabase user UUID
        pi_uid: dbUser.pi_uid,     // Custom claim — read by RLS policies
        role: 'authenticated',     // Required by Supabase RLS role checks
        aud: 'authenticated',      // Required audience
        iss: supabaseUrl,          // Issuer — Supabase project URL
        iat: now,
        exp: now + JWT_EXPIRY_SECONDS,
      },
      jwtSecret
    )

    // 5. Return the token and basic user info.
    return NextResponse.json({
      token: customToken,
      user: {
        pi_uid: dbUser.pi_uid,
        pi_username: dbUser.pi_username ?? null,
      },
    })
  } catch (error) {
    console.error('[auth/verify] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
