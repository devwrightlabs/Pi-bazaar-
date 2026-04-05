/**
 * POST /api/escrow/verify-payment
 *
 * Verifies a Pi Network payment against the Pi Developer API and funds the
 * escrow once all checks pass.
 *
 * Flow:
 *   1. Authenticate buyer via custom JWT.
 *   2. Validate the escrow record (exists, owned by buyer, status is 'pending').
 *   3. Fetch the payment from the Pi Network API and verify amount + user.
 *   4. Approve and complete the payment on the Pi Network.
 *   5. Update escrow to 'funded' and product to 'sold' in Supabase.
 *
 * Security:
 *   - Payment amount is always cross-checked against the database record.
 *   - Pi API calls are server-to-server using PI_API_KEY (never sent to client).
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import type { VerifyPaymentRequest, VerifyPaymentResponse, PiPaymentResponse, EscrowRecord } from '@/types/escrow'

// Floating-point tolerance for comparing Pi payment amounts.
const PAYMENT_AMOUNT_TOLERANCE = 0.0000001

// Allowlist pattern for Pi Network payment identifiers.
// Pi payment IDs are alphanumeric strings with optional dashes/underscores.
// The hyphen is placed at the end of the character class to be unambiguously literal.
const SAFE_PAYMENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/

// ─── Pi API helper ────────────────────────────────────────────────────────────

function getPiApiKey(): string | null {
  return process.env.PI_API_KEY ?? null
}

/**
 * Validates that a payment ID contains only safe characters before embedding
 * it in a URL, preventing potential path traversal / SSRF attacks.
 */
function isSafePaymentId(paymentId: string): boolean {
  return SAFE_PAYMENT_ID_RE.test(paymentId)
}

async function fetchPiPayment(paymentId: string, apiKey: string): Promise<PiPaymentResponse> {
  const url = new URL(`https://api.minepi.com/v2/payments/${paymentId}`)
  const res = await fetch(url, {
    headers: { Authorization: `Key ${apiKey}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pi API returned ${res.status}: ${body}`)
  }

  return res.json() as Promise<PiPaymentResponse>
}

async function approvePiPayment(paymentId: string, apiKey: string): Promise<void> {
  const url = new URL(`https://api.minepi.com/v2/payments/${paymentId}/approve`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pi approve returned ${res.status}: ${body}`)
  }
}

async function completePiPayment(paymentId: string, txid: string, apiKey: string): Promise<void> {
  const url = new URL(`https://api.minepi.com/v2/payments/${paymentId}/complete`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ txid }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pi complete returned ${res.status}: ${body}`)
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate buyer.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const buyerPiUid = auth.pi_uid

    // 2. Parse request body.
    const body = (await req.json()) as VerifyPaymentRequest
    const { payment_id, escrow_id } = body

    if (!payment_id || !escrow_id) {
      return NextResponse.json({ error: 'payment_id and escrow_id are required' }, { status: 400 })
    }

    // Validate payment_id format to prevent path traversal / SSRF.
    if (!isSafePaymentId(payment_id)) {
      return NextResponse.json({ error: 'Invalid payment_id format' }, { status: 400 })
    }

    // 3. Validate the escrow record.
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, buyer_id, seller_id, amount_pi, status, product_id, listing_id')
      .eq('id', escrow_id)
      .single()

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    const typedEscrow = escrow as EscrowRecord

    if (typedEscrow.buyer_id !== buyerPiUid) {
      console.warn(`[escrow/verify-payment] Unauthorized access attempt: buyer=${buyerPiUid}, escrow_buyer=${typedEscrow.buyer_id}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (typedEscrow.status !== 'pending') {
      return NextResponse.json(
        { error: `Escrow is already in status '${typedEscrow.status}'` },
        { status: 400 }
      )
    }

    // 4. Verify the payment with the Pi Network API.
    const apiKey = getPiApiKey()
    if (!apiKey) {
      console.error('[escrow/verify-payment] PI_API_KEY is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    let piPayment: PiPaymentResponse
    try {
      piPayment = await fetchPiPayment(payment_id, apiKey)
    } catch (err) {
      console.error('[escrow/verify-payment] Failed to fetch payment from Pi API:', err)
      return NextResponse.json(
        { error: 'Failed to verify payment with Pi Network' },
        { status: 502 }
      )
    }

    // Verify user UID matches.
    if (piPayment.user_uid !== buyerPiUid) {
      console.warn(`[escrow/verify-payment] Payment user_uid mismatch: payment=${piPayment.user_uid}, buyer=${buyerPiUid}`)
      return NextResponse.json(
        { error: 'Payment user does not match authenticated buyer' },
        { status: 400 }
      )
    }

    // Verify payment amount matches escrow amount (compare with tolerance for floating point).
    const escrowAmount = Number(typedEscrow.amount_pi)
    if (Math.abs(piPayment.amount - escrowAmount) > PAYMENT_AMOUNT_TOLERANCE) {
      console.warn(`[escrow/verify-payment] Amount mismatch: payment=${piPayment.amount}, escrow=${escrowAmount}`)
      return NextResponse.json(
        { error: 'Payment amount does not match escrow amount' },
        { status: 400 }
      )
    }

    // 5. Approve the payment (developer-side approval).
    if (!piPayment.status.developer_approved) {
      try {
        await approvePiPayment(payment_id, apiKey)
      } catch (err) {
        console.error('[escrow/verify-payment] Failed to approve payment:', err)
        return NextResponse.json({ error: 'Failed to approve payment' }, { status: 502 })
      }
    }

    // 6. Complete the payment on the blockchain (requires txid from the transaction).
    if (!piPayment.status.developer_completed) {
      if (!piPayment.transaction?.txid) {
        return NextResponse.json(
          { error: 'Payment transaction not yet available — please retry shortly' },
          { status: 400 }
        )
      }

      try {
        await completePiPayment(payment_id, piPayment.transaction.txid, apiKey)
      } catch (err) {
        console.error('[escrow/verify-payment] Failed to complete payment:', err)
        return NextResponse.json({ error: 'Failed to complete payment' }, { status: 502 })
      }
    }

    // 7. Update escrow to 'funded' and product to 'sold'.
    // Note: the schema keeps both `product_id` and `listing_id` in sync via a
    // trigger for backward compatibility with older application code. We prefer
    // `product_id` (the Phase 2 canonical column) but fall back to `listing_id`
    // for records created by earlier routes that only set `listing_id`.
    const productId = typedEscrow.product_id ?? typedEscrow.listing_id

    const [escrowUpdate, productUpdate] = await Promise.all([
      supabaseAdmin
        .from('escrow_transactions')
        .update({
          pi_payment_id: payment_id,
          status: 'funded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrow_id),
      productId
        ? supabaseAdmin
            .from('products')
            .update({ status: 'sold', updated_at: new Date().toISOString() })
            .eq('id', productId)
        : Promise.resolve({ error: null }),
    ])

    if (escrowUpdate.error) {
      console.error('[escrow/verify-payment] Escrow update error:', escrowUpdate.error)
      return NextResponse.json({ error: 'Failed to update escrow record' }, { status: 500 })
    }

    if (productUpdate.error) {
      console.error('[escrow/verify-payment] Product update error:', productUpdate.error)
      // Non-fatal: escrow is funded; log and continue.
    }

    const response: VerifyPaymentResponse = {
      success: true,
      escrow_id: escrow_id,
      status: 'funded',
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('[escrow/verify-payment] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
