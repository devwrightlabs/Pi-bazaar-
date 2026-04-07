import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { supabaseUrl, supabaseAnonKey } from '@/lib/env'

// ============================================================
// In-memory sliding-window rate limiter (per IP)
// ============================================================

/** Timestamp array per IP address */
const ipRequestLog = new Map<string, number[]>()

const WINDOW_MS = 60_000 // 1 minute sliding window

/** Standard API endpoints: generous limit */
const STANDARD_LIMIT = 100

/** Critical endpoints: strict limit to prevent spam */
const CRITICAL_LIMIT = 15

/** Path prefixes that are considered critical */
const CRITICAL_PREFIXES = ['/api/escrow', '/api/auth']

/**
 * Periodic cleanup: remove stale entries every 2 minutes to prevent unbounded
 * memory growth in long-running processes.
 */
const CLEANUP_INTERVAL_MS = 120_000
let lastCleanup = Date.now()

function cleanupStaleEntries(): void {
  const cutoff = Date.now() - WINDOW_MS
  for (const [ip, timestamps] of ipRequestLog.entries()) {
    const recent = timestamps.filter((t) => t > cutoff)
    if (recent.length === 0) {
      ipRequestLog.delete(ip)
    } else {
      ipRequestLog.set(ip, recent)
    }
  }
  lastCleanup = Date.now()
}

/**
 * Returns `true` if the request should be allowed, `false` if rate limited.
 */
function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now()
  const cutoff = now - WINDOW_MS

  // Periodic background cleanup
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupStaleEntries()
  }

  const timestamps = ipRequestLog.get(ip) ?? []
  // Remove entries outside the current window
  const recent = timestamps.filter((t) => t > cutoff)
  recent.push(now)
  ipRequestLog.set(ip, recent)

  return recent.length <= limit
}

// ============================================================
// Next.js Middleware
// ============================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting for /api/* routes ──────────────────────────────────────
  if (pathname.startsWith('/api')) {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown'

    const isCritical = CRITICAL_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    const limit = isCritical ? CRITICAL_LIMIT : STANDARD_LIMIT

    // Build a rate-limit key that separates standard and critical buckets
    // so that a burst of standard calls doesn't eat into the critical budget.
    const bucketKey = isCritical ? `${ip}::critical` : `${ip}::standard`

    if (!checkRateLimit(bucketKey, limit)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(limit),
          },
        }
      )
    }
  }

  // ── Supabase session refresh (existing behaviour) ────────────────────────
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
