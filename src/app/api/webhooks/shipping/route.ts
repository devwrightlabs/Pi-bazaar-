/**
 * POST /api/webhooks/shipping
 *
 * Secure webhook listener for external shipping carrier updates (e.g.,
 * Shippo, EasyPost). Receives tracking status payloads, verifies the
 * webhook signature, and updates the matching escrow transaction.
 *
 * When a carrier reports "Delivered", the route:
 *   1. Updates the escrow_transactions record status to 'delivered'.
 *   2. Updates the carrier_webhook_status column.
 *   3. Triggers a notification to the buyer (via the existing DB trigger)
 *      reminding them to confirm receipt and release funds.
 *
 * Security:
 *   - Webhook signature is verified using SHIPPING_WEBHOOK_SECRET.
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS.
 *   - No user authentication is required (carrier-to-server communication).
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import crypto from 'crypto'

// ─── Webhook payload types ────────────────────────────────────────────────────

interface ShippingWebhookPayload {
  /** Carrier-assigned tracking identifier (must match escrow carrier_tracking_id) */
  tracking_id: string
  /** Carrier name (e.g., 'usps', 'fedex', 'dhl') */
  carrier: string
  /** Current tracking status from the carrier */
  status: string
  /** Human-readable status description */
  status_detail?: string
  /** ISO 8601 timestamp of the event */
  event_timestamp?: string
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verifies the webhook signature against the raw request body.
 *
 * Carriers typically send an HMAC-SHA256 signature in a header. This
 * implementation uses a constant-time comparison to prevent timing attacks.
 *
 * For production, replace or extend this with the specific carrier's
 * signature scheme. The current implementation uses HMAC-SHA256 with
 * the SHIPPING_WEBHOOK_SECRET env variable.
 */
function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.SHIPPING_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhooks/shipping] SHIPPING_WEBHOOK_SECRET is not configured')
    return false
  }

  if (!signatureHeader) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    )
  } catch {
    // Buffers had different lengths — signatures do not match
    return false
  }
}

// ─── Normalize carrier status ─────────────────────────────────────────────────

/** Map common carrier status strings to a canonical status. */
function normalizeCarrierStatus(raw: string): string {
  const lower = raw.toLowerCase().trim()
  const deliveredAliases = ['delivered', 'delivery_complete', 'completed', 'package_delivered']
  if (deliveredAliases.includes(lower)) return 'delivered'

  const shippedAliases = ['in_transit', 'shipped', 'out_for_delivery', 'transit']
  if (shippedAliases.includes(lower)) return 'in_transit'

  return lower
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Read the raw body for signature verification.
    const rawBody = await req.text()

    // 2. Verify webhook signature.
    // Carriers use different header names (e.g., Shippo: X-Shippo-Signature,
    // EasyPost: X-EasyPost-Signature). Adjust header name per carrier integration.
    const signature = req.headers.get('x-webhook-signature')
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    // 3. Parse and validate the payload.
    let payload: ShippingWebhookPayload
    try {
      payload = JSON.parse(rawBody) as ShippingWebhookPayload
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    if (!payload.tracking_id || typeof payload.tracking_id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid tracking_id' }, { status: 400 })
    }
    if (!payload.status || typeof payload.status !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid status' }, { status: 400 })
    }

    const canonicalStatus = normalizeCarrierStatus(payload.status)

    const findEscrowByTrackingField = async (field: string) => {
      return await supabaseAdmin
        .from('escrow_transactions')
        .select('id, status, buyer_id, seller_id')
        .eq(field, payload.tracking_id)
        .maybeSingle()
    }

    const isMultipleRowsError = (error: { code?: string; details?: string; message?: string } | null) =>
      error?.code === 'PGRST116' &&
      `${error.details ?? ''} ${error.message ?? ''}`.toLowerCase().includes('multiple') &&
      `${error.details ?? ''} ${error.message ?? ''}`.toLowerCase().includes('rows')

    // 4. Find the matching escrow transaction. Prefer the dedicated
    // carrier_tracking_id column, then fall back to the current shipped
    // flow's tracking_number column, and finally the legacy metadata
    // storage.
    let { data: escrow, error: fetchError } = await findEscrowByTrackingField('carrier_tracking_id')

    const findAndBackfillEscrowByTrackingField = async (field: string, sourceLabel: string) => {
      const fallbackResult = await findEscrowByTrackingField(field)

      if (fallbackResult.data) {
        const { error: syncTrackingError } = await supabaseAdmin
          .from('escrow_transactions')
          .update({ carrier_tracking_id: payload.tracking_id })
          .eq('id', fallbackResult.data.id)

        if (syncTrackingError) {
          console.error(
            `[webhooks/shipping] Failed to backfill carrier_tracking_id from ${sourceLabel}:`,
            payload.tracking_id,
            syncTrackingError,
          )
        }
      }

      return fallbackResult
    }

    if (!escrow && !fetchError) {
      const fallbackResult = await findAndBackfillEscrowByTrackingField('tracking_number', 'tracking_number')
      escrow = fallbackResult.data
      fetchError = fallbackResult.error
    }

    if (!escrow && !fetchError) {
      const fallbackResult = await findAndBackfillEscrowByTrackingField(
        'metadata->>tracking_number',
        'metadata.tracking_number',
      )
      escrow = fallbackResult.data
      fetchError = fallbackResult.error
    }
    if (fetchError) {
      if (isMultipleRowsError(fetchError)) {
        console.error(
          '[webhooks/shipping] Duplicate escrow_transactions rows for tracking identifier:',
          payload.tracking_id,
          fetchError,
        )
        // Acknowledge duplicate matches to prevent carrier retry storms.
        return NextResponse.json({ received: true, matched: false, duplicate_tracking_id: true })
      }
      console.error('[webhooks/shipping] Escrow lookup error:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!escrow) {
      // No matching escrow — acknowledge the webhook but take no action.
      // This prevents carriers from retrying for unknown tracking IDs.
      return NextResponse.json({ received: true, matched: false })
    }

    // 5. Always update the carrier_webhook_status to reflect the latest status.
    const { error: webhookStatusError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ carrier_webhook_status: canonicalStatus })
      .eq('id', escrow.id)

    if (webhookStatusError) {
      console.error('[webhooks/shipping] carrier_webhook_status update error:', webhookStatusError)
    }

    // 6. If the package is delivered and escrow is in a valid transition state,
    //    update the escrow status to 'delivered'. This will trigger the
    //    notify_escrow_update DB trigger to notify the buyer.
    if (canonicalStatus === 'delivered' && escrow.status === 'shipped') {
      const { data: updatedEscrows, error: updateError } = await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'delivered' })
        .eq('id', escrow.id)
        .eq('status', 'shipped') // Optimistic lock — only update if still 'shipped'
        .select('id')

      if (updateError) {
        console.error('[webhooks/shipping] Escrow status update error:', updateError)
        return NextResponse.json({ error: 'Failed to update escrow status' }, { status: 500 })
      }

      if (!updatedEscrows || updatedEscrows.length === 0) {
        return NextResponse.json({
          received: true,
          matched: true,
          escrow_id: escrow.id,
          carrier_status: canonicalStatus,
          status_updated: false,
          error: 'Escrow status changed before delivery transition could be applied',
        })
      }
      return NextResponse.json({
        received: true,
        matched: true,
        escrow_id: escrow.id,
        status_updated: 'delivered',
      })
    }

    // Non-delivery status — acknowledged but no escrow status change.
    return NextResponse.json({
      received: true,
      matched: true,
      escrow_id: escrow.id,
      carrier_status: canonicalStatus,
    })
  } catch (err) {
    console.error('[webhooks/shipping] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
