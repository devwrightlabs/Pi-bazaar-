import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Add request ID header for tracing
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-Id', requestId)

  // Log API requests
  if (pathname.startsWith('/api/')) {
    console.log(
      JSON.stringify({
        type: 'api_request',
        method: req.method,
        path: pathname,
        requestId,
        ip: req.headers.get('x-forwarded-for') ?? 'unknown',
        ua: req.headers.get('user-agent')?.slice(0, 100) ?? '',
        ts: new Date().toISOString(),
      })
    )
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
