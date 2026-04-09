/**
 * GET  /api/users/reviews  — Fetch reviews for a user
 * POST /api/users/reviews  — Submit a review for a completed escrow transaction
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT.
 *   - Server-side verification ensures only the buyer of a completed escrow
 *     can submit a review, and only once per transaction.
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS.
 *   - Trust scores are recalculated via a SECURITY DEFINER SQL function.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { stripHtml, sanitizeText } from '@/lib/sanitize'
import type {
  SubmitReviewRequest,
  SubmitReviewResponse,
  UserReviewsResponse,
  ReviewRecord,
} from '@/types/messaging'

// Escrow statuses that indicate a successfully completed transaction
const COMPLETED_STATUSES = ['released', 'completed', 'auto_released'] as const

// ─── GET /api/users/reviews ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate caller.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate query parameters.
    const { searchParams } = req.nextUrl
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
    const offset = (page - 1) * limit

    // 3. Fetch reviews for the target user, newest first.
    const { data: reviews, error: reviewsError, count } = await supabaseAdmin
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (reviewsError) {
      console.error('[users/reviews/GET] Reviews fetch error:', reviewsError)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    // 4. Fetch the user's current trust_score and total_sales.
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('trust_score, total_sales')
      .eq('pi_uid', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const total = count ?? 0
    const response: UserReviewsResponse = {
      reviews: (reviews ?? []) as ReviewRecord[],
      trust_score: Number(user.trust_score ?? 0),
      total_sales: user.total_sales ?? 0,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[users/reviews/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/users/reviews ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate reviewer.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const reviewerPiUid = auth.pi_uid

    // 2. Parse and validate request body.
    const body = (await req.json()) as SubmitReviewRequest
    const { escrow_id, rating, comment } = body

    if (!escrow_id) {
      return NextResponse.json({ error: 'escrow_id is required' }, { status: 400 })
    }
    if (rating === undefined || rating === null) {
      return NextResponse.json({ error: 'rating is required' }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 })
    }
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        return NextResponse.json({ error: 'comment must be a string' }, { status: 400 })
      }
      if (comment.trim().length > 1000) {
        return NextResponse.json({ error: 'comment must be at most 1000 characters' }, { status: 400 })
      }
    }

    // 3. Security verification — fetch the escrow transaction.
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id, buyer_id, seller_id, status')
      .eq('id', escrow_id)
      .single()

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow transaction not found' }, { status: 404 })
    }

    // Only the buyer may submit a review.
    if (escrow.buyer_id !== reviewerPiUid) {
      return NextResponse.json(
        { error: 'Only the buyer of this transaction can submit a review' },
        { status: 403 }
      )
    }

    // Transaction must be in a completed state.
    if (!(COMPLETED_STATUSES as readonly string[]).includes(escrow.status)) {
      return NextResponse.json(
        { error: 'Transaction must be completed before leaving a review' },
        { status: 400 }
      )
    }

    // 4. Check for duplicate review.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('escrow_id', escrow_id)
      .eq('reviewer_id', reviewerPiUid)
      .maybeSingle()

    if (existingError) {
      console.error('[users/reviews/POST] Duplicate review check error:', existingError)
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this transaction' },
        { status: 409 }
      )
    }

    // 5. Insert the review.
    const { data: review, error: insertError } = await supabaseAdmin
      .from('reviews')
      .insert({
        reviewer_id: reviewerPiUid,
        reviewee_id: escrow.seller_id,
        escrow_id,
        rating,
        comment: comment ? sanitizeText(comment) : null,
      })
      .select()
      .single()

    if (insertError || !review) {
      console.error('[users/reviews/POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }

    // 6. Recalculate the seller's trust score.
    const { error: rpcError } = await supabaseAdmin.rpc('recalculate_trust_score', {
      target_pi_uid: escrow.seller_id,
    })

    if (rpcError) {
      // Non-fatal: review was saved; trust score recalculation can be retried later.
      console.error('[users/reviews/POST] Trust score recalculation error:', rpcError)
    }

    // 7. Fetch the updated trust score and total_sales for the response.
    const { data: seller } = await supabaseAdmin
      .from('users')
      .select('trust_score, total_sales')
      .eq('pi_uid', escrow.seller_id)
      .single()

    const response: SubmitReviewResponse = {
      review: review as ReviewRecord,
      seller_trust_score: Number(seller?.trust_score ?? 0),
      seller_total_sales: seller?.total_sales ?? 0,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('[users/reviews/POST] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
