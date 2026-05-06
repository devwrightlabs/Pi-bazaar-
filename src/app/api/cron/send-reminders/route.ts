/**
 * GET /api/cron/send-reminders
 *
 * Cron job that fires hourly. Finds listings that just became active
 * (within the last hour), looks up all buyers who set reminders for
 * those listings, logs the recipients, and clears the reminder rows.
 *
 * Security: Requires the x-cron-secret header to match CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    // 1. Validate cron secret
    const cronSecret = process.env.CRON_SECRET
    const headerSecret = req.headers.get('x-cron-secret')

    if (!cronSecret || headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Find listings that became active within the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: activeListings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select('id, title')
      .eq('status', 'active')
      .gte('updated_at', oneHourAgo)

    if (listingsError) {
      console.error('[cron/send-reminders] Listings query error:', listingsError)
      return NextResponse.json(
        { error: 'Failed to query listings' },
        { status: 500 }
      )
    }

    if (!activeListings || activeListings.length === 0) {
      return NextResponse.json({ processed: 0, reminders_sent: 0 })
    }

    const listingIds = activeListings.map((l) => l.id)

    // 3. Fetch all reminder rows for these listings
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .from('listing_reminders')
      .select('id, listing_id, user_pi_uid')
      .in('listing_id', listingIds)

    if (remindersError) {
      console.error('[cron/send-reminders] Reminders query error:', remindersError)
      return NextResponse.json(
        { error: 'Failed to query reminders' },
        { status: 500 }
      )
    }

    const reminderRows = reminders ?? []

    // 4. Log reminder recipients (actual email sending is out of scope)
    for (const reminder of reminderRows) {
      const listing = activeListings.find((l) => l.id === reminder.listing_id)
      console.log(
        `[cron/send-reminders] Notifying user ${reminder.user_pi_uid} about listing "${listing?.title ?? reminder.listing_id}" (${reminder.listing_id})`
      )
    }

    // 5. Delete processed reminder rows
    if (reminderRows.length > 0) {
      const reminderIds = reminderRows.map((r) => r.id)
      const { error: deleteError } = await supabaseAdmin
        .from('listing_reminders')
        .delete()
        .in('id', reminderIds)

      if (deleteError) {
        console.error('[cron/send-reminders] Delete error:', deleteError)
        // Non-fatal — we still return success for what was processed
      }
    }

    return NextResponse.json({
      processed: activeListings.length,
      reminders_sent: reminderRows.length,
    })
  } catch (err) {
    console.error('[cron/send-reminders] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
