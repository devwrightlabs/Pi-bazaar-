// Pi SDK wrapper with try/catch for all calls

declare global {
  interface Window {
    Pi?: PiSDK
  }
}

interface PiSDK {
  init: (config: { version: string; sandbox: boolean }) => void
  authenticate: (scopes: string[], onIncompletePaymentFound: (payment: PiPayment) => void) => Promise<PiAuthResult>
  createPayment: (paymentData: PiPaymentData, callbacks: PiPaymentCallbacks) => void
  openShareDialog: (title: string, message: string) => void
}

interface PiAuthResult {
  accessToken: string
  user: {
    uid: string
    username: string
  }
}

interface PiPayment {
  identifier: string
  user_uid: string
  amount: number
  memo: string
  metadata: Record<string, unknown>
  to_address: string
  created_at: string
  status: {
    developer_approved: boolean
    transaction_verified: boolean
    developer_completed: boolean
    cancelled: boolean
    user_cancelled: boolean
  }
  transaction: null | {
    txid: string
    verified: boolean
    _link: string
  }
}

interface PiPaymentData {
  amount: number
  memo: string
  metadata: Record<string, unknown>
}

interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void
  onReadyForServerCompletion: (paymentId: string, txid: string) => void
  onCancel: (paymentId: string) => void
  onError: (error: Error, payment?: PiPayment) => void
}

// ─── SDK initialization ───────────────────────────────────────────────────────

let piSdkInitialised = false

function getPiSdk(): PiSDK | null {
  if (!(typeof window !== 'undefined' && window.Pi)) {
    return null
  }
  return window.Pi
}

/**
 * Initialise the Pi SDK.
 *
 * Call this once on app startup (e.g. in a top-level layout or provider).
 * The `sandbox` flag controls whether the SDK operates in test mode.
 * The Pi SDK script (`https://sdk.minepi.com/pi-sdk.js`) must already be
 * loaded via a `<script>` tag before calling this function.
 *
 * CRITICAL: This function explicitly calls window.Pi.init() with the proper
 * configuration. This MUST happen before any authentication or wallet operations.
 */
export function initPiSdk(): boolean {
  if (piSdkInitialised) return true
  if (!(typeof window !== 'undefined' && window.Pi)) {
    console.warn('[pi-sdk] Pi SDK script is not loaded')
    return false
  }
  const pi = window.Pi

  try {
    // Explicitly initialize the Pi SDK in production mode
    pi.init({ version: '2.0', sandbox: false })
    piSdkInitialised = true
    console.info('[pi-sdk] Initialized successfully (sandbox: false)')
    return true
  } catch (error) {
    console.error('[pi-sdk] Initialization failed:', error)
    return false
  }
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticateWithPi(): Promise<PiAuthResult | null> {
  try {
    if (!(typeof window !== 'undefined' && window.Pi)) {
      console.error('[pi-sdk] Wallet Connection Failed: Pi SDK not available')
      return null
    }

    const scopes = ['username', 'payments']
    const onIncompletePaymentFound = () => {}
    const authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound)
    console.info('[pi-sdk] Wallet Connected! Welcome: ' + authResult.user.username)
    return authResult
  } catch (error: any) {
    console.error('[pi-sdk] Wallet Connection Failed: ' + (error.message || JSON.stringify(error)))
    return null
  }
}

// ─── Payment creation ─────────────────────────────────────────────────────────

export function createPiPayment(
  paymentData: PiPaymentData,
  callbacks: PiPaymentCallbacks
): void {
  try {
    if (!(typeof window !== 'undefined' && window.Pi)) {
      console.warn('Pi SDK not available')
      callbacks.onError(new Error('Pi SDK not available'))
      return
    }
    const pi = window.Pi
    pi.createPayment(paymentData, callbacks)
  } catch (error) {
    console.error('Pi payment creation failed:', error)
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// ─── Server communication helpers ─────────────────────────────────────────────
// These are called from the client inside Pi SDK callbacks to relay payment
// lifecycle events to our backend.  The backend is the ONLY place that touches
// the Pi API key — it is never sent to the browser.

/**
 * Called from `onReadyForServerApproval`.
 *
 * Sends the `paymentId` to the existing escrow verify-payment route which
 * developer-approves the payment and links it to the escrow record.
 */
export async function approvePaymentOnServer(
  paymentId: string,
  escrowId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
    const res = await fetch('/api/escrow/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ payment_id: paymentId, escrow_id: escrowId }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      return { success: false, error: data.error ?? `Server returned ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    console.error('[pi-sdk] approvePaymentOnServer failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Called from `onReadyForServerCompletion`.
 *
 * Posts the payment completion data to `/api/pi/verify` which completes
 * the payment on the Pi blockchain and transitions the escrow to
 * `held_in_escrow`.
 */
export async function completePaymentOnServer(
  paymentId: string,
  txid: string,
  escrowId: string
): Promise<{ success: boolean; escrow_id?: string; error?: string }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
    const res = await fetch('/api/pi/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ payment_id: paymentId, txid, escrow_id: escrowId }),
    })

    const data = await res.json().catch(() => ({})) as { success?: boolean; escrow_id?: string; error?: string }
    if (!res.ok) {
      return { success: false, error: data.error ?? `Server returned ${res.status}` }
    }
    return { success: true, escrow_id: data.escrow_id }
  } catch (err) {
    console.error('[pi-sdk] completePaymentOnServer failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Price fetching ───────────────────────────────────────────────────────────

export async function fetchPiPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://api.minepi.com/v2/prices/pi')
    if (!response.ok) throw new Error('Failed to fetch Pi price')
    const data = await response.json() as { price?: number }
    return data.price ?? null
  } catch (error) {
    console.error('Failed to fetch Pi price:', error)
    return null
  }
}
