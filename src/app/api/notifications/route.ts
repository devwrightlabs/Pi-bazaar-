/**
 * GET   /api/notifications — Fetch a paginated page of unread notifications
 *                               for the caller (`page` query param, `limit`
 *                               default 50, max 100)
 * PATCH /api/notifications — Mark specific (or all) notifications as read
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body or query params).
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS;
 *     the caller's pi_uid is enforced explicitly in every query predicate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate caller via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // 2. Apply bounded pagination for unread notifications.
    const searchParams = req.nextUrl.searchParams
    const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10)
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '50', 10)
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 50
    const from = (page - 1) * limit
    const to = from + limit

    // 3. Fetch unread notifications for this user, newest first.
    // Request one extra row so we can expose whether another page exists.
    const { data: notificationRows, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', piUid)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[notifications/GET] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    const notifications = notificationRows ?? []
    const hasNextPage = notifications.length > limit

    return NextResponse.json({
      notifications: hasNextPage ? notifications.slice(0, limit) : notifications,
      page,
      limit,
      has_next_page: hasNextPage,
    })
  } catch (err) {
    console.error('[notifications/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/notifications ─────────────────────────────────────────────────

interface MarkReadBody {
  notification_ids?: unknown
  all?: unknown
}

export async function PATCH(req: NextRequest) {
  try {
    // 1. Authenticate caller via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // 2. Parse and validate request body.
    let body: MarkReadBody
    try {
      body = (await req.json()) as MarkReadBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { notification_ids, all } = body

    // Either `all: true` or a non-empty array of UUIDs must be provided.
    if (all !== true && !Array.isArray(notification_ids)) {
      return NextResponse.json(
        { error: 'Provide either "all": true or "notification_ids": [...]' },
        { status: 400 }
      )
    }

    if (all === true) {
      // Mark every unread notification for this user as read.
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', piUid)
        .eq('is_read', false)

      if (error) {
        console.error('[notifications/PATCH] Mark-all-read error:', error)
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
      }

      return NextResponse.json({ updated: 'all' })
    }

    // Mark specific notifications as read — validate each ID is a well-formed UUID.
    const ids = notification_ids as unknown[]
    if (ids.length === 0) {
      return NextResponse.json({ error: 'notification_ids must not be empty' }, { status: 400 })
    }

    const validatedIds: string[] = []
    for (const id of ids) {
      if (typeof id !== 'string' || !isValidUuid(id)) {
        return NextResponse.json(
          { error: 'Each notification_id must be a valid UUID' },
          { status: 400 }
        )
      }
      validatedIds.push(id)
    }

    // Scope the update to the authenticated user's unread notifications only —
    // the user_id predicate prevents marking another user's notifications,
    // and the is_read predicate avoids unnecessary writes/counting already-read rows.
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', piUid)
      .in('id', validatedIds)
      .eq('is_read', false)
      .select('id')

    if (error) {
      console.error('[notifications/PATCH] Mark-read error:', error)
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
    }

    return NextResponse.json({ updated: data?.length ?? 0 })
  } catch (err) {
    console.error('[notifications/PATCH] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
