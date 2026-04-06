/**
 * GET    /api/users/privacy — Data export (GDPR / compliance)
 * DELETE /api/users/privacy — Account deletion
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body or query params).
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS;
 *     the caller's pi_uid is enforced explicitly in every query predicate.
 *   - Account deletion verifies there are no active/pending escrow transactions
 *     before proceeding.
 *   - Deletion triggers the database-level anonymization function
 *     (anonymize_user_financial_records) to preserve financial records.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// Escrow statuses that indicate an active/in-progress transaction.
// Users cannot delete their account while any of these exist.
const ACTIVE_ESCROW_STATUSES = [
  'pending',
  'pending_payment',
  'payment_received',
  'funded',
  'shipped',
  'delivered',
  'disputed',
] as const

// ─── GET /api/users/privacy (Data Export) ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate caller via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // 2. Fetch the user's profile.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('pi_uid', piUid)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 3. Fetch related data in parallel for efficiency.
    const [productsResult, reviewsGivenResult, reviewsReceivedResult, messagesResult, notificationsResult] =
      await Promise.all([
        // Products listed by this user
        supabaseAdmin
          .from('products')
          .select('*')
          .eq('seller_id', piUid)
          .order('created_at', { ascending: false }),

        // Reviews written by this user
        supabaseAdmin
          .from('reviews')
          .select('*')
          .eq('reviewer_id', piUid)
          .order('created_at', { ascending: false }),

        // Reviews received by this user
        supabaseAdmin
          .from('reviews')
          .select('*')
          .eq('reviewee_id', piUid)
          .order('created_at', { ascending: false }),

        // Messages sent or received
        supabaseAdmin
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${piUid},receiver_id.eq.${piUid}`)
          .order('created_at', { ascending: false }),

        // Notifications
        supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('user_id', piUid)
          .order('created_at', { ascending: false }),
      ])

    // 4. Compile the export payload.
    const exportData = {
      exported_at: new Date().toISOString(),
      profile,
      products: productsResult.data ?? [],
      reviews_given: reviewsGivenResult.data ?? [],
      reviews_received: reviewsReceivedResult.data ?? [],
      messages: messagesResult.data ?? [],
      notifications: notificationsResult.data ?? [],
    }

    return NextResponse.json(exportData)
  } catch (err) {
    console.error('[users/privacy/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/users/privacy (Account Deletion) ─────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    // 1. Authenticate caller via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // 2. Verify the user exists.
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, pi_uid')
      .eq('pi_uid', piUid)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 3. Check for active/pending escrow transactions (as buyer or seller).
    const { data: activeEscrows, error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, status')
      .or(`buyer_id.eq.${piUid},seller_id.eq.${piUid}`)
      .in('status', [...ACTIVE_ESCROW_STATUSES])
      .limit(1)

    if (escrowError) {
      console.error('[users/privacy/DELETE] Escrow check error:', escrowError)
      return NextResponse.json({ error: 'Failed to verify account status' }, { status: 500 })
    }

    if (activeEscrows && activeEscrows.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete account while you have active or pending escrow transactions. Please resolve all transactions first.',
        },
        { status: 409 }
      )
    }

    // 4. Delete the user record.
    //    The BEFORE DELETE trigger (anonymize_user_financial_records) will
    //    anonymize escrow_transactions, messages, and reviews.
    //    ON DELETE CASCADE on products and notifications will remove those rows.
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('pi_uid', piUid)

    if (deleteError) {
      console.error('[users/privacy/DELETE] User deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Your account and personal data have been deleted. Financial transaction records have been anonymized for platform accounting purposes.',
    })
  } catch (err) {
    console.error('[users/privacy/DELETE] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
