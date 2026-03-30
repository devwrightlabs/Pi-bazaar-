import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { EscrowTimelineEvent } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = (await req.json()) as { tracking_number: string; shipping_carrier: string }

    if (!body.tracking_number || !body.shipping_carrier) {
      return NextResponse.json({ error: 'tracking_number and shipping_carrier are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'shipped',
        tracking_number: body.tracking_number,
        shipping_carrier: body.shipping_carrier,
        seller_shipped_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Ship update error:', error)
      return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 })
    }

    await supabase.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'shipped',
      description: `Item shipped via ${body.shipping_carrier}. Tracking: ${body.tracking_number}`,
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/ship error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
