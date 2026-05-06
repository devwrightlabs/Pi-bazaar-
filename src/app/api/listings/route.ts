/**
 * POST /api/listings — Create a new listing (authenticated sellers only)
 *
 * Supports optional scheduled_at field (ISO timestamp).
 * If scheduled_at is provided and in the future, the listing is stored with
 * status='scheduled' until the cron job activates it.
 *
 * SECURITY:
 *   - Requires a valid custom JWT in the Authorization header.
 *   - seller_id is always taken from the verified JWT, never from the body.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { rateLimit } from '@/lib/rateLimit'

const listingsPostRateLimit = rateLimit({ windowMs: 60_000, max: 20 })

const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const VALID_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting: 20 req / 60s per IP
    const rl = listingsPostRateLimit(req)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      )
    }

    // 1. Authenticate the seller
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { pi_uid } = auth

    // 2. Parse request body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 3. Validate inputs
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `title must be ${MAX_TITLE_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    const price_pi = body.price_pi ?? body.price_in_pi
    if (typeof price_pi !== 'number' || !isFinite(price_pi) || price_pi <= 0) {
      return NextResponse.json(
        { error: 'price_pi is required and must be a positive number' },
        { status: 400 }
      )
    }

    const description = typeof body.description === 'string' ? body.description.trim() : null
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    const category = typeof body.category === 'string' ? body.category.trim() : null
    const condition = (body.condition as string) ?? 'good'
    if (!VALID_CONDITIONS.includes(condition as typeof VALID_CONDITIONS[number])) {
      return NextResponse.json(
        { error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` },
        { status: 400 }
      )
    }

    const images = Array.isArray(body.images) ? (body.images as string[]) : []

    // 4. Handle scheduled_at
    const rawScheduledAt = body.scheduled_at
    let scheduledAt: string | null = null
    let status: 'active' | 'scheduled' = 'active'

    if (rawScheduledAt && typeof rawScheduledAt === 'string') {
      const scheduledDate = new Date(rawScheduledAt)
      if (!isNaN(scheduledDate.getTime()) && scheduledDate > new Date()) {
        scheduledAt = scheduledDate.toISOString()
        status = 'scheduled'
      }
    }

    // 5. Insert the listing
    const insertData: Record<string, unknown> = {
      seller_id: pi_uid,
      title,
      description,
      price_in_pi: price_pi,
      category,
      condition,
      images: images.length > 0 ? images : null,
      status,
      city: (body.city as string | undefined)?.trim() ?? '',
      country: (body.country as string | undefined)?.trim() ?? '',
      location_lat: 0,
      location_lng: 0,
      is_boosted: false,
    }

    if (scheduledAt) {
      insertData.scheduled_at = scheduledAt
    }

    const { data: listing, error: insertError } = await supabaseAdmin
      .from('listings')
      .insert(insertData)
      .select()
      .single()

    if (insertError || !listing) {
      console.error('[POST /api/listings] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
    }

    // 6. Return response (include scheduling metadata when applicable)
    const response: Record<string, unknown> = { listing }
    if (status === 'scheduled' && scheduledAt) {
      response.scheduled = true
      response.scheduled_at = scheduledAt
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('[POST /api/listings] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
