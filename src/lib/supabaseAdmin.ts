/**
 * Supabase Admin Client — SERVER-SIDE ONLY
 *
 * ⚠️  NEVER import this module from client components, pages, or any code
 *    that is bundled for the browser. The service role key bypasses all
 *    Row Level Security and must remain strictly server-side.
 *
 * Required environment variables (server-side, not NEXT_PUBLIC_*):
 *   SUPABASE_URL            — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (full DB access, no RLS)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[PiBazaar] supabaseAdmin: Missing required environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  )
}

/**
 * Service-role Supabase client.
 * Bypasses Row Level Security — only use in trusted server-side API routes.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    // Disable the built-in session/cookie management — admin client is
    // stateless and must never store tokens in the browser.
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})
