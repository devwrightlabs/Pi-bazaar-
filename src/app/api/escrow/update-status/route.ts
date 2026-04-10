/**
 * POST /api/escrow/update-status
 *
 * Handles escrow state transitions with strict server-side authorization.
 *
 * Allowed transitions:
 *   funded    → shipped   (seller only; requires tracking_number + carrier)
 *   shipped   → delivered (buyer only)
 *   delivered → released  (buyer only; TODO: trigger Pi payout to seller in future phase)
 *   funded|shipped → disputed (buyer or seller; requires reason)
 *   pending|disputed → refunded (admin only; TODO: trigger Pi refund in future phase)
 *
 * Security:
 *   - All authorization checks are performed server-side.
 *   - User identity is extracted from the verified JWT, never from the request body.
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { VALID_FROM_STATUS } from '@/types/escrow'
import type { UpdateStatusRequest, UpdateStatusResponse, EscrowRecord, EscrowAction, EscrowStatus } from '@/types/escrow'

// ─── Admin check ──────────────────────────────────────────────────────────────

function isAdmin(piUid: string): boolean {
  const adminUids = process.env.ADMIN_PI_UIDS
  if (!adminUids) return false
  return adminUids.split(',').map(s => s.trim()).includes(piUid)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const callerPiUid = auth.pi_uid

    // 2. Parse request body.
    const body = (await req.json()) as UpdateStatusRequest
    const { escrow_id, action, tracking_number, carrier, reason } = body

    if (!escrow_id || !action) {
      return NextResponse.json({ error: 'escrow_id and action are required' }, { status: 400 })
    }

    const validActions: EscrowAction[] = ['shipped', 'delivered', 'released', 'disputed', 'refunded']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action '${action}'` }, { status: 400 })
    }

    // 3. Fetch the escrow record.
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, buyer_id, seller_id, status, product_id, listing_id, metadata')
      .eq('id', escrow_id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    const typedEscrow = escrow as EscrowRecord
    const currentStatus = typedEscrow.status as EscrowStatus

    // 4. Enforce state machine — verify the transition is valid.
    const allowedFromStatuses = VALID_FROM_STATUS[action]
    if (!allowedFromStatuses.includes(currentStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from '${currentStatus}' to '${action}'` },
        { status: 400 }
      )
    }

    // 5. Enforce role-based authorization.
    const isBuyer = typedEscrow.buyer_id === callerPiUid
    const isSeller = typedEscrow.seller_id === callerPiUid

    switch (action) {
      case 'shipped':
        if (!isSeller) {
          return NextResponse.json({ error: 'Only the seller can mark an item as shipped' }, { status: 403 })
        }
        if (!tracking_number || !carrier) {
          return NextResponse.json(
            { error: 'tracking_number and carrier are required for shipped action' },
            { status: 400 }
          )
        }
        break

      case 'delivered':
        if (!isBuyer) {
          return NextResponse.json({ error: 'Only the buyer can confirm delivery' }, { status: 403 })
        }
        break

      case 'released':
        if (!isBuyer) {
          return NextResponse.json({ error: 'Only the buyer can release funds to the seller' }, { status: 403 })
        }
        break

      case 'disputed':
        if (!isBuyer && !isSeller) {
          return NextResponse.json({ error: 'Only a participant can open a dispute' }, { status: 403 })
        }
        if (!reason) {
          return NextResponse.json({ error: 'reason is required to open a dispute' }, { status: 400 })
        }
        break

      case 'refunded':
        if (!isAdmin(callerPiUid)) {
          return NextResponse.json({ error: 'Only an admin can issue a refund' }, { status: 403 })
        }
        break
    }

    // 6. Build the update payload.
    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      status: action,
      updated_at: now,
    }

    if (action === 'shipped') {
      // Store shipping details in the metadata JSONB column.
      const existingMetadata = (typedEscrow.metadata as Record<string, unknown>) ?? {}
      updateData.metadata = {
        ...existingMetadata,
        tracking_number,
        carrier,
        shipped_at: now,
      }
    }

    if (action === 'released') {
      // TODO (Phase 3): Trigger a Pi Network payout to the seller's Pi wallet.
      // This requires calling the Pi Server API to initiate a payment from the
      // platform escrow wallet to `typedEscrow.seller_id`.
    }

    if (action === 'refunded') {
      // TODO (Phase 3): Trigger a Pi Network refund to the buyer's Pi wallet via
      // the Pi Server API before marking the escrow as refunded.
    }

    // 7. Execute the database update.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('escrow_transactions')
      .update(updateData)
      .eq('id', escrow_id)
      .eq('status', typedEscrow.status)
      .select('id, status, updated_at')
      .maybeSingle()

    if (updateError) {
      console.error('[escrow/update-status] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update escrow status' }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Escrow status changed before the update could be applied' },
        { status: 409 }
      )
    }
    // 8. If refunded, restore the product to 'active'.
    if (action === 'refunded') {
      // `product_id` is the Phase 2 canonical column; `listing_id` is kept in
      // sync by a DB trigger for backward compatibility with legacy records.
      const productId = typedEscrow.product_id ?? typedEscrow.listing_id
      if (productId) {
        const { error: productError } = await supabaseAdmin
          .from('listings')
          .update({ status: 'active', updated_at: now })
          .eq('id', productId)

        if (productError) {
          console.error('[escrow/update-status] Product restore error:', productError)
          // Non-fatal: escrow status is updated; log and continue.
        }
      }
    }

    const response: UpdateStatusResponse = {
      success: true,
      escrow_id: updated.id,
      status: updated.status,
      updated_at: updated.updated_at,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('[escrow/update-status] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
