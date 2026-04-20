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
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './env'

function assertSupabaseEnvConfigured(): void {
  if (!isSupabaseConfigured) {
    const message =
      '[PiBazaar] Missing or invalid environment variable(s): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'All Supabase queries will fail until these are configured in your deployment.'
    throw new Error(message)
  }
}

function createSupabaseBrowserClient(authToken?: string): SupabaseClient {
  assertSupabaseEnvConfigured()
  return createClient(supabaseUrl, supabaseAnonKey, authToken
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      }
    : undefined)
}

// Singleton client instance — may be replaced by setSupabaseAuth().
let supabaseInstance: SupabaseClient

try {
  supabaseInstance = createSupabaseBrowserClient()
} catch (error) {
  console.error(
    '[PiBazaar] Supabase client initialization failed. All Supabase queries will fail until the environment variables are configured.',
    error
  )
  // Fallback client keeps the app from crashing but will not succeed without valid env vars.
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
}

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
  try {
    supabaseInstance = createSupabaseBrowserClient(token)
  } catch (error) {
    console.error(
      '[PiBazaar] Unable to set Supabase auth because required environment variables are missing or invalid.',
      error
    )
  }
}

/**
 * Do not export a direct `supabase` client constant here.
 *
 * `setSupabaseAuth()` replaces the underlying client instance, so any module
 * that cached an exported constant would keep using a stale unauthorised
 * client. Always call `getSupabaseClient()` to resolve the latest instance.
 */
