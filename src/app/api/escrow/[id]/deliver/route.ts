import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { EscrowTimelineEvent } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = (await req.json()) as { delivery_proof: string }

    if (!body.delivery_proof) {
      return NextResponse.json({ error: 'delivery_proof is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'delivered',
        delivery_proof: body.delivery_proof,
      })
      .eq('id', id)

    if (error) {
      console.error('Deliver update error:', error)
      return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 })
    }

    const { error: timelineError } = await supabase.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'delivered',
      description: 'Seller delivered digital content.',
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)
    if (timelineError) {
      console.error('Timeline insert error (non-fatal):', timelineError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/deliver error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
