import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { EscrowTransaction, EscrowTimelineEvent } from '@/lib/types'

const ESCROW_FEE_RATE = 0.025

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      listing_id: string
      buyer_id: string
      seller_id: string
      amount_pi: number
      product_type: 'physical' | 'digital'
      pi_payment_id: string
      shipping_address_id?: string
    }

    const { listing_id, buyer_id, seller_id, amount_pi, product_type, pi_payment_id } = body

    if (!listing_id || !buyer_id || !seller_id || !amount_pi || !product_type || !pi_payment_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const escrow_fee_pi = parseFloat((amount_pi * ESCROW_FEE_RATE).toFixed(6))
    const net_amount_pi = parseFloat((amount_pi - escrow_fee_pi).toFixed(6))
    const autoReleaseDays = product_type === 'digital' ? 3 : 14
    const auto_release_at = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        listing_id,
        buyer_id,
        seller_id,
        amount_pi,
        escrow_fee_pi,
        net_amount_pi,
        status: 'payment_received',
        product_type,
        pi_payment_id,
        tracking_number: null,
        shipping_carrier: null,
        delivery_proof: null,
        buyer_confirmed_at: null,
        seller_shipped_at: null,
        auto_release_at,
        dispute_reason: null,
      })
      .select()
      .single()

    if (escrowError || !escrow) {
      console.error('Escrow insert error:', escrowError)
      return NextResponse.json({ error: 'Failed to create escrow' }, { status: 500 })
    }

    const typedEscrow = escrow as EscrowTransaction

    await supabase.from('escrow_timeline').insert({
      escrow_id: typedEscrow.id,
      event: 'payment_received',
      description: `Buyer paid ${amount_pi} \u03c0. Funds held in escrow.`,
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)

    return NextResponse.json(typedEscrow, { status: 201 })
  } catch (err) {
    console.error('POST /api/escrow/create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
