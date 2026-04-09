/**
 * GET  /api/users/addresses — List the caller's saved shipping addresses
 * POST /api/users/addresses — Add a new saved address
 * PUT  /api/users/addresses — Update an existing saved address
 *
 * Security:
 *   - Caller identity is extracted from the verified custom JWT.
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS;
 *     the caller's pi_uid is enforced explicitly in every query predicate.
 *
 * Default address logic:
 *   When is_default = true is set on a new or updated address, any
 *   previously existing default address for the same user is automatically
 *   toggled to is_default = false.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { stripHtml } from '@/lib/sanitize'

// ─── Constants ────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/
const MAX_TEXT_LENGTH = 500
const MAX_PHONE_LENGTH = 30
const MAX_ADDRESSES_PER_USER = 20

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

// ─── Validation helper ────────────────────────────────────────────────────────

interface AddressInput {
  full_name: string
  street_address: string
  city: string
  state_province: string
  postal_code: string
  country_code: string
  phone_number?: string | null
  is_default?: boolean
}

function validateAddressFields(body: Record<string, unknown>): AddressInput | string {
  const full_name = body.full_name
  const street_address = body.street_address
  const city = body.city
  const state_province = body.state_province
  const postal_code = body.postal_code
  const country_code = body.country_code
  const phone_number = body.phone_number
  const is_default = body.is_default

  // Required string fields
  if (typeof full_name !== 'string' || full_name.trim().length === 0) {
    return 'full_name is required'
  }
  if (typeof street_address !== 'string' || street_address.trim().length === 0) {
    return 'street_address is required'
  }
  if (typeof city !== 'string' || city.trim().length === 0) {
    return 'city is required'
  }
  if (typeof state_province !== 'string' || state_province.trim().length === 0) {
    return 'state_province is required'
  }
  if (typeof postal_code !== 'string' || postal_code.trim().length === 0) {
    return 'postal_code is required'
  }
  if (typeof country_code !== 'string' || country_code.trim().length === 0) {
    return 'country_code is required'
  }

  // Length guards
  if (full_name.trim().length > MAX_TEXT_LENGTH) return 'full_name is too long'
  if (street_address.trim().length > MAX_TEXT_LENGTH) return 'street_address is too long'
  if (city.trim().length > MAX_TEXT_LENGTH) return 'city is too long'
  if (state_province.trim().length > MAX_TEXT_LENGTH) return 'state_province is too long'
  if (postal_code.trim().length > MAX_TEXT_LENGTH) return 'postal_code is too long'

  const cc = country_code.trim().toUpperCase()
  if (!COUNTRY_CODE_REGEX.test(cc)) {
    return 'country_code must be a 2-letter ISO 3166-1 alpha-2 code'
  }

  if (phone_number !== undefined && phone_number !== null) {
    if (typeof phone_number !== 'string') return 'phone_number must be a string'
    if (phone_number.trim().length > MAX_PHONE_LENGTH) return 'phone_number is too long'
  }

  if (is_default !== undefined && typeof is_default !== 'boolean') {
    return 'is_default must be a boolean'
  }

  return {
    full_name: stripHtml(full_name.trim()),
    street_address: stripHtml(street_address.trim()),
    city: stripHtml(city.trim()),
    state_province: stripHtml(state_province.trim()),
    postal_code: stripHtml(postal_code.trim()),
    country_code: cc,
    phone_number: phone_number != null ? stripHtml((phone_number as string).trim()) || null : null,
    is_default: typeof is_default === 'boolean' ? is_default : false,
  }
}

// ─── Helper: clear previous default ──────────────────────────────────────────

async function clearPreviousDefault(piUid: string, excludeId?: string): Promise<void> {
  const query = supabaseAdmin
    .from('saved_addresses')
    .update({ is_default: false })
    .eq('user_id', piUid)
    .eq('is_default', true)

  if (excludeId) {
    query.neq('id', excludeId)
  }

  const { error } = await query

  if (error) {
    console.error('[users/addresses] Failed to clear previous default address:', {
      piUid,
      excludeId,
      error,
    })
    throw error
  }
}

// ─── GET /api/users/addresses ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    const { data: addresses, error } = await supabaseAdmin
      .from('saved_addresses')
      .select('*')
      .eq('user_id', piUid)
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
    const piUid = auth.pi_uid

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = validateAddressFields(body)
    if (typeof validated === 'string') {
      return NextResponse.json({ error: validated }, { status: 400 })
    }

    // Guard: cap the number of saved addresses per user.
    const { count, error: countError } = await supabaseAdmin
      .from('saved_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', piUid)

    if (countError) {
      console.error('[users/addresses/POST] Count error:', countError)
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
    }

    if ((count ?? 0) >= MAX_ADDRESSES_PER_USER) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_ADDRESSES_PER_USER} addresses allowed` },
        { status: 400 }
      )
    }

    // If the new address is default, clear existing defaults first.
    if (validated.is_default) {
      await clearPreviousDefault(piUid)
    }

    const { data: address, error } = await supabaseAdmin
      .from('saved_addresses')
      .insert({
        user_id: piUid,
        full_name: validated.full_name,
        street_address: validated.street_address,
        city: validated.city,
        state_province: validated.state_province,
        postal_code: validated.postal_code,
        country_code: validated.country_code,
        phone_number: validated.phone_number,
        is_default: validated.is_default,
      })
      .select()
      .single()

    if (error) {
      console.error('[users/addresses/POST] Insert error:', error)
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
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
    const piUid = auth.pi_uid

    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // `id` of the address to update is required.
    const addressId = body.id
    if (typeof addressId !== 'string' || !isValidUuid(addressId)) {
      return NextResponse.json({ error: 'A valid address id is required' }, { status: 400 })
    }

    // Verify ownership.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('saved_addresses')
      .select('id')
      .eq('id', addressId)
      .eq('user_id', piUid)
      .maybeSingle()

    if (fetchError) {
      console.error('[users/addresses/PUT] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Build partial update from provided fields.
    const updates: Record<string, unknown> = {}

    if (body.full_name !== undefined) {
      if (typeof body.full_name !== 'string' || body.full_name.trim().length === 0) {
        return NextResponse.json({ error: 'full_name must be a non-empty string' }, { status: 400 })
      }
      if (body.full_name.trim().length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ error: 'full_name is too long' }, { status: 400 })
      }
      updates.full_name = stripHtml((body.full_name as string).trim())
    }
    if (body.street_address !== undefined) {
      if (typeof body.street_address !== 'string' || body.street_address.trim().length === 0) {
        return NextResponse.json({ error: 'street_address must be a non-empty string' }, { status: 400 })
      }
      if (body.street_address.trim().length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ error: 'street_address is too long' }, { status: 400 })
      }
      updates.street_address = stripHtml((body.street_address as string).trim())
    }
    if (body.city !== undefined) {
      if (typeof body.city !== 'string' || body.city.trim().length === 0) {
        return NextResponse.json({ error: 'city must be a non-empty string' }, { status: 400 })
      }
      if (body.city.trim().length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ error: 'city is too long' }, { status: 400 })
      }
      updates.city = stripHtml((body.city as string).trim())
    }
    if (body.state_province !== undefined) {
      if (typeof body.state_province !== 'string' || body.state_province.trim().length === 0) {
        return NextResponse.json({ error: 'state_province must be a non-empty string' }, { status: 400 })
      }
      if (body.state_province.trim().length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ error: 'state_province is too long' }, { status: 400 })
      }
      updates.state_province = stripHtml((body.state_province as string).trim())
    }
    if (body.postal_code !== undefined) {
      if (typeof body.postal_code !== 'string' || body.postal_code.trim().length === 0) {
        return NextResponse.json({ error: 'postal_code must be a non-empty string' }, { status: 400 })
      }
      if (body.postal_code.trim().length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ error: 'postal_code is too long' }, { status: 400 })
      }
      updates.postal_code = stripHtml((body.postal_code as string).trim())
    }
    if (body.country_code !== undefined) {
      if (typeof body.country_code !== 'string') {
        return NextResponse.json({ error: 'country_code must be a string' }, { status: 400 })
      }
      const cc = (body.country_code as string).trim().toUpperCase()
      if (!COUNTRY_CODE_REGEX.test(cc)) {
        return NextResponse.json(
          { error: 'country_code must be a 2-letter ISO 3166-1 alpha-2 code' },
          { status: 400 }
        )
      }
      updates.country_code = cc
    }
    if (body.phone_number !== undefined) {
      if (body.phone_number !== null && typeof body.phone_number !== 'string') {
        return NextResponse.json({ error: 'phone_number must be a string or null' }, { status: 400 })
      }
      if (typeof body.phone_number === 'string' && body.phone_number.trim().length > MAX_PHONE_LENGTH) {
        return NextResponse.json({ error: 'phone_number is too long' }, { status: 400 })
      }
      updates.phone_number = body.phone_number != null
        ? stripHtml((body.phone_number as string).trim()) || null
        : null
    }
    if (body.is_default !== undefined) {
      if (typeof body.is_default !== 'boolean') {
        return NextResponse.json({ error: 'is_default must be a boolean' }, { status: 400 })
      }
      updates.is_default = body.is_default
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // If marking this address as default, clear other defaults first.
    if (updates.is_default === true) {
      await clearPreviousDefault(piUid, addressId)
    }

    const { data: address, error } = await supabaseAdmin
      .from('saved_addresses')
      .update(updates)
      .eq('id', addressId)
      .eq('user_id', piUid)
      .select()
      .single()

    if (error) {
      console.error('[users/addresses/PUT] Update error:', error)
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
    }

    return NextResponse.json({ address })
  } catch (err) {
    console.error('[users/addresses/PUT] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
