/**
 * POST /api/escrow/create
 *
 * Initialises a new escrow transaction for a product purchase.
 *
 * Security:
 *   - Buyer identity is extracted from the verified JWT (never trusted from
 *     the request body).
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS, which
 *     blocks client INSERT/UPDATE on escrow_transactions.
 *   - Product price is read server-side; the client cannot supply an amount.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { SHIPPING_COSTS } from '@/types/escrow'
import type { CreateEscrowRequest, CreateEscrowResponse } from '@/types/escrow'

// Decimal places used when rounding Pi amounts (matches the DB column precision).
const PI_AMOUNT_PRECISION = 7

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate buyer via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const buyerPiUid = auth.pi_uid

    // 2. Parse and validate request body.
    const body = (await req.json()) as CreateEscrowRequest
    const { product_id, shipping_method } = body

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    // 3. Validate the product.
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, seller_id, price_pi, status')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.status !== 'active') {
      return NextResponse.json({ error: 'Product is not available for purchase' }, { status: 400 })
    }

    if (product.seller_id === buyerPiUid) {
      return NextResponse.json({ error: 'You cannot purchase your own product' }, { status: 400 })
    }

    // 4. Calculate total amount — price is always read from DB, never from client.
    const shippingCost =
      shipping_method && shipping_method in SHIPPING_COSTS
        ? SHIPPING_COSTS[shipping_method]
        : 0
    const amountPi = parseFloat((Number(product.price_pi) + shippingCost).toFixed(PI_AMOUNT_PRECISION))

    // 5. Check for duplicate active escrow (same product + same buyer).
    //    An escrow is considered active when its status is not a terminal state.
    const { data: existing } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, status')
      .eq('product_id', product_id)
      .eq('buyer_id', buyerPiUid)
      .in('status', ['pending', 'funded', 'shipped', 'delivered', 'disputed'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'An active escrow already exists for this product' },
        { status: 409 }
      )
    }

    // 6. Insert the escrow record via service-role client.
    const { data: escrow, error: insertError } = await supabaseAdmin
      .from('escrow_transactions')
      .insert({
        product_id,
        buyer_id: buyerPiUid,
        seller_id: product.seller_id,
        amount_pi: amountPi,
        status: 'pending',
        shipping_method: shipping_method ?? null,
      })
      .select('id, amount_pi, seller_id')
      .single()

    if (insertError || !escrow) {
      console.error('[escrow/create] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create escrow' }, { status: 500 })
    }

    const response: CreateEscrowResponse = {
      escrow_id: escrow.id,
      amount_pi: Number(escrow.amount_pi),
      seller_id: escrow.seller_id,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('[escrow/create] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
