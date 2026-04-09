import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
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

    // 2. Fetch the escrow and verify the caller is the buyer.
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    if (escrow.buyer_id !== callerPiUid) {
      return NextResponse.json({ error: 'Only the buyer can confirm receipt' }, { status: 403 })
    }

    // 3. Update the escrow status to completed.
    const { error } = await supabaseAdmin
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

    await supabaseAdmin.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'completed',
      description: 'Buyer confirmed receipt. Pi released to seller.',
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
