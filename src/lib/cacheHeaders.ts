/**
 * Cache-Control header constants and helper for Next.js API routes.
 *
 * Usage:
 *   import { withCache, PUBLIC_CACHE_SHORT } from '@/lib/cacheHeaders'
 *   return withCache(NextResponse.json(data), PUBLIC_CACHE_SHORT)
 */

import type { NextResponse } from 'next/server'

/** Public responses — short cache (60s fresh, 300s stale-while-revalidate). */
export const PUBLIC_CACHE_SHORT = 'public, max-age=60, stale-while-revalidate=300'

/** Public responses — medium cache (300s fresh, 600s stale-while-revalidate). */
export const PUBLIC_CACHE_MED = 'public, max-age=300, stale-while-revalidate=600'

/** Auth-gated responses — never shared, always revalidated. */
export const PRIVATE_NO_CACHE = 'private, no-cache'

/**
 * Attach a Cache-Control header to a NextResponse and return it.
 * Mutates the response headers in-place (Next.js headers are mutable before send).
 */
export function withCache(res: NextResponse, header: string): NextResponse {
  res.headers.set('Cache-Control', header)
  return res
}
