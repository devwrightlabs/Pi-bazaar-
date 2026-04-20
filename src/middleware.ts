import { NextResponse, type NextRequest } from 'next/server'

// Intentionally pass-through only to avoid protocol/header interference with
// Vercel edge SSL termination in Pi Sandbox.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
