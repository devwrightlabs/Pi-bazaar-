import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * Supabase Auth Callback Route Handler
 *
 * Securely exchanges the authorization code for a session using @supabase/ssr.
 * This route is called after the user confirms their email or completes OAuth flow.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/marketplace'

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(
          new URL('/login?error=auth_failed', requestUrl.origin)
        )
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (err) {
      console.error('Unexpected auth callback error:', err)
      return NextResponse.redirect(
        new URL('/login?error=unexpected', requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
}
