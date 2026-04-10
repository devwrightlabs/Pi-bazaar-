/**
 * GET  /api/products — Search and list active product listings (public)
 * POST /api/products — Create a new product listing (authenticated sellers only)
 *
 * SECURITY:
 *   - POST requires a valid custom JWT in the Authorization header.
 *   - The seller_id is ALWAYS taken from the verified JWT — never from the
 *     request body — so a buyer cannot impersonate another seller.
 *   - GET is public; only 'active' products are returned to prevent data leaks.
 *   - All string inputs are trimmed and length-checked server-side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { MAX_IMAGES_PER_PRODUCT } from '@/lib/storage'
import type { Product, CreateProductRequest, PaginatedProductsResponse } from '@/types/product'

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const
const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 50

/**
 * Escapes special ilike pattern characters (`%`, `_`, `\`) in a search term
 * so that user input is treated as a literal string rather than a wildcard.
 */
function escapeIlike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

// ─── POST — Create product ────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate the seller — identity comes from the JWT, never the body.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { pi_uid } = auth

    // 2. Parse request body.
    let body: CreateProductRequest
    try {
      body = (await req.json()) as CreateProductRequest
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 3. Validate and sanitize inputs.
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

    const price_in_pi = body.price_in_pi
    if (typeof price_in_pi !== 'number' || !isFinite(price_in_pi) || price_in_pi <= 0) {
      return NextResponse.json(
        { error: 'price_in_pi is required and must be a positive number' },
        { status: 400 }
      )
    }

    const description = body.description?.trim() ?? null
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` },
        { status: 400 }
      )
    }

    const condition = body.condition ?? 'good'
    if (!VALID_CONDITIONS.includes(condition as typeof VALID_CONDITIONS[number])) {
      return NextResponse.json(
        { error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` },
        { status: 400 }
      )
    }

    const images = body.images ?? []
    if (!Array.isArray(images)) {
      return NextResponse.json({ error: 'images must be an array' }, { status: 400 })
    }
    if (images.length > MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json(
        { error: `A maximum of ${MAX_IMAGES_PER_PRODUCT} images per product is allowed` },
        { status: 400 }
      )
    }

    const category = body.category?.trim() ?? null
    const location_text = body.location_text?.trim() ?? null

    // 4. Insert the product using the admin client (bypasses RLS, seller_id from JWT).
    const { data: product, error: insertError } = await supabaseAdmin
      .from('products')
      .insert({
        seller_id: pi_uid,
        title,
        description,
        price_in_pi,
        category,
        condition,
        images: images.length > 0 ? images : null,
        status: 'active',
        location_text,
      })
      .select('id, seller_id, title, description, price_in_pi, category, condition, images, status, location_text, deleted_at, created_at, updated_at')
      .single()

    if (insertError || !product) {
      console.error('[POST /api/products] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    return NextResponse.json({ product: product as Product }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/products] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET — Search / list products ────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl

    // Parse and validate pagination parameters.
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10)
    const page = isFinite(rawPage) && rawPage > 0 ? rawPage : 1

    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_LIMIT), 10)
    const limit = isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT

    const offset = (page - 1) * limit

    // Parse filter parameters.
    const category = searchParams.get('category') ?? ''
    const search = (searchParams.get('search') ?? searchParams.get('q') ?? '').trim()
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    const condition = searchParams.get('condition') ?? ''
    const sellerId = searchParams.get('seller_id') ?? ''
    const sort = (searchParams.get('sort') ?? 'newest') as
      | 'newest'
      | 'oldest'
      | 'price_asc'
      | 'price_desc'

    // Build query — always filter to active products only.
    let query = supabaseAdmin
      .from('products')
      .select(
        'id, seller_id, title, description, price_in_pi, category, condition, images, status, location_text, deleted_at, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('status', 'active')
      .is('deleted_at', null)

    if (category) {
      query = query.eq('category', category)
    }

    if (condition && VALID_CONDITIONS.includes(condition as typeof VALID_CONDITIONS[number])) {
      query = query.eq('condition', condition)
    }

    if (sellerId) {
      query = query.eq('seller_id', sellerId)
    }

    if (minPrice !== null) {
      const min = parseFloat(minPrice)
      if (isFinite(min) && min >= 0) {
        query = query.gte('price_in_pi', min)
      }
    }

    if (maxPrice !== null) {
      const max = parseFloat(maxPrice)
      if (isFinite(max) && max >= 0) {
        query = query.lte('price_in_pi', max)
      }
    }

    if (search) {
      // Reject PostgREST filter-string reserved characters before interpolating
      // user input into `.or(...)`, then escape ilike wildcard characters so
      // the remaining input is treated literally in the pattern match.
      if (/[(),]/.test(search)) {
        return NextResponse.json(
          { error: 'Search contains invalid characters' },
          { status: 400 }
        )
      }
      const escaped = escapeIlike(search)
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
    }

    // Apply sort order.
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'price_asc':
        query = query.order('price_in_pi', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price_in_pi', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Apply pagination.
    query = query.range(offset, offset + limit - 1)

    const { data: products, error: queryError, count } = await query

    if (queryError) {
      console.error('[GET /api/products] Query error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const total = count ?? 0
    const total_pages = Math.ceil(total / limit)

    const response: PaginatedProductsResponse = {
      products: (products ?? []) as Product[],
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('[GET /api/products] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
