/**
 * Auth Helper — Server-Side JWT Verification
 *
 * Provides a shared utility for API routes to verify the custom Supabase JWT
 * issued by /api/auth/verify and extract the authenticated user's pi_uid.
 *
 * The JWT is signed with SUPABASE_JWT_SECRET (server-side only) and contains
 * a `pi_uid` custom claim that is read by RLS policies via `auth.jwt() ->> 'pi_uid'`.
 *
 * SECURITY:
 *   - All identity extraction happens server-side from a verified JWT.
 *   - No client-provided user IDs are trusted for authentication decisions.
 *   - The pi_uid returned here is used as the seller_id / buyer_id in DB writes.
 *
 * Required environment variable (server-side only):
 *   SUPABASE_JWT_SECRET — the secret used to sign/verify custom JWTs
 */

import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

export interface AuthPayload {
  /** The authenticated user's Pi Network UID — matches users.pi_uid in the DB. */
  pi_uid: string
  /** Standard JWT subject — the app user row UUID, matching public.users.id. */
  sub: string
  /** Supabase role claim, typically 'authenticated'. */
  role: string
  aud: string
  iss: string
  iat: number
  exp: number
}

/**
 * Extracts and verifies the custom JWT from the Authorization header.
 *
 * @param req - The incoming Next.js request.
 * @returns The decoded {@link AuthPayload} if valid, or `null` if missing/invalid.
 */
export function verifyAuthToken(req: NextRequest): AuthPayload | null {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!token) {
    return null
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  if (!jwtSecret) {
    console.error('[authHelper] SUPABASE_JWT_SECRET is not set')
    return null
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as AuthPayload

    if (!payload.pi_uid) {
      console.error('[authHelper] JWT is missing pi_uid claim')
      return null
    }

    if (payload.role !== 'authenticated') {
      console.error('[authHelper] JWT has unexpected role claim:', payload.role)
      return null
    }

    return payload
  } catch (err) {
    // Token expired, malformed, or invalid signature — treat as unauthenticated
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[authHelper] JWT verification failed:', (err as Error).message)
    }
    return null
  }
}
