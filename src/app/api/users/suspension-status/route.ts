/**
 * GET /api/users/suspension-status?seller_id=xxx
 *
 * Public endpoint to check whether a seller has an active suspension.
 * Used by listing pages to show a "seller suspended" badge.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const sellerId = req.nextUrl.searchParams.get('seller_id')

    if (!sellerId || !sellerId.trim()) {
      return NextResponse.json(
        { error: 'seller_id query param is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('seller_suspensions')
      .select('id, reason, expires_at')
      .eq('seller_pi_uid', sellerId.trim())
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[users/suspension-status/GET] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to check suspension status' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ suspended: false })
    }

    return NextResponse.json({
      suspended: true,
      reason: data.reason ?? undefined,
      expires_at: data.expires_at ?? null,
    })
  } catch (err) {
    console.error('[users/suspension-status/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
