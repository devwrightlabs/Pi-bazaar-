/**
 * POST /api/admin/suspend — Suspend a seller account
 * GET  /api/admin/suspend — List all active suspensions
 *
 * Security: Caller's pi_uid must be present in ADMIN_PI_UIDS env var
 *           (comma-separated list).
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

interface SuspensionRecord {
  id: string
  seller_pi_uid: string
  reason: string
  suspended_at: string
  expires_at: string | null
  suspended_by: string
}

function isAdmin(pi_uid: string): boolean {
  const adminUids = (process.env.ADMIN_PI_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return adminUids.includes(pi_uid)
}

// ─── POST /api/admin/suspend ──────────────────────────────────────────────────

interface SuspendBody {
  seller_pi_uid?: unknown
  reason?: unknown
  duration_days?: unknown
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(auth.pi_uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: SuspendBody
    try {
      body = (await req.json()) as SuspendBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { seller_pi_uid, reason, duration_days } = body

    if (typeof seller_pi_uid !== 'string' || !seller_pi_uid.trim()) {
      return NextResponse.json(
        { error: 'seller_pi_uid is required' },
        { status: 400 }
      )
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    const suspendedAt = new Date().toISOString()
    let expiresAt: string | null = null

    if (duration_days !== undefined) {
      const days = Number(duration_days)
      if (!Number.isFinite(days) || days <= 0) {
        return NextResponse.json(
          { error: 'duration_days must be a positive number' },
          { status: 400 }
        )
      }
      const expires = new Date()
      expires.setDate(expires.getDate() + days)
      expiresAt = expires.toISOString()
    }

    const { error } = await supabaseAdmin.from('seller_suspensions').insert({
      seller_pi_uid: seller_pi_uid.trim(),
      reason: reason.trim(),
      suspended_at: suspendedAt,
      expires_at: expiresAt,
      suspended_by: auth.pi_uid,
    })

    if (error) {
      console.error('[admin/suspend/POST] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create suspension' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, expires_at: expiresAt })
  } catch (err) {
    console.error('[admin/suspend/POST] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/admin/suspend ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(auth.pi_uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()

    // Active = permanent (expires_at IS NULL) or not yet expired
    const { data, error } = await supabaseAdmin
      .from('seller_suspensions')
      .select('id, seller_pi_uid, reason, suspended_at, expires_at, suspended_by')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('suspended_at', { ascending: false })

    if (error) {
      console.error('[admin/suspend/GET] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch suspensions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ suspensions: (data ?? []) as SuspensionRecord[] })
  } catch (err) {
    console.error('[admin/suspend/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
