/**
 * Auth Helper — SERVER-SIDE ONLY
 *
 * Shared JWT verification utility for all secure API routes.
 * Extracts and verifies the custom Supabase JWT from the Authorization header,
 * returning the decoded payload (including the `pi_uid` claim) or null.
 *
 * The JWT is signed by our /api/auth/verify route using SUPABASE_JWT_SECRET,
 * so the `pi_uid` claim is tamper-proof and safe to use for authorization.
 */

import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  sub: string           // Supabase user UUID
  pi_uid: string        // Pi Network user UID — used by RLS policies
  role: string          // 'authenticated'
  aud: string
  iss: string
  iat: number
  exp: number
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Verifies the custom Supabase JWT from the `Authorization: Bearer <token>`
 * header of the given request.
 *
 * @returns The decoded `AuthPayload` (including `pi_uid`) if valid, or `null`
 *          if the header is missing, malformed, expired, or has an invalid
 *          signature.
 */
export function verifyAuthToken(request: NextRequest): AuthPayload | null {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7).trim()

  if (!token) {
    return null
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET

  if (!jwtSecret) {
    console.error('[authHelper] SUPABASE_JWT_SECRET is not configured')
    return null
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload

    if (!decoded.pi_uid) {
      console.warn('[authHelper] JWT is missing required pi_uid claim')
      return null
    }

    return decoded
  } catch (err) {
    // Token is expired, tampered with, or otherwise invalid — do not log the
    // full error to avoid leaking token content; a short label is sufficient.
    const label = err instanceof Error ? err.name : 'unknown'
    console.warn(`[authHelper] JWT verification failed: ${label}`)
    return null
  }
}
