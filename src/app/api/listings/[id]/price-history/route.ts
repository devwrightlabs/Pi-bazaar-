/**
 * GET /api/listings/[id]/price-history
 *
 * Public endpoint — returns completed-order price history for a listing,
 * ordered oldest-to-newest.
 *
 * Response: { history: Array<{ price: number, date: string }> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const listingId = id?.trim()

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, offer_price, created_at')
      .eq('listing_id', listingId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/listings/[id]/price-history] DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 })
    }

    const history = (data ?? []).map((row) => ({
      price: row.offer_price as number,
      date: row.created_at as string,
    }))

    return NextResponse.json({ history })
  } catch (err) {
    console.error('[GET /api/listings/[id]/price-history] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
