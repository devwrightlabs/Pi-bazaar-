import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { supabaseUrl, supabaseAnonKey } from '@/lib/env'

// ─── In-Memory Rate Limiter ──────────────────────────────────────────────────

/**
 * Sliding-window rate limiter keyed by client identifier (IP or JWT sub).
 * Each bucket stores an array of request timestamps. Expired entries are
 * pruned on every access to prevent unbounded memory growth.
 */

interface RateBucket {
  timestamps: number[]
}

const rateBuckets = new Map<string, RateBucket>()

// Periodically purge stale buckets to avoid memory leaks in long-running processes.
const CLEANUP_INTERVAL_MS = 60_000 // 1 minute
let lastCleanup = Date.now()

function pruneStaleEntries(windowMs: number): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, bucket] of rateBuckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)
    if (bucket.timestamps.length === 0) {
      rateBuckets.delete(key)
    }
  }
}

/**
 * Returns `true` if the request is within the rate limit.
 */
function isWithinLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  pruneStaleEntries(windowMs)

  let bucket = rateBuckets.get(key)
  if (!bucket) {
    bucket = { timestamps: [] }
    rateBuckets.set(key, bucket)
  }

  // Drop timestamps outside the current window.
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)

  if (bucket.timestamps.length >= maxRequests) {
    return false
  }

  bucket.timestamps.push(now)
  return true
}

// ─── Rate Limit Configuration ────────────────────────────────────────────────

const WINDOW_MS = 60_000 // 1 minute

// Critical endpoints — strict limits to prevent spam and abuse.
const CRITICAL_PREFIXES = ['/api/escrow', '/api/messages', '/api/auth']
const CRITICAL_LIMIT = 15 // 15 requests per minute

// Standard API endpoints — generous limit.
const STANDARD_LIMIT = 100 // 100 requests per minute

/**
 * Extracts a rate-limit key from the request. Prefers the JWT `sub` claim
 * (stable per-user identity) and falls back to the client IP address.
 */
function getRateLimitKey(request: NextRequest): string {
  // Try to extract sub from the Authorization header without full crypto
  // verification — just enough to get a stable identifier. The actual auth
  // check happens in the route handler via verifyAuthToken().
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      // JWT payload is the second base64url-encoded segment.
      const payloadB64 = token.split('.')[1]
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64)) as { sub?: string; pi_uid?: string }
        if (payload.sub) return `user:${payload.sub}`
        if (payload.pi_uid) return `user:${payload.pi_uid}`
      }
    } catch {
      // Malformed token — fall through to IP.
    }
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

function isCriticalPath(pathname: string): boolean {
  return CRITICAL_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting (API routes only) ─────────────────────────────────────
  if (pathname.startsWith('/api')) {
    const key = getRateLimitKey(request)
    const limit = isCriticalPath(pathname) ? CRITICAL_LIMIT : STANDARD_LIMIT

    if (!isWithinLimit(key, limit, WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // ── Supabase session refresh (all routes) ───────────────────────────────
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the session. Errors are intentionally ignored — the middleware
  // is not an auth gate; it only keeps tokens fresh. A failed refresh
  // will be surfaced when a Server Component or Route Handler calls getUser().
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
