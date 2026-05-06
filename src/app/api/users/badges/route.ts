/**
 * GET /api/users/badges?seller_id=xxx
 *
 * Public endpoint — returns a seller's badge level based on completed sales.
 *
 * Badge levels:
 *   none     — 0 completed sales
 *   bronze   — 1–9 completed sales
 *   silver   — 10–49 completed sales
 *   gold     — 50–99 completed sales
 *   platinum — 100+ completed sales
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type BadgeLevel = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'

function computeBadge(totalSales: number): BadgeLevel {
  if (totalSales >= 100) return 'platinum'
  if (totalSales >= 50) return 'gold'
  if (totalSales >= 10) return 'silver'
  if (totalSales >= 1) return 'bronze'
  return 'none'
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl
    const sellerId = searchParams.get('seller_id')?.trim()

    if (!sellerId) {
      return NextResponse.json({ error: 'seller_id is required' }, { status: 400 })
    }

    // Count completed sales for this seller
    const { count: salesCount, error: salesError } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'completed')

    if (salesError) {
      console.error('[GET /api/users/badges] Sales query error:', salesError)
      return NextResponse.json({ error: 'Failed to fetch seller data' }, { status: 500 })
    }

    // Count active listings for this seller
    const { count: listingCount, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .is('deleted_at', null)

    if (listingError) {
      console.error('[GET /api/users/badges] Listings query error:', listingError)
      return NextResponse.json({ error: 'Failed to fetch listing data' }, { status: 500 })
    }

    const totalSales = salesCount ?? 0
    const badge = computeBadge(totalSales)

    return NextResponse.json(
      {
        badge,
        total_sales: totalSales,
        positive_feedback: totalSales, // placeholder: use total_sales for now
        response_rate: 100,            // hardcoded for now
        listing_count: listingCount ?? 0,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.error('[GET /api/users/badges] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
