/**
 * GET  /api/users/settings — Fetch the caller's settings (returns defaults if none exist)
 * POST /api/users/settings — Create initial settings for the caller
 * PUT  /api/users/settings — Update the caller's settings
 *
 * Security:
 *   - Caller identity is extracted from the verified custom JWT.
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS;
 *     the caller's pi_uid is enforced explicitly in every query predicate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CURRENCY_LENGTH = 5

// ─── GET /api/users/settings ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', piUid)
      .maybeSingle()

    if (error) {
      console.error('[users/settings/GET] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Return existing settings, or sensible defaults if none created yet.
    if (!settings) {
      return NextResponse.json({
        settings: {
          user_id: piUid,
          preferred_currency: 'USD',
          email_notifications: true,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[users/settings/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/users/settings ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate optional fields.
    const preferred_currency = typeof body.preferred_currency === 'string'
      ? body.preferred_currency.trim().toUpperCase()
      : 'USD'
    const email_notifications = typeof body.email_notifications === 'boolean'
      ? body.email_notifications
      : true

    if (preferred_currency.length > MAX_CURRENCY_LENGTH) {
      return NextResponse.json({ error: 'preferred_currency is too long' }, { status: 400 })
    }

    // Check if settings already exist.
    const { data: existing } = await supabaseAdmin
      .from('user_settings')
      .select('id')
      .eq('user_id', piUid)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Settings already exist. Use PUT to update.' }, { status: 409 })
    }

    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .insert({
        user_id: piUid,
        preferred_currency,
        email_notifications,
      })
      .select()
      .single()

    if (error) {
      console.error('[users/settings/POST] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 })
    }

    return NextResponse.json({ settings }, { status: 201 })
  } catch (err) {
    console.error('[users/settings/POST] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT /api/users/settings ──────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Build the update payload from provided fields only.
    const updates: Record<string, unknown> = {}

    if (body.preferred_currency !== undefined) {
      if (typeof body.preferred_currency !== 'string') {
        return NextResponse.json({ error: 'preferred_currency must be a string' }, { status: 400 })
      }
      const currency = body.preferred_currency.trim().toUpperCase()
      if (currency.length === 0 || currency.length > MAX_CURRENCY_LENGTH) {
        return NextResponse.json({ error: 'preferred_currency is invalid' }, { status: 400 })
      }
      updates.preferred_currency = currency
    }

    if (body.email_notifications !== undefined) {
      if (typeof body.email_notifications !== 'boolean') {
        return NextResponse.json({ error: 'email_notifications must be a boolean' }, { status: 400 })
      }
      updates.email_notifications = body.email_notifications
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .update(updates)
      .eq('user_id', piUid)
      .select()
      .single()

    if (error) {
      console.error('[users/settings/PUT] Update error:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found. Use POST to create.' }, { status: 404 })
    }

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[users/settings/PUT] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
