import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { EscrowTransaction, EscrowTimelineEvent } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    const { data: timeline } = await supabase
      .from('escrow_timeline')
      .select('*')
      .eq('escrow_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      ...(escrow as EscrowTransaction),
      timeline: (timeline ?? []) as EscrowTimelineEvent[],
    })
  } catch (err) {
    console.error('GET /api/escrow/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
