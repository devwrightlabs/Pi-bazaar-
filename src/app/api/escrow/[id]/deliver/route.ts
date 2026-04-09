import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { sanitizeText } from '@/lib/sanitize'
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
    const body = (await req.json()) as { delivery_proof: string }

    if (!body.delivery_proof || typeof body.delivery_proof !== 'string') {
      return NextResponse.json({ error: 'delivery_proof is required' }, { status: 400 })
    }

    const deliveryProof = sanitizeText(body.delivery_proof)
    if (!deliveryProof) {
      return NextResponse.json({ error: 'delivery_proof must not be empty' }, { status: 400 })
    }

    if (deliveryProof.length > 5000) {
      return NextResponse.json({ error: 'delivery_proof must not exceed 5000 characters' }, { status: 400 })
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
      return NextResponse.json({ error: 'Only the seller can mark delivery' }, { status: 403 })
    }

    // 3. Update the escrow status.
    const { error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'delivered',
        delivery_proof: deliveryProof,
      })
      .eq('id', id)

    if (error) {
      console.error('Deliver update error:', error)
      return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 })
    }

    await supabaseAdmin.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'delivered',
      description: 'Seller delivered digital content.',
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/deliver error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
