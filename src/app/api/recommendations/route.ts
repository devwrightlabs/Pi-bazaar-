import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { RecommendationRequestSchema, safeParse } from '@/lib/schemas'
import { scoreListings } from '@/lib/matching'
import type { Listing, RecommendationResponse } from '@/lib/types'

const DB_PREFETCH_LIMIT = 200

const EMPTY_RESPONSE: RecommendationResponse = {
  recommendations: [],
  total_found: 0,
  has_more: false,
  applied_filters: { radius_km: 50, categories: [], price_range: {} },
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.warn('[recommendations] Supabase is not configured — returning empty results')
      return NextResponse.json(EMPTY_RESPONSE, { status: 200 })
    }

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
      origin_country,
    } = parsed.data
    const radius_km: number = parsed.data.radius_km ?? 50
    const preferred_categories: string[] = parsed.data.preferred_categories ?? []
    const limit: number = parsed.data.limit ?? 20
    const offset: number = parsed.data.offset ?? 0

    // Approximate geo bounding box for DB pre-filter
    // 111 km per degree of latitude (and longitude at the equator)
    const KM_PER_DEGREE = 111
    const latDelta = radius_km / KM_PER_DEGREE
    // Fix #5: Clamp cos(latitude) to a minimum epsilon to avoid Infinity/very large deltas near poles
    const cosLat = Math.max(Math.abs(Math.cos((latitude * Math.PI) / 180)), 1e-6)
    const lngDelta = radius_km / (KM_PER_DEGREE * cosLat)
    // Clamp lat/lng bounds to valid ranges to avoid query errors
    const minLat = Math.max(-90, latitude - latDelta)
    const maxLat = Math.min(90, latitude + latDelta)
    const minLng = Math.max(-180, longitude - lngDelta)
    const maxLng = Math.min(180, longitude + lngDelta)

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

    // Jurisdiction filter: when 'local', filter by origin_country
    if (origin_country) {
      query = query.eq('origin_country', origin_country)
    }

    // Fix #6: Add explicit ordering before limit for deterministic and representative prefetch
    query = query
      .order('is_boosted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(DB_PREFETCH_LIMIT)

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

    // Prioritize Pro-Seller listings at the top of the feed (single pass)
    const proListings: typeof scored = []
    const regularListings: typeof scored = []
    for (const listing of scored) {
      if (listing.is_pro_seller) {
        proListings.push(listing)
      } else {
        regularListings.push(listing)
      }
    }
    const prioritized = [...proListings, ...regularListings]

    const recommendations = prioritized.slice(offset, offset + limit)

    const responseBody: RecommendationResponse = {
      recommendations,
      total_found: prioritized.length,
      has_more: offset + recommendations.length < prioritized.length,
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
