/**
 * GET /api/cron/cleanup
 *
 * Automated daily clean-up route triggered by Vercel Cron.
 *
 * Finds all escrow_transactions with status 'pending' that are older than
 * 24 hours (buyer initiated checkout but never completed the Pi payment)
 * and sets their status to 'cancelled' to free up seller inventory.
 *
 * Security:
 *   - Protected by the CRON_SECRET environment variable. Vercel injects the
 *     secret as the `Authorization: Bearer <CRON_SECRET>` header on cron
 *     invocations. Requests without a matching secret are rejected.
 *   - All DB operations use supabaseAdmin (service role).
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Stale threshold: 24 hours in milliseconds.
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    // 1. Verify the cron secret to prevent unauthorised invocations.
    const authHeader = req.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[cron/cleanup] CRON_SECRET is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const tokenBuffer = Buffer.from(token)
    const cronSecretBuffer = Buffer.from(cronSecret)

    // Constant-time comparison to prevent timing attacks.
    if (
      tokenBuffer.length !== cronSecretBuffer.length ||
      !timingSafeEqual(tokenBuffer, cronSecretBuffer)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Calculate the cutoff timestamp (24 hours ago).
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString()

    // 3. Update all stale 'pending' escrow transactions to 'cancelled'.
    const { count, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'cancelled' }, { count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', cutoff)

    if (error) {
      console.error('[cron/cleanup] Failed to cancel stale transactions:', error)
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }

    const cancelledCount = count ?? 0
    console.log(`[cron/cleanup] Cancelled ${cancelledCount} stale pending transaction(s)`)

    return NextResponse.json({ cancelled: cancelledCount })
  } catch (err) {
    console.error('[cron/cleanup] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
