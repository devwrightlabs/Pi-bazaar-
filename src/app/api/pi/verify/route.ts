/**
 * POST /api/pi/verify
 *
 * Server-side handler for the Pi SDK's `onReadyForServerCompletion` signal.
 *
 * Flow:
 *   1. Authenticate the buyer via custom JWT.
 *   2. Validate the escrow record (exists, owned by buyer, status is 'funded').
 *   3. Fetch the payment from the Pi Network API and verify amount + user.
 *   4. Complete the payment on the Pi blockchain.
 *   5. Transition escrow status to 'held_in_escrow'.
 *   6. For digital products, set review-period metadata so the "Review Gate"
 *      keeps funds locked until the buyer approves or the period expires.
 *   7. Insert an audit log entry.
 *
 * Security:
 *   - Pi API calls are server-to-server using PI_API_KEY (never sent to client).
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS.
 *   - Payment amount is cross-checked against the database escrow record.
 *   - Payment IDs are validated against an allowlist pattern before use in URLs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import type { PiVerifyRequest, PiVerifyResponse, PiPaymentResponse, EscrowRecord } from '@/types/escrow'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Floating-point tolerance for comparing Pi payment amounts. */
const PAYMENT_AMOUNT_TOLERANCE = 0.0000001

/** Allowlist pattern for Pi Network payment identifiers. */
const SAFE_PAYMENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/

/** Default review period for digital products (7 days). */
const DIGITAL_REVIEW_PERIOD_DAYS = 7

// ─── Pi API helpers ───────────────────────────────────────────────────────────

function getPiApiKey(): string | null {
  return process.env.PI_API_KEY ?? null
}

function isSafePaymentId(paymentId: string): boolean {
  return SAFE_PAYMENT_ID_RE.test(paymentId)
}

function isSafeTxid(txid: string): boolean {
  // Stellar transaction hashes are 64-character hex strings.
  // Allow a generous format that covers hex hashes and base64-style IDs.
  return /^[A-Za-z0-9+/=_-]{1,128}$/.test(txid)
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

    // 2. Parse and validate request body.
    const body = (await req.json()) as PiVerifyRequest
    const { payment_id, txid, escrow_id } = body

    if (!payment_id || !txid || !escrow_id) {
      return NextResponse.json(
        { error: 'payment_id, txid, and escrow_id are required' },
        { status: 400 }
      )
    }

    if (!isSafePaymentId(payment_id)) {
      return NextResponse.json({ error: 'Invalid payment_id format' }, { status: 400 })
    }

    if (!isSafeTxid(txid)) {
      return NextResponse.json({ error: 'Invalid txid format' }, { status: 400 })
    }

    // 3. Validate the escrow record.
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, buyer_id, seller_id, amount_pi, status, product_id, listing_id, metadata')
      .eq('id', escrow_id)
      .single()

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    const typedEscrow = escrow as EscrowRecord

    if (typedEscrow.buyer_id !== buyerPiUid) {
      console.warn(`[pi/verify] Unauthorized: buyer=${buyerPiUid}, escrow_buyer=${typedEscrow.buyer_id}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // The escrow must be in 'funded' — meaning the payment was already approved
    // by the /api/escrow/verify-payment route during onReadyForServerApproval.
    if (typedEscrow.status !== 'funded') {
      return NextResponse.json(
        { error: `Escrow is in status '${typedEscrow.status}'; expected 'funded'` },
        { status: 400 }
      )
    }

    // Verify that the escrow is linked to this payment.
    if (typedEscrow.pi_payment_id !== payment_id) {
      return NextResponse.json(
        { error: 'Payment ID does not match the escrow record' },
        { status: 400 }
      )
    }

    // 4. Verify the payment with the Pi Network API.
    const apiKey = getPiApiKey()
    if (!apiKey) {
      console.error('[pi/verify] PI_API_KEY is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    let piPayment: PiPaymentResponse
    try {
      piPayment = await fetchPiPayment(payment_id, apiKey)
    } catch (err) {
      console.error('[pi/verify] Failed to fetch payment from Pi API:', err)
      return NextResponse.json(
        { error: 'Failed to verify payment with Pi Network' },
        { status: 502 }
      )
    }

    // Cross-check user identity.
    if (piPayment.user_uid !== buyerPiUid) {
      console.warn(`[pi/verify] user_uid mismatch: payment=${piPayment.user_uid}, buyer=${buyerPiUid}`)
      return NextResponse.json(
        { error: 'Payment user does not match authenticated buyer' },
        { status: 400 }
      )
    }

    // Cross-check amount.
    const escrowAmount = Number(typedEscrow.amount_pi)
    if (Math.abs(piPayment.amount - escrowAmount) > PAYMENT_AMOUNT_TOLERANCE) {
      console.warn(`[pi/verify] Amount mismatch: payment=${piPayment.amount}, escrow=${escrowAmount}`)
      return NextResponse.json(
        { error: 'Payment amount does not match escrow amount' },
        { status: 400 }
      )
    }

    // 5. Complete the payment on the blockchain (if not already completed).
    if (!piPayment.status.developer_completed) {
      try {
        await completePiPayment(payment_id, txid, apiKey)
      } catch (err) {
        console.error('[pi/verify] Failed to complete payment:', err)
        return NextResponse.json({ error: 'Failed to complete payment' }, { status: 502 })
      }
    }

    // 6. Determine if this is a digital product for the Review Gate lock.
    const productId = typedEscrow.product_id ?? typedEscrow.listing_id
    let isDigital = false
    if (productId) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('category')
        .eq('id', productId)
        .single()
      isDigital = (product?.category ?? '').toLowerCase() === 'digital'
    }

    // Build metadata with review gate info for digital products.
    const existingMetadata = (typedEscrow.metadata ?? {}) as Record<string, unknown>
    const reviewGateMetadata = isDigital
      ? {
          ...existingMetadata,
          review_gate: true,
          review_period_days: DIGITAL_REVIEW_PERIOD_DAYS,
          review_expires_at: new Date(
            Date.now() + DIGITAL_REVIEW_PERIOD_DAYS * 24 * 60 * 60 * 1000
          ).toISOString(),
        }
      : existingMetadata

    // 7. Update escrow to 'held_in_escrow'.
    const now = new Date().toISOString()
    const escrowUpdate = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'held_in_escrow',
        metadata: reviewGateMetadata,
        updated_at: now,
      })
      .eq('id', escrow_id)
      .eq('status', 'funded')
      .select('id')

    if (escrowUpdate.error) {
      console.error('[pi/verify] Escrow update error:', escrowUpdate.error)
      return NextResponse.json({ error: 'Failed to update escrow record' }, { status: 500 })
    }

    if ((escrowUpdate.data?.length ?? 0) !== 1) {
      return NextResponse.json(
        { error: 'Escrow was already processed or is no longer in funded status' },
        { status: 409 }
      )
    }

    // 8. Insert an audit log entry.
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        admin_id: null,
        action_type: 'payment_verified',
        target_id: escrow_id,
        details: {
          payment_id,
          txid,
          buyer_id: buyerPiUid,
          amount_pi: escrowAmount,
          is_digital: isDigital,
          review_gate: isDigital,
        },
      })
      .then(({ error }) => {
        if (error) console.error('[pi/verify] Audit log insert error:', error)
      })

    // 9. Return success.
    const response: PiVerifyResponse = {
      success: true,
      escrow_id,
      status: 'held_in_escrow',
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('[pi/verify] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
