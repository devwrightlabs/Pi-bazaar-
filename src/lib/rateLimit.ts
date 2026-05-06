/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Simple sliding-window counter stored in module scope.
 * Good enough for serverless environments with short time windows
 * (state resets when the function instance recycles, which is acceptable
 * since the window is short and the goal is burst protection, not strict
 * global enforcement).
 */

import type { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  /** Time window in milliseconds. */
  windowMs: number
  /** Maximum requests allowed within the window. */
  max: number
  /** Key function — defaults to the client IP. */
  keyFn?: (req: NextRequest) => string
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// Module-level store; survives across requests within the same serverless instance.
const store = new Map<string, RateLimitEntry>()

/** Remove all entries whose window has already expired. */
function purgeExpired(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

/** Extract the client IP from the request headers. */
function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

/**
 * Returns a rate-limit checker function for the given options.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 10 })
 *   const rl = limiter(req)
 *   if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */
export function rateLimit(
  options: RateLimitOptions
): (req: NextRequest) => RateLimitResult {
  const { windowMs, max, keyFn = getIp } = options

  return function check(req: NextRequest): RateLimitResult {
    // Opportunistically clean up stale entries to avoid unbounded memory growth.
    purgeExpired()

    const key = keyFn(req)
    const now = Date.now()

    let entry = store.get(key)

    if (!entry || entry.resetAt <= now) {
      // Start a fresh window.
      entry = { count: 1, resetAt: now + windowMs }
      store.set(key, entry)
    } else {
      entry.count += 1
    }

    const allowed = entry.count <= max
    const remaining = Math.max(0, max - entry.count)

    return { allowed, remaining, resetAt: entry.resetAt }
  }
}
