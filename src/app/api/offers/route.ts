import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/authHelper'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ─── POST /api/offers — Create an offer ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = verifyAuthToken(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { listing_id?: string; offer_amount?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { listing_id, offer_amount } = body

  if (!listing_id || typeof listing_id !== 'string') {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
  }
  if (typeof offer_amount !== 'number' || offer_amount <= 0) {
    return NextResponse.json({ error: 'offer_amount must be a positive number' }, { status: 400 })
  }

  // Fetch the listing
  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing is not active' }, { status: 400 })
  }

  if (listing.seller_id === auth.pi_uid) {
    return NextResponse.json({ error: 'You cannot make an offer on your own listing' }, { status: 400 })
  }

  // Insert the offer into orders
  const { data: order, error: insertError } = await supabaseAdmin
    .from('orders')
    .insert({
      listing_id,
      buyer_id: auth.pi_uid,
      offer_price: offer_amount,
      status: 'offer_pending',
      payment_confirmed: false,
      escrow_released: false,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[/api/offers POST] Insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 })
  }

  return NextResponse.json(order, { status: 201 })
}

// ─── GET /api/offers — List buyer's pending offers ───────────────────────────

export async function GET(request: NextRequest) {
  const auth = verifyAuthToken(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('buyer_id', auth.pi_uid)
    .eq('status', 'offer_pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[/api/offers GET] Query error:', error)
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
  }

  return NextResponse.json(orders ?? [])
}
