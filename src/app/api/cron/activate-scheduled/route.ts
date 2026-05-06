/**
 * GET /api/cron/activate-scheduled
 *
 * Vercel Cron job — activates listings whose scheduled_at time has passed.
 *
 * Security: Protected by CRON_SECRET header (x-cron-secret).
 * Vercel should be configured to call this with the secret in the header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify the cron secret
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[cron/activate-scheduled] CRON_SECRET is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const providedSecret = req.headers.get('x-cron-secret') ?? ''

    const secretBuffer = Buffer.from(cronSecret)
    const providedBuffer = Buffer.from(providedSecret)

    const isValid =
      secretBuffer.length === providedBuffer.length &&
      timingSafeEqual(secretBuffer, providedBuffer)

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Find all scheduled listings whose time has arrived
    const now = new Date().toISOString()

    const { data: toActivate, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    if (fetchError) {
      console.error('[cron/activate-scheduled] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch scheduled listings' }, { status: 500 })
    }

    if (!toActivate || toActivate.length === 0) {
      return NextResponse.json({ activated: 0 })
    }

    const ids = toActivate.map((row: { id: string }) => row.id)

    // 3. Activate them
    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({ status: 'active' })
      .in('id', ids)

    if (updateError) {
      console.error('[cron/activate-scheduled] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to activate listings' }, { status: 500 })
    }

    console.log(`[cron/activate-scheduled] Activated ${ids.length} listing(s)`)

    return NextResponse.json({ activated: ids.length })
  } catch (err) {
    console.error('[cron/activate-scheduled] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
