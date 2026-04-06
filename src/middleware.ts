import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { supabaseUrl, supabaseAnonKey } from '@/lib/env'

// ─── Shared In-Memory Rate Limiter ──────────────────────────────────────────

/**
 * Sliding-window rate limiter keyed by client identifier (IP or JWT sub).
 * Request timestamps are stored in memory for the lifetime of the current
 * server instance.
 */
type RateLimitEntry = {
  timestamps: number[]
  lastSeen: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_ENTRY_TTL_MS = 5 * 60_000
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000
let nextRateLimitCleanupAt = 0

function pruneRateLimitStore(now: number): void {
  if (now < nextRateLimitCleanupAt) {
    return
  }

  nextRateLimitCleanupAt = now + RATE_LIMIT_CLEANUP_INTERVAL_MS
  const expirationTime = now - RATE_LIMIT_ENTRY_TTL_MS

  for (const [storeKey, entry] of rateLimitStore.entries()) {
    if (entry.lastSeen <= expirationTime) {
      rateLimitStore.delete(storeKey)
    }
  }
}

/**
 * Returns `true` if the request is within the rate limit.
 */
async function isWithinLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  pruneRateLimitStore(now)

  const windowStart = now - windowMs
  const storeKey = `rate_limit:${key}`
  const entry = rateLimitStore.get(storeKey)
  const timestamps = entry?.timestamps ?? []
  const activeTimestamps = timestamps.filter((timestamp) => timestamp > windowStart)

  if (activeTimestamps.length >= maxRequests) {
    rateLimitStore.set(storeKey, { timestamps: activeTimestamps, lastSeen: now })
    return false
  }

  activeTimestamps.push(now)
  rateLimitStore.set(storeKey, { timestamps: activeTimestamps, lastSeen: now })
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
 * Extracts a rate-limit key from the request using the best available client
 * network identifier. Prefer the framework-provided client IP when available,
 * then trusted forwarding headers, and finally fall back to a secondary
 * discriminator so requests without IP metadata do not all share one bucket.
 */
function getRateLimitKey(request: NextRequest): string {
  const requestIp =
    'ip' in request && typeof request.ip === 'string' && request.ip.trim().length > 0
      ? request.ip.trim()
      : null

  const forwarded = request.headers.get('x-forwarded-for')
  const forwardedIp = forwarded?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const ip = requestIp || forwardedIp || realIp

  if (ip) {
    return `ip:${ip}`
  }

  const userAgent = request.headers.get('user-agent')?.trim() || 'unknown-ua'
  return `anon:${userAgent}`
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

    try {
      const withinLimit = await isWithinLimit(key, limit, WINDOW_MS)

      if (!withinLimit) {
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
    } catch (error) {
      console.error('Rate limit check failed:', error)
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
