/**
 * GET    /api/users/addresses — Fetch the authenticated user's saved addresses
 * POST   /api/users/addresses — Create a new saved address
 * PUT    /api/users/addresses — Update an existing saved address
 * DELETE /api/users/addresses — Delete a saved address
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body or query params).
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS.
 *   - When a new address is set as is_default=true, any previously saved
 *     default address for that user is updated to is_default=false.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── Constants ────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_FIELD_LENGTH = 200
const MAX_PHONE_LENGTH = 30
const MAX_ADDRESSES_PER_USER = 20

const SELECT_FIELDS = 'id, user_id, is_default, full_name, street_address, city, state_province, postal_code, country_code, phone_number, created_at'

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

// ─── GET /api/users/addresses ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: addresses, error } = await supabaseAdmin
      .from('saved_addresses')
      .select(SELECT_FIELDS)
      .eq('user_id', auth.pi_uid)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[users/addresses/GET] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
    }

    return NextResponse.json({ addresses: addresses ?? [] })
  } catch (err) {
    console.error('[users/addresses/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/users/addresses ────────────────────────────────────────────────

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

    // Validate required fields.
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const street_address = typeof body.street_address === 'string' ? body.street_address.trim() : ''
    const city = typeof body.city === 'string' ? body.city.trim() : ''
    const state_province = typeof body.state_province === 'string' ? body.state_province.trim() : ''
    const postal_code = typeof body.postal_code === 'string' ? body.postal_code.trim() : ''
    const country_code = typeof body.country_code === 'string' ? body.country_code.trim().toUpperCase() : ''

    if (!full_name) return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
    if (!street_address) return NextResponse.json({ error: 'street_address is required' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'city is required' }, { status: 400 })
    if (!state_province) return NextResponse.json({ error: 'state_province is required' }, { status: 400 })
    if (!postal_code) return NextResponse.json({ error: 'postal_code is required' }, { status: 400 })
    if (!country_code) return NextResponse.json({ error: 'country_code is required' }, { status: 400 })
    if (!/^[A-Z]{2}$/.test(country_code)) return NextResponse.json({ error: 'country_code must be a 2-letter ISO 3166-1 alpha-2 code (e.g. US, GB)' }, { status: 400 })

    // Length checks.
    if (full_name.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `full_name must be ${MAX_FIELD_LENGTH} characters or fewer` }, { status: 400 })
    if (street_address.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `street_address must be ${MAX_FIELD_LENGTH} characters or fewer` }, { status: 400 })
    if (city.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `city must be ${MAX_FIELD_LENGTH} characters or fewer` }, { status: 400 })
    if (state_province.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `state_province must be ${MAX_FIELD_LENGTH} characters or fewer` }, { status: 400 })
    if (postal_code.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `postal_code must be ${MAX_FIELD_LENGTH} characters or fewer` }, { status: 400 })

    const phone_number = typeof body.phone_number === 'string' ? body.phone_number.trim() || null : null
    if (phone_number && phone_number.length > MAX_PHONE_LENGTH) {
      return NextResponse.json({ error: `phone_number must be ${MAX_PHONE_LENGTH} characters or fewer` }, { status: 400 })
    }

    const is_default = typeof body.is_default === 'boolean' ? body.is_default : false

    // Enforce max addresses per user.
    const { count, error: countError } = await supabaseAdmin
      .from('saved_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.pi_uid)

    if (countError) {
      console.error('[users/addresses/POST] Count error:', countError)
      return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
    }

    if ((count ?? 0) >= MAX_ADDRESSES_PER_USER) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_ADDRESSES_PER_USER} addresses allowed` },
        { status: 400 }
      )
    }

    // If this address is the new default, clear the old default.
    if (is_default) {
      const { error: clearError } = await supabaseAdmin
        .from('saved_addresses')
        .update({ is_default: false })
        .eq('user_id', auth.pi_uid)
        .eq('is_default', true)

      if (clearError) {
        console.error('[users/addresses/POST] Clear default error:', clearError)
        return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
      }
    }

    const { data: address, error: insertError } = await supabaseAdmin
      .from('saved_addresses')
      .insert({
        user_id: auth.pi_uid,
        is_default,
        full_name,
        street_address,
        city,
        state_province,
        postal_code,
        country_code,
        phone_number,
      })
      .select(SELECT_FIELDS)
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        console.warn('[users/addresses/POST] Insert conflict:', insertError)
        return NextResponse.json(
          { error: 'Default address was updated concurrently. Please retry.' },
          { status: 409 }
        )
      }

      console.error('[users/addresses/POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
    }

    if (!address) {
      console.error('[users/addresses/POST] Insert error: missing inserted address')
      return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
    }
    return NextResponse.json({ address }, { status: 201 })
  } catch (err) {
    console.error('[users/addresses/POST] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT /api/users/addresses ─────────────────────────────────────────────────

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

    // address_id is required for update.
    const address_id = typeof body.address_id === 'string' ? body.address_id.trim() : ''
    if (!address_id || !isValidUuid(address_id)) {
      return NextResponse.json({ error: 'address_id must be a valid UUID' }, { status: 400 })
    }

    // Verify ownership.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('saved_addresses')
      .select('id, user_id')
      .eq('id', address_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }
    if (existing.user_id !== auth.pi_uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update payload.
    const updates: Record<string, unknown> = {}

    if ('full_name' in body) {
      const val = typeof body.full_name === 'string' ? body.full_name.trim() : ''
      if (!val || val.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `full_name must be between 1 and ${MAX_FIELD_LENGTH} characters` }, { status: 400 })
      updates.full_name = val
    }
    if ('street_address' in body) {
      const val = typeof body.street_address === 'string' ? body.street_address.trim() : ''
      if (!val || val.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `street_address must be between 1 and ${MAX_FIELD_LENGTH} characters` }, { status: 400 })
      updates.street_address = val
    }
    if ('city' in body) {
      const val = typeof body.city === 'string' ? body.city.trim() : ''
      if (!val || val.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `city must be between 1 and ${MAX_FIELD_LENGTH} characters` }, { status: 400 })
      updates.city = val
    }
    if ('state_province' in body) {
      const val = typeof body.state_province === 'string' ? body.state_province.trim() : ''
      if (!val || val.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `state_province must be between 1 and ${MAX_FIELD_LENGTH} characters` }, { status: 400 })
      updates.state_province = val
    }
    if ('postal_code' in body) {
      const val = typeof body.postal_code === 'string' ? body.postal_code.trim() : ''
      if (!val || val.length > MAX_FIELD_LENGTH) return NextResponse.json({ error: `postal_code must be between 1 and ${MAX_FIELD_LENGTH} characters` }, { status: 400 })
      updates.postal_code = val
    }
    if ('country_code' in body) {
      const val = typeof body.country_code === 'string' ? body.country_code.trim().toUpperCase() : ''
      if (!val || !/^[A-Z]{2}$/.test(val)) return NextResponse.json({ error: 'country_code must be a 2-letter ISO 3166-1 alpha-2 code (e.g. US, GB)' }, { status: 400 })
      updates.country_code = val
    }
    if ('phone_number' in body) {
      const val = body.phone_number === null ? null : (typeof body.phone_number === 'string' ? body.phone_number.trim() || null : null)
      if (val && val.length > MAX_PHONE_LENGTH) return NextResponse.json({ error: `phone_number must be ${MAX_PHONE_LENGTH} characters or fewer` }, { status: 400 })
      updates.phone_number = val
    }
    if ('is_default' in body) {
      if (typeof body.is_default !== 'boolean') {
        return NextResponse.json({ error: 'is_default must be a boolean' }, { status: 400 })
      }
      updates.is_default = body.is_default
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    let address
    let updateError

    // When setting an address as default, perform the clear + update atomically
    // in the database to avoid leaving the user with no default address if the
    // second step fails.
    if (updates.is_default === true) {
      const rpcResult = await supabaseAdmin.rpc('update_saved_address_atomic', {
        p_user_id: auth.pi_uid,
        p_address_id: address_id,
        p_full_name: Object.prototype.hasOwnProperty.call(updates, 'full_name') ? updates.full_name : null,
        p_street_address: Object.prototype.hasOwnProperty.call(updates, 'street_address') ? updates.street_address : null,
        p_city: Object.prototype.hasOwnProperty.call(updates, 'city') ? updates.city : null,
        p_state_province: Object.prototype.hasOwnProperty.call(updates, 'state_province') ? updates.state_province : null,
        p_postal_code: Object.prototype.hasOwnProperty.call(updates, 'postal_code') ? updates.postal_code : null,
        p_country_code: Object.prototype.hasOwnProperty.call(updates, 'country_code') ? updates.country_code : null,
        p_phone_number: Object.prototype.hasOwnProperty.call(updates, 'phone_number') ? updates.phone_number : null,
      })

      address = rpcResult.data
      updateError = rpcResult.error
    } else {
      const updateResult = await supabaseAdmin
        .from('saved_addresses')
        .update(updates)
        .eq('id', address_id)
        .eq('user_id', auth.pi_uid)
        .select(SELECT_FIELDS)
        .single()

      address = updateResult.data
      updateError = updateResult.error
    }
    if (updateError) {
      console.error('[users/addresses/PUT] Update error:', updateError)
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'Default address conflict' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
    }

    if (!address) {
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
    }
    return NextResponse.json({ address })
  } catch (err) {
    console.error('[users/addresses/PUT] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/users/addresses ──────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const address_id = searchParams.get('address_id') ?? ''

    if (!address_id || !isValidUuid(address_id)) {
      return NextResponse.json({ error: 'address_id query parameter must be a valid UUID' }, { status: 400 })
    }

    // Verify ownership.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('saved_addresses')
      .select('id, user_id')
      .eq('id', address_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }
    if (existing.user_id !== auth.pi_uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('saved_addresses')
      .delete()
      .eq('id', address_id)
      .eq('user_id', auth.pi_uid)

    if (deleteError) {
      console.error('[users/addresses/DELETE] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[users/addresses/DELETE] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
