/**
 * POST /api/auth/pi
 *
 * Pi Network authentication handler.
 * This route securely handles bridging the Pi user's UID to our Supabase backend.
 *
 * Flow:
 *   1. Receive accessToken from Pi SDK client
 *   2. Verify token with Pi Network API (server-to-server)
 *   3. Create/update profile in Supabase
 *   4. Create Supabase session using @supabase/ssr
 *   5. Return session token to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import type { Database, ProfileRow } from '@/types/database'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const jwtSecret = process.env.SUPABASE_JWT_SECRET || ''

interface PiUserResponse {
  uid: string
  username: string
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    const body = await req.json() as { accessToken?: string }
    const { accessToken } = body

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid accessToken' },
        { status: 400 }
      )
    }

    // 2. Verify token with Pi Network API (server-to-server)
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(process.env.PI_API_KEY ? { 'X-Api-Key': process.env.PI_API_KEY } : {}),
      },
    })

    if (!piResponse.ok) {
      console.error('[auth/pi] Pi API error:', piResponse.status)
      return NextResponse.json(
        { error: 'Failed to verify Pi access token' },
        { status: 401 }
      )
    }

    const piUser = await piResponse.json() as PiUserResponse

    if (!piUser.uid) {
      return NextResponse.json(
        { error: 'Invalid Pi API response: missing uid' },
        { status: 502 }
      )
    }

    // 3. Create Supabase admin client (bypasses RLS)
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 4. Upsert profile in Supabase
    const { data: profileData, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: piUser.uid,
          username: piUser.username || 'Pioneer',
          avatar_url: '',
        } as never,
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (upsertError || !profileData) {
      console.error('[auth/pi] Profile upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to create/update profile' },
        { status: 500 }
      )
    }

    const profile = profileData as unknown as ProfileRow

    // 5. Mint a custom JWT for Supabase
    if (!jwtSecret) {
      console.error('[auth/pi] SUPABASE_JWT_SECRET is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const now = Math.floor(Date.now() / 1000)
    const token = jwt.sign(
      {
        sub: profile.id,
        pi_uid: piUser.uid,
        role: 'authenticated',
        aud: 'authenticated',
        iss: supabaseUrl,
        iat: now,
        exp: now + 3600, // 1 hour
      },
      jwtSecret
    )

    // 6. Return token and user info
    return NextResponse.json({
      token,
      user: {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    })
  } catch (error) {
    console.error('[auth/pi] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
