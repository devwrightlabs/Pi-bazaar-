/**
 * GET  /api/users/settings — Fetch the authenticated user's settings
 * POST /api/users/settings — Create initial settings for the authenticated user
 * PUT  /api/users/settings — Update the authenticated user's settings
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body or query params).
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CURRENCY_LENGTH = 10

// ─── GET /api/users/settings ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('id, user_id, preferred_currency, email_notifications, push_notifications, created_at, updated_at')
      .eq('user_id', auth.pi_uid)
      .maybeSingle()

    if (error) {
      console.error('[users/settings/GET] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Return null if no settings row exists yet — the client can POST to create one.
    return NextResponse.json({ settings: settings ?? null })
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

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Check if settings already exist.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('user_settings')
      .select('id')
      .eq('user_id', auth.pi_uid)
      .maybeSingle()

    if (existingError) {
      console.error('[users/settings/POST] Existing settings lookup error:', existingError)
      return NextResponse.json({ error: 'Failed to check existing settings' }, { status: 500 })
    }
    if (existing) {
      return NextResponse.json(
        { error: 'Settings already exist. Use PUT to update.' },
        { status: 409 }
      )
    }

    // Validate optional fields.
    const preferred_currency = typeof body.preferred_currency === 'string'
      ? body.preferred_currency.trim()
      : 'USD'
    if (preferred_currency.length === 0 || preferred_currency.length > MAX_CURRENCY_LENGTH) {
      return NextResponse.json(
        { error: `preferred_currency must be between 1 and ${MAX_CURRENCY_LENGTH} characters` },
        { status: 400 }
      )
    }

    const email_notifications = typeof body.email_notifications === 'boolean'
      ? body.email_notifications
      : true
    const push_notifications = typeof body.push_notifications === 'boolean'
      ? body.push_notifications
      : true

    const { data: settings, error: insertError } = await supabaseAdmin
      .from('user_settings')
      .insert({
        user_id: auth.pi_uid,
        preferred_currency,
        email_notifications,
        push_notifications,
      })
      .select('id, user_id, preferred_currency, email_notifications, push_notifications, created_at, updated_at')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Settings already exist. Use PUT to update.' },
          { status: 409 }
        )
      }

      console.error('[users/settings/POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 })
    }

    if (!settings) {
      console.error('[users/settings/POST] Insert error: Missing inserted settings row')
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

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Build the update payload — only include provided fields.
    const updates: Record<string, unknown> = {}

    if ('preferred_currency' in body) {
      const val = typeof body.preferred_currency === 'string' ? body.preferred_currency.trim() : ''
      if (val.length === 0 || val.length > MAX_CURRENCY_LENGTH) {
        return NextResponse.json(
          { error: `preferred_currency must be between 1 and ${MAX_CURRENCY_LENGTH} characters` },
          { status: 400 }
        )
      }
      updates.preferred_currency = val
    }

    if ('email_notifications' in body) {
      if (typeof body.email_notifications !== 'boolean') {
        return NextResponse.json({ error: 'email_notifications must be a boolean' }, { status: 400 })
      }
      updates.email_notifications = body.email_notifications
    }

    if ('push_notifications' in body) {
      if (typeof body.push_notifications !== 'boolean') {
        return NextResponse.json({ error: 'push_notifications must be a boolean' }, { status: 400 })
      }
      updates.push_notifications = body.push_notifications
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: settings, error: updateError } = await supabaseAdmin
      .from('user_settings')
      .update(updates)
      .eq('user_id', auth.pi_uid)
      .select('id, user_id, preferred_currency, email_notifications, push_notifications, created_at, updated_at')
      .single()

    if (updateError || !settings) {
      // If no row was found, the user hasn't created settings yet.
      if (updateError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Settings not found. Use POST to create.' }, { status: 404 })
      }
      console.error('[users/settings/PUT] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[users/settings/PUT] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
