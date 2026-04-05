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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Singleton client instance — may be replaced by setSupabaseAuth().
let supabaseInstance: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Returns the current Supabase client instance.
 * Components should call this getter (or import `supabase` directly) rather
 * than caching the reference, so they always receive the authorised client
 * after `setSupabaseAuth()` has been called.
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
 * Default export — the initial unauthenticated Supabase client instance.
 *
 * ⚠️  This reference becomes stale after `setSupabaseAuth()` is called.
 *    In components that run after authentication, use `getSupabaseClient()`
 *    to always get the latest authorised instance.
 */
export const supabase = supabaseInstance
