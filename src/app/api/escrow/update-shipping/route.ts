/**
 * POST /api/escrow/update-shipping
 *
 * Allows the seller to manually add carrier tracking info to a funded escrow
 * and transition its status to 'shipped'.
 *
 * Flow:
 *   1. Authenticate seller via custom JWT.
 *   2. Validate request body (escrow_id, carrier_name, tracking_number required).
 *   3. Fetch escrow record and verify the caller is the seller.
 *   4. Verify escrow status is 'funded' (only funded escrows can be shipped).
 *   5. Update escrow with carrier info and set status to 'shipped' (optimistic lock).
 *   6. Return the updated escrow record.
 *
 * Security:
 *   - User identity is extracted from the verified JWT, never from the request body.
 *   - Optimistic locking (.eq('status', 'funded')) prevents race conditions.
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the seller.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request body.
    let body: {
      escrow_id?: unknown
      carrier_name?: unknown
      tracking_number?: unknown
      tracking_url?: unknown
    }

    try {
      body = (await req.json()) as {
        escrow_id?: unknown
        carrier_name?: unknown
        tracking_number?: unknown
        tracking_url?: unknown
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    }
    const { escrow_id, carrier_name, tracking_number, tracking_url } = body

    if (!escrow_id || typeof escrow_id !== 'string' || escrow_id.trim() === '') {
      return NextResponse.json({ error: 'escrow_id is required' }, { status: 400 })
    }
    if (!carrier_name || typeof carrier_name !== 'string' || carrier_name.trim() === '') {
      return NextResponse.json({ error: 'carrier_name is required' }, { status: 400 })
    }
    if (!tracking_number || typeof tracking_number !== 'string' || tracking_number.trim() === '') {
      return NextResponse.json({ error: 'tracking_number is required' }, { status: 400 })
    }
    let safeTrackingUrl: string | null = null
    if (tracking_url !== undefined && tracking_url !== null) {
      if (typeof tracking_url !== 'string' || tracking_url.trim() === '') {
        return NextResponse.json({ error: 'tracking_url must be a non-empty string if provided' }, { status: 400 })
      }
      try {
        const parsed = new URL(tracking_url.trim())
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return NextResponse.json({ error: 'tracking_url must be a valid http or https URL' }, { status: 400 })
        }
        safeTrackingUrl = parsed.toString()
      } catch {
        return NextResponse.json({ error: 'tracking_url must be a valid URL' }, { status: 400 })
      }
    }

    // 3. Fetch the escrow record.
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, seller_id, buyer_id, status')
      .eq('id', escrow_id.trim())
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    // 4. Verify the authenticated user is the seller.
    if (escrow.seller_id !== auth.pi_uid) {
      console.warn(
        `[escrow/update-shipping] Forbidden: caller=${auth.pi_uid}, escrow_seller=${escrow.seller_id}`
      )
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 5. Verify escrow is in 'funded' status.
    if (escrow.status !== 'funded') {
      return NextResponse.json(
        { error: `Escrow must be in 'funded' status to add shipping info (current: '${escrow.status}')` },
        { status: 409 }
      )
    }

    // 6. Update the escrow with carrier info and transition to 'shipped'.
    //    Optimistic lock: .eq('status', 'funded') prevents race conditions.
    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        carrier_name: carrier_name.trim(),
        tracking_number: tracking_number.trim(),
        tracking_url: safeTrackingUrl,
        status: 'shipped',
        updated_at: now,
      })
      .eq('id', escrow_id.trim())
      .eq('status', 'funded')
      .select('id, seller_id, buyer_id, status, carrier_name, tracking_number, tracking_url, updated_at')
      .maybeSingle()

    if (updateError) {
      console.error('[escrow/update-shipping] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update escrow shipping info' }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Escrow status changed before the update could be applied' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, escrow: updated }, { status: 200 })
  } catch (err) {
    console.error('[escrow/update-shipping] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
