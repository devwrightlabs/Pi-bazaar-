/**
 * Pi Auth Client Utility
 *
 * Wraps the browser-side Pi Network SDK to:
 *   1. Initialise the Pi SDK.
 *   2. Authenticate the user and obtain an accessToken from the Pi browser.
 *   3. Exchange the accessToken for a custom Supabase-compatible JWT by
 *      calling our secure /api/auth/verify server route.
 *   4. Store the JWT in memory and configure the Supabase client to use it
 *      so that RLS policies based on `auth.jwt() ->> 'pi_uid'` work.
 *   5. Expose helpers to retrieve the token and to log out.
 *
 * ⚠️  Pi Wallet auth logic must NOT be modified without explicit instruction
 *    (per Devright Labs "Do Not Touch" protocol).
 */

import { setSupabaseAuth } from './supabaseClient'

// ─── Pi SDK type declarations ─────────────────────────────────────────────────
// NOTE: Window.Pi and the shared Pi auth flow are defined in `pi-sdk.ts`.
// This module intentionally keeps only the minimal structural shape needed to
// call `init`/`authenticate` here, so `pi-sdk.ts` remains the single source of
// truth for Pi SDK auth types and the supported authentication entry point.

interface PiSDKWithInit {
  init: (config: { version: string; sandbox?: boolean }) => void
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: {
      identifier: string
      user_uid: string
      amount: number
      memo: string
      metadata: Record<string, unknown>
    }) => void
  ) => Promise<{
    accessToken: string
    user: {
      uid: string
      username: string
    }
  }>
}
export interface PiUser {
  pi_uid: string
  pi_username: string | null
}

// ─── Module-level JWT store ───────────────────────────────────────────────────
// Stored in memory only — never written to localStorage to avoid XSS exposure.
let _authToken: string | null = null

// ─── SDK initialisation ───────────────────────────────────────────────────────

/**
 * Initialises the Pi Network SDK.
 * Must be called once before any auth or payment operations, typically in
 * your root layout or _app equivalent.
 *
 * @param sandbox - Set to `true` during development to use Pi Sandbox.
 */
export function initPiSDK(sandbox = false): void {
  if (typeof window === 'undefined') return

  if (!window.Pi) {
    console.warn('[piAuth] Pi SDK not found on window.Pi. Ensure the Pi SDK script is loaded.')
    return
  }

  try {
    (window.Pi as unknown as PiSDKWithInit).init({ version: '2.0', sandbox })
  } catch (error) {
    console.error('[piAuth] Failed to initialise Pi SDK:', error)
  }
}

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Full Pi authentication flow:
 *   1. Calls `window.Pi.authenticate()` to get an accessToken from the Pi browser.
 *   2. Sends the accessToken to `/api/auth/verify` for server-side verification.
 *   3. Stores the returned custom JWT and injects it into the Supabase client.
 *
 * @returns The authenticated user's Pi identity, or `null` if auth fails.
 */
export async function authenticate(): Promise<PiUser | null> {
  if (typeof window === 'undefined' || !window.Pi) {
    console.warn('[piAuth] Pi SDK not available. Cannot authenticate.')
    return null
  }

  try {
    // Step 1 — Authenticate with the Pi browser to get an accessToken.
    const piAuthResult = await (window.Pi as unknown as PiSDKWithInit).authenticate(
      ['username', 'payments'],
      (payment) => {
        // Handle any incomplete payment found during auth.
        console.warn('[piAuth] Incomplete payment detected:', payment.identifier)
      }
    )

    // Step 2 — Exchange the Pi accessToken for our custom Supabase JWT.
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: piAuthResult.accessToken }),
    })

    if (!response.ok) {
      let errorMessage: string | undefined
      try {
        const errorBody = await response.json() as { error?: string }
        errorMessage = errorBody.error
      } catch {
        // Response body is not JSON — log the status code only.
      }
      console.error('[piAuth] Token verification failed:', response.status, errorMessage)
      return null
    }

    const data = await response.json() as { token: string; user: PiUser }

    // Step 3 — Store the JWT and configure the Supabase client.
    _authToken = data.token
    setSupabaseAuth(data.token)

    return data.user
  } catch (error) {
    console.error('[piAuth] Authentication error:', error)
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the current in-memory custom JWT, or `null` if not authenticated.
 */
export function getAuthToken(): string | null {
  return _authToken
}

/**
 * Resets the shared Supabase client back to an unauthenticated state.
 *
 * `setSupabaseAuth()` is also used to configure the authenticated client, so
 * we clear that state here during logout to avoid continuing to send the
 * previous bearer token on subsequent queries.
 */
function resetSupabaseAuth(): void {
  setSupabaseAuth('')
}

/**
 * Clears the stored JWT from memory and resets Supabase client auth state,
 * effectively logging the user out of client-side Supabase operations.
 *
 * Note: this does not invalidate the JWT on the server — JWTs are
 * stateless. Refresh/re-auth will be required for new operations.
 */
export function logout(): void {
  _authToken = null
  resetSupabaseAuth()
}
