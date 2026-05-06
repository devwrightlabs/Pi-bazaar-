import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/authHelper'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ─── PATCH /api/offers/[id] — Accept or decline an offer ─────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAuthToken(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body

  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be "accept" or "decline"' }, { status: 400 })
  }

  // Fetch the order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'offer_pending') {
    return NextResponse.json({ error: 'Offer is no longer pending' }, { status: 400 })
  }

  // Fetch the listing to verify caller is the seller
  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', order.listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.seller_id !== auth.pi_uid) {
    return NextResponse.json({ error: 'Only the seller can accept or decline offers' }, { status: 403 })
  }

  const newStatus = action === 'accept' ? 'offer_accepted' : 'offer_declined'

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[/api/offers/[id] PATCH] Update error:', updateError)
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
  }

  return NextResponse.json(updatedOrder)
}
