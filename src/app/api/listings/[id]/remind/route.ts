/**
 * POST /api/listings/[id]/remind
 *
 * Allows an authenticated buyer to set a "remind me" for a listing
 * that is currently out of stock or unavailable. When the listing
 * becomes active, the cron job /api/cron/send-reminders will notify them.
 *
 * Security: Requires a valid custom JWT in the Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate caller
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { pi_uid } = auth

    // 2. Resolve route param
    const { id: listingId } = await params

    // 3. Verify the listing exists
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, status')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // 4. Upsert reminder — ignore duplicates gracefully
    const { error: insertError } = await supabaseAdmin
      .from('listing_reminders')
      .upsert(
        {
          listing_id: listingId,
          user_pi_uid: pi_uid,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'listing_id,user_pi_uid' }
      )

    if (insertError) {
      console.error('[listings/remind/POST] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to set reminder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'You will be reminded when this listing is available',
    })
  } catch (err) {
    console.error('[listings/remind/POST] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
