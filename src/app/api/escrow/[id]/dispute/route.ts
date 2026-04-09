import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { EscrowTimelineEvent } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = (await req.json()) as {
      reason: string
      description: string
      evidence_urls?: string[]
    }

    if (!body.reason || !body.description) {
      return NextResponse.json({ error: 'reason and description are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'disputed',
        dispute_reason: body.reason,
      })
      .eq('id', id)

    if (error) {
      console.error('Dispute update error:', error)
      return NextResponse.json({ error: 'Failed to open dispute' }, { status: 500 })
    }

    const evidenceSummary = body.evidence_urls?.length
      ? ` Evidence: ${body.evidence_urls.join(', ')}`
      : ''

    const { error: timelineError } = await supabase.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'disputed',
      description: `Dispute opened: ${body.reason}. ${body.description}${evidenceSummary}`,
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)
    if (timelineError) {
      console.error('Timeline insert error (non-fatal):', timelineError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/dispute error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
