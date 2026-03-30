// Pi SDK wrapper with try/catch for all calls

declare global {
  interface Window {
    Pi?: PiSDK
  }
}

interface PiSDK {
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

export async function authenticateWithPi(): Promise<PiAuthResult | null> {
  try {
    if (typeof window === 'undefined' || !window.Pi) {
      console.warn('Pi SDK not available')
      return null
    }
    const result = await window.Pi.authenticate(
      ['username', 'payments'],
      (payment: PiPayment) => {
        console.log('Incomplete payment found:', payment.identifier)
      }
    )
    return result
  } catch (error) {
    console.error('Pi authentication failed:', error)
    return null
  }
}

export function createPiPayment(
  paymentData: PiPaymentData,
  callbacks: PiPaymentCallbacks
): void {
  try {
    if (typeof window === 'undefined' || !window.Pi) {
      console.warn('Pi SDK not available')
      callbacks.onError(new Error('Pi SDK not available'))
      return
    }
    window.Pi.createPayment(paymentData, callbacks)
  } catch (error) {
    console.error('Pi payment creation failed:', error)
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

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
