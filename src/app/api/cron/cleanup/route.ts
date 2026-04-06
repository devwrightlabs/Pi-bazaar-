/**
 * GET /api/cron/cleanup
 *
 * Automated clean-up cron route — meant to be triggered daily via Vercel Cron
 * or Supabase pg_cron.
 *
 * Finds all escrow_transactions with status 'pending' (buyer initiated checkout
 * but never completed the Pi payment) that are older than 24 hours, and
 * automatically updates their status to 'cancelled' to free up inventory.
 *
 * Security:
 *   - Protected by a shared secret (`CRON_SECRET` env var) to prevent
 *     unauthorized invocations. Vercel Cron passes this in the
 *     `Authorization: Bearer <secret>` header automatically.
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Transactions older than this threshold (in hours) are considered abandoned.
const STALE_THRESHOLD_HOURS = 24
const MS_PER_HOUR = 3_600_000 // 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    // 1. Verify cron secret to prevent unauthorized access.
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('[cron/cleanup] CRON_SECRET is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Calculate the cutoff timestamp (24 hours ago).
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_HOURS * MS_PER_HOUR).toISOString()

    // 3. Find and cancel all stale pending escrow transactions.
    const { data: cancelled, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .select('id')

    if (error) {
      console.error('[cron/cleanup] Failed to cancel stale transactions:', error)
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }

    const count = cancelled?.length ?? 0
    console.log(`[cron/cleanup] Cancelled ${count} stale pending transaction(s)`)

    return NextResponse.json({
      success: true,
      cancelled_count: count,
      cancelled_ids: (cancelled ?? []).map((row) => row.id),
    })
  } catch (err) {
    console.error('[cron/cleanup] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
