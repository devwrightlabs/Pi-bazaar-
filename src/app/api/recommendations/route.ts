import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { RecommendationRequestSchema, safeParse } from '@/lib/schemas'
import { scoreListings } from '@/lib/matching'
import type { Listing, RecommendationResponse } from '@/lib/types'

const DB_PREFETCH_LIMIT = 200

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const parsed = safeParse(RecommendationRequestSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const {
      latitude,
      longitude,
      price_min,
      price_max,
    } = parsed.data
    const radius_km: number = parsed.data.radius_km ?? 50
    const preferred_categories: string[] = parsed.data.preferred_categories ?? []
    const limit: number = parsed.data.limit ?? 20

    // Approximate geo bounding box for DB pre-filter
    // 111 km is the approximate number of kilometers per degree of latitude (and longitude at the equator)
    const latDelta = radius_km / 111
    const lngDelta = radius_km / (111 * Math.cos((latitude * Math.PI) / 180))
    const minLat = latitude - latDelta
    const maxLat = latitude + latDelta
    const minLng = longitude - lngDelta
    const maxLng = longitude + lngDelta

    let query = supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .gte('location_lat', minLat)
      .lte('location_lat', maxLat)
      .gte('location_lng', minLng)
      .lte('location_lng', maxLng)

    if (price_min !== undefined) {
      query = query.gte('price_pi', price_min)
    }
    if (price_max !== undefined) {
      query = query.lte('price_pi', price_max)
    }

    query = query.limit(DB_PREFETCH_LIMIT)

    const { data, error } = await query

    if (error) {
      console.error('POST /api/recommendations supabase error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const listings = (data ?? []) as Listing[]

    const scored = scoreListings(
      listings,
      latitude,
      longitude,
      radius_km,
      preferred_categories,
      price_min,
      price_max,
    )

    const recommendations = scored.slice(0, limit)

    const responseBody: RecommendationResponse = {
      recommendations,
      total_found: scored.length,
      applied_filters: {
        radius_km,
        categories: preferred_categories,
        price_range: { min: price_min, max: price_max },
      },
    }

    return NextResponse.json(responseBody, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (err) {
    console.error('POST /api/recommendations unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 })
}
