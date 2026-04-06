/**
 * POST /api/escrow/dispute
 *
 * Allows either the buyer or seller to flag a funded or shipped escrow
 * transaction as 'disputed', legally freezing the Pi funds from being
 * released or refunded until the dispute is resolved.
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body).
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS.
 *   - Only participants (buyer/seller) of the escrow can open a dispute.
 *   - Status must be 'funded' or 'shipped' to allow dispute.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// Statuses that allow a dispute to be opened
const DISPUTABLE_STATUSES = ['funded', 'shipped'] as const

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

// ─── Request body ─────────────────────────────────────────────────────────────

interface DisputeRequest {
  escrow_id: string
  dispute_reason: string
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const callerPiUid = auth.pi_uid

    // 2. Parse and validate request body.
    let body: DisputeRequest
    try {
      body = (await req.json()) as DisputeRequest
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { escrow_id, dispute_reason } = body

    if (!escrow_id || typeof escrow_id !== 'string') {
      return NextResponse.json({ error: 'escrow_id is required' }, { status: 400 })
    }

    if (!isValidUuid(escrow_id)) {
      return NextResponse.json({ error: 'escrow_id must be a valid UUID' }, { status: 400 })
    }

    if (!dispute_reason || typeof dispute_reason !== 'string') {
      return NextResponse.json({ error: 'dispute_reason is required' }, { status: 400 })
    }

    if (dispute_reason.length > 2000) {
      return NextResponse.json(
        { error: 'dispute_reason must not exceed 2000 characters' },
        { status: 400 }
      )
    }

    // 3. Fetch the escrow record.
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, buyer_id, seller_id, status, admin_notes')
      .eq('id', escrow_id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow transaction not found' }, { status: 404 })
    }

    // 4. Verify the caller is a participant (buyer or seller).
    const isBuyer = escrow.buyer_id === callerPiUid
    const isSeller = escrow.seller_id === callerPiUid

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: 'Only a buyer or seller involved in this transaction can open a dispute' },
        { status: 403 }
      )
    }

    // 5. Verify the escrow is in a disputable status.
    if (!(DISPUTABLE_STATUSES as readonly string[]).includes(escrow.status)) {
      return NextResponse.json(
        { error: `Cannot dispute an escrow with status '${escrow.status}'. Only funded or shipped transactions can be disputed.` },
        { status: 400 }
      )
    }

    // 6. Build admin_notes — append to any existing notes to preserve history.
    const timestamp = new Date().toISOString()
    const newNote = `[${timestamp}] Dispute opened by ${isBuyer ? 'buyer' : 'seller'} (${callerPiUid}): ${dispute_reason}`

    // Fetch existing admin_notes before updating, so we can append.
    const existingNotes = (escrow as Record<string, unknown>).admin_notes as string | null
    const combinedNotes = existingNotes
      ? `${existingNotes}\n${newNote}`
      : newNote

    // 7. Update the escrow status to 'disputed' with optimistic locking.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'disputed',
        admin_notes: combinedNotes,
      })
      .eq('id', escrow_id)
      .eq('status', escrow.status)
      .select('id, status, updated_at')
      .maybeSingle()

    if (updateError) {
      console.error('[escrow/dispute] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update escrow status' }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Escrow status changed before the dispute could be applied' },
        { status: 409 }
      )
    }

    // 8. Insert notifications for both buyer and seller.
    const disputeMessage = `A dispute has been opened on escrow ${escrow_id}: ${dispute_reason}`

    const notificationRows: Array<{
      user_id: string
      type: string
      reference_id: string
      message: string
    }> = [
      {
        user_id: escrow.buyer_id,
        type: 'dispute',
        reference_id: escrow_id,
        message: disputeMessage,
      },
      {
        user_id: escrow.seller_id,
        type: 'dispute',
        reference_id: escrow_id,
        message: disputeMessage,
      },
    ]

    // 9. Also notify platform admins (if they exist in the users table).
    const adminUids = process.env.ADMIN_PI_UIDS
    if (adminUids) {
      const adminList = adminUids.split(',').map(s => s.trim()).filter(Boolean)

      for (const adminUid of adminList) {
        // Avoid duplicate notifications if admin is already the buyer or seller
        if (adminUid === escrow.buyer_id || adminUid === escrow.seller_id) {
          continue
        }

        notificationRows.push({
          user_id: adminUid,
          type: 'dispute',
          reference_id: escrow_id,
          message: `Admin alert: Dispute opened on escrow ${escrow_id} by ${isBuyer ? 'buyer' : 'seller'} (${callerPiUid}).`,
        })
      }
    }

    // Filter recipients to users that actually exist so one invalid pi_uid
    // does not cause the entire batch insert to fail on the FK constraint.
    const candidateUserIds = [...new Set(notificationRows.map(row => row.user_id))]
    const { data: existingUsers, error: existingUsersError } = await supabaseAdmin
      .from('users')
      .select('pi_uid')
      .in('pi_uid', candidateUserIds)

    if (existingUsersError) {
      // Non-fatal: the dispute was opened successfully; log and continue.
      console.error('[escrow/dispute] Notification recipient lookup error:', existingUsersError)
    } else {
      const existingUserIds = new Set((existingUsers ?? []).map(user => user.pi_uid))
      const validNotificationRows = notificationRows.filter(row => existingUserIds.has(row.user_id))

      if (validNotificationRows.length > 0) {
        // Insert all valid notifications — use supabaseAdmin since notifications
        // table has no client INSERT policy.
        const { error: notifyError } = await supabaseAdmin
          .from('notifications')
          .insert(validNotificationRows)

        if (notifyError) {
          // Non-fatal: the dispute was opened successfully; log and continue.
          console.error('[escrow/dispute] Notification insert error:', notifyError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      escrow_id: updated.id,
      status: updated.status,
      updated_at: updated.updated_at,
    })
  } catch (err) {
    console.error('[escrow/dispute] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
