/**
 * Supabase Browser Client
 *
 * Initialises the standard (anon-key) Supabase client for use in client
 * components. Exposes `setSupabaseAuth()` so that after the server-side Pi
 * auth flow completes, subsequent queries are signed with the custom JWT and
 * the RLS policies that read `auth.jwt() ->> 'pi_uid'` work correctly.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL      — Supabase project URL (client-safe)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key (client-safe)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required Supabase environment variable: ${name}`)
  }

  return value
}

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
// Singleton client instance — may be replaced by setSupabaseAuth().
let supabaseInstance: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Returns the current Supabase client instance.
 * Components should call this getter each time rather than caching the
 * reference, so they always receive the authorised client after
 * `setSupabaseAuth()` has been called.
 */
export function getSupabaseClient(): SupabaseClient {
  return supabaseInstance
}

/**
 * Re-initialises the Supabase client with a custom JWT so that all subsequent
 * queries are authorised with the pi_uid claim required by the RLS policies.
 *
 * Call this immediately after receiving the custom JWT from /api/auth/verify.
 */
export function setSupabaseAuth(token: string): void {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * Do not export a direct `supabase` client constant here.
 *
 * `setSupabaseAuth()` replaces the underlying client instance, so any module
 * that cached an exported constant would keep using a stale unauthorised
 * client. Always call `getSupabaseClient()` to resolve the latest instance.
 */
