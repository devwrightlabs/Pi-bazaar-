import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { EscrowTimelineEvent } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const { data: escrow, error: fetchError } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'completed',
        buyer_confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Confirm update error:', error)
      return NextResponse.json({ error: 'Failed to confirm receipt' }, { status: 500 })
    }

    const { error: timelineError } = await supabase.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'completed',
      description: 'Buyer confirmed receipt. Pi released to seller.',
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)
    if (timelineError) {
      console.error('Timeline insert error (non-fatal):', timelineError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
