/**
 * POST /api/listings/bulk
 *
 * Bulk-creates up to 20 listings for an authenticated seller.
 *
 * Request body:
 *   { listings: Array<ListingInput> }
 *
 * ListingInput:
 *   { title, description, price_pi, category, condition?, images? }
 *
 * Response:
 *   { inserted: number, errors: Array<{ index: number, error: string }> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

const MAX_LISTINGS_PER_REQUEST = 20
const MAX_TITLE_LENGTH = 200
const VALID_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const
type Condition = (typeof VALID_CONDITIONS)[number]

interface ListingInput {
  title: string
  description: string
  price_pi: number
  category: string
  condition?: string
  images?: string[]
}

interface ListingError {
  index: number
  error: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Auth
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { pi_uid } = auth

    // 2. Parse body
    let body: { listings?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!Array.isArray(body.listings)) {
      return NextResponse.json(
        { error: 'Body must contain a "listings" array' },
        { status: 400 },
      )
    }

    if (body.listings.length === 0) {
      return NextResponse.json({ error: 'listings array is empty' }, { status: 400 })
    }

    if (body.listings.length > MAX_LISTINGS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LISTINGS_PER_REQUEST} listings per request` },
        { status: 400 },
      )
    }

    // 3. Validate each listing
    const validRows: Record<string, unknown>[] = []
    const errors: ListingError[] = []

    for (let i = 0; i < body.listings.length; i++) {
      const item = body.listings[i] as Partial<ListingInput>

      if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
        errors.push({ index: i, error: 'title is required' })
        continue
      }
      if (item.title.length > MAX_TITLE_LENGTH) {
        errors.push({ index: i, error: `title exceeds ${MAX_TITLE_LENGTH} characters` })
        continue
      }
      if (typeof item.price_pi !== 'number' || item.price_pi <= 0) {
        errors.push({ index: i, error: 'price_pi must be a positive number' })
        continue
      }
      if (!item.category || typeof item.category !== 'string' || item.category.trim() === '') {
        errors.push({ index: i, error: 'category is required' })
        continue
      }
      if (
        item.condition !== undefined &&
        !VALID_CONDITIONS.includes(item.condition as Condition)
      ) {
        errors.push({
          index: i,
          error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}`,
        })
        continue
      }

      validRows.push({
        seller_id: pi_uid,
        title: item.title.trim(),
        description: typeof item.description === 'string' ? item.description.trim() : '',
        price_pi: item.price_pi,
        category: item.category.trim(),
        condition: item.condition ?? 'good',
        images: Array.isArray(item.images) ? item.images : [],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // 4. Batch insert valid rows
    let inserted = 0
    if (validRows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('listings')
        .insert(validRows)

      if (insertError) {
        console.error('[POST /api/listings/bulk] DB error:', insertError)
        return NextResponse.json({ error: 'Failed to insert listings' }, { status: 500 })
      }
      inserted = validRows.length
    }

    return NextResponse.json({ inserted, errors }, { status: errors.length > 0 && inserted === 0 ? 400 : 200 })
  } catch (err) {
    console.error('[POST /api/listings/bulk] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
