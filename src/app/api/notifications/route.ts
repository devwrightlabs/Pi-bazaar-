/**
 * GET  /api/notifications — Fetch notifications for the authenticated user
 * POST /api/notifications — Create a notification (internal use)
 *
 * Security: Requires a valid custom JWT in the Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { pi_uid } = auth

    const searchParams = req.nextUrl.searchParams
    const unreadOnly = searchParams.get('unread') === 'true'
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '20', 10)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20

    let query = supabaseAdmin
      .from('notifications')
      .select('id, user_pi_uid, type, title, body, read, created_at, metadata')
      .eq('user_pi_uid', pi_uid)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('[notifications/GET] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    const notifications = data ?? []
    const unread_count = notifications.filter((n) => !n.read).length

    return NextResponse.json({ notifications, unread_count })
  } catch (err) {
    console.error('[notifications/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/notifications ──────────────────────────────────────────────────

interface CreateNotificationBody {
  target_user_pi_uid?: unknown
  type?: unknown
  title?: unknown
  body?: unknown
  metadata?: unknown
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: CreateNotificationBody
    try {
      body = (await req.json()) as CreateNotificationBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { target_user_pi_uid, type, title, body: notifBody, metadata } = body

    if (
      typeof target_user_pi_uid !== 'string' ||
      typeof type !== 'string' ||
      typeof title !== 'string' ||
      typeof notifBody !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: target_user_pi_uid, type, title, body' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_pi_uid: target_user_pi_uid,
        type,
        title,
        body: notifBody,
        read: false,
        metadata: metadata ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[notifications/POST] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[notifications/POST] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
