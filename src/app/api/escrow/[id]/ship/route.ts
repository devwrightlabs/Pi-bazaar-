import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { stripHtml } from '@/lib/sanitize'
import type { EscrowTimelineEvent } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    // 1. Authenticate the caller.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const callerPiUid = auth.pi_uid

    const { id } = await params
    const body = (await req.json()) as { tracking_number: string; shipping_carrier: string }

    if (!body.tracking_number || typeof body.tracking_number !== 'string') {
      return NextResponse.json({ error: 'tracking_number is required' }, { status: 400 })
    }
    if (!body.shipping_carrier || typeof body.shipping_carrier !== 'string') {
      return NextResponse.json({ error: 'shipping_carrier is required' }, { status: 400 })
    }

    const trackingNumber = stripHtml(body.tracking_number.trim())
    const shippingCarrier = stripHtml(body.shipping_carrier.trim())

    if (!trackingNumber) {
      return NextResponse.json({ error: 'tracking_number must not be empty' }, { status: 400 })
    }
    if (!shippingCarrier) {
      return NextResponse.json({ error: 'shipping_carrier must not be empty' }, { status: 400 })
    }
    if (trackingNumber.length > 200) {
      return NextResponse.json({ error: 'tracking_number must not exceed 200 characters' }, { status: 400 })
    }
    if (shippingCarrier.length > 100) {
      return NextResponse.json({ error: 'shipping_carrier must not exceed 100 characters' }, { status: 400 })
    }

    // 2. Fetch the escrow and verify the caller is the seller.
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    if (escrow.seller_id !== callerPiUid) {
      return NextResponse.json({ error: 'Only the seller can mark shipment' }, { status: 403 })
    }

    // 3. Update the escrow status.
    const { error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'shipped',
        tracking_number: trackingNumber,
        shipping_carrier: shippingCarrier,
        seller_shipped_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Ship update error:', error)
      return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 })
    }

    await supabaseAdmin.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'shipped',
      description: `Item shipped via ${shippingCarrier}. Tracking: ${trackingNumber}`,
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/ship error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
