/**
 * GET    /api/users/privacy — Data Export: returns the caller's non-sensitive data
 * DELETE /api/users/privacy — Account Deletion: removes the caller's account
 *
 * Security:
 *   - Caller identity is extracted from the verified custom JWT.
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS;
 *     the caller's pi_uid is enforced explicitly in every query predicate.
 *
 * Privacy compliance:
 *   - GET fulfils data export / portability requests (e.g. GDPR Art. 20).
 *   - DELETE fulfils right-to-erasure requests (e.g. GDPR Art. 17). The
 *     database trigger (10_audit_privacy.sql) anonymises escrow records so
 *     financial history is retained without personal data linkage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// Escrow statuses considered active (user cannot delete while these exist).
const ACTIVE_ESCROW_STATUSES = [
  'pending',
  'pending_payment',
  'payment_received',
  'funded',
  'shipped',
  'delivered',
  'disputed',
]

// ─── GET /api/users/privacy (Data Export) ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // Fetch the user's data concurrently for performance.
    const [profileResult, addressesResult, settingsResult] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('pi_uid, pi_username, created_at, updated_at')
        .eq('pi_uid', piUid)
        .single(),

      supabaseAdmin
        .from('saved_addresses')
        .select('id, full_name, street_address, city, state_province, postal_code, country_code, phone_number, is_default, created_at')
        .eq('user_id', piUid)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('user_settings')
        .select('preferred_currency, email_notifications, created_at, updated_at')
        .eq('user_id', piUid)
        .maybeSingle(),
    ])

    if (profileResult.error || !profileResult.data) {
      console.error('[users/privacy/GET] Profile fetch error:', profileResult.error)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (addressesResult.error) {
      console.error('[users/privacy/GET] Addresses fetch error:', addressesResult.error)
      return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }

    if (settingsResult.error) {
      console.error('[users/privacy/GET] Settings fetch error:', settingsResult.error)
      return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }

    return NextResponse.json({
      profile: profileResult.data,
      addresses: addressesResult.data ?? [],
      settings: settingsResult.data ?? null,
    })
  } catch (err) {
    console.error('[users/privacy/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/users/privacy (Account Deletion) ─────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // 1. Verify the user exists.
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('pi_uid')
      .eq('pi_uid', piUid)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Block deletion if the user has active/pending escrow transactions
    //    (as buyer or seller).
    const { data: activeEscrow, error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id')
      .or(`buyer_id.eq.${piUid},seller_id.eq.${piUid}`)
      .in('status', ACTIVE_ESCROW_STATUSES)
      .limit(1)

    if (escrowError) {
      console.error('[users/privacy/DELETE] Escrow check error:', escrowError)
      return NextResponse.json({ error: 'Failed to verify account status' }, { status: 500 })
    }

    if (activeEscrow && activeEscrow.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account while active or pending escrow transactions exist. Please resolve them first.' },
        { status: 409 }
      )
    }

    // 3. Delete the user record. The database trigger
    //    (anonymise_escrow_before_user_delete) will anonymise any remaining
    //    escrow records, and ON DELETE CASCADE on related tables (products,
    //    saved_addresses, user_settings, kyc_records) will clean up the rest.
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('pi_uid', piUid)

    if (deleteError) {
      console.error('[users/privacy/DELETE] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Account deleted successfully' })
  } catch (err) {
    console.error('[users/privacy/DELETE] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
