/**
 * GET /api/listings/trending-tags — Return the top 10 listing categories by count.
 *
 * Public endpoint, no authentication required.
 * Response is cached for 5 minutes (Cache-Control: public, max-age=300).
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic' // opt out of static generation; cache via headers only

export async function GET() {
  try {
    // Fetch the category column of all active, non-deleted listings.
    // We pull only the 'category' column to minimise payload.
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('category')
      .eq('status', 'active')
      .eq('is_deleted', false)

    if (error) {
      console.error('[listings/trending-tags/GET] DB error:', error)
      return NextResponse.json({ error: 'Failed to fetch trending tags' }, { status: 500 })
    }

    // Count listings per category.
    const counts = new Map<string, number>()
    for (const row of data ?? []) {
      const cat = (row.category as string | null)?.trim()
      if (!cat) continue
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }

    // Sort by count descending and take the top 10.
    const tags = Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json(
      { tags },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300',
        },
      }
    )
  } catch (err) {
    console.error('[listings/trending-tags/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
