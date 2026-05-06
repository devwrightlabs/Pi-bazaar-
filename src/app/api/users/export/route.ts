/**
 * GET /api/users/export — Export a user's orders and escrow transactions as CSV.
 *
 * Security:
 *   - Caller identity is extracted from the verified custom JWT.
 *   - Only data belonging to the authenticated user is returned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── CSV helpers ──────────────────────────────────────────────────────────────

/** Escape a single CSV field value (handles commas, quotes, newlines). */
function csvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Convert an array of objects to CSV rows using the provided column keys. */
function toCSVRows(rows: Record<string, unknown>[], columns: string[]): string {
  return rows
    .map((row) => columns.map((col) => csvField(row[col])).join(','))
    .join('\n')
}

// ─── GET /api/users/export ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // ── Fetch orders ──────────────────────────────────────────────────────
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id,listing_id,offer_price,status,payment_confirmed,escrow_released,created_at')
      .eq('buyer_id', piUid)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('[users/export/GET] Orders fetch error:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // ── Fetch escrow transactions ─────────────────────────────────────────
    const { data: escrowBuyer, error: escrowBuyerError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id,product_id,buyer_id,seller_id,amount_pi,status,shipping_method,created_at')
      .eq('buyer_id', piUid)

    if (escrowBuyerError) {
      console.error('[users/export/GET] Escrow buyer fetch error:', escrowBuyerError)
      return NextResponse.json({ error: 'Failed to fetch escrow data' }, { status: 500 })
    }

    const { data: escrowSeller, error: escrowSellerError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id,product_id,buyer_id,seller_id,amount_pi,status,shipping_method,created_at')
      .eq('seller_id', piUid)

    if (escrowSellerError) {
      console.error('[users/export/GET] Escrow seller fetch error:', escrowSellerError)
      return NextResponse.json({ error: 'Failed to fetch escrow data' }, { status: 500 })
    }

    // Merge and deduplicate escrow records (user might be both buyer and seller)
    const escrowMap = new Map<string, Record<string, unknown>>()
    for (const tx of [...(escrowBuyer ?? []), ...(escrowSeller ?? [])]) {
      escrowMap.set((tx as Record<string, unknown>).id as string, tx as Record<string, unknown>)
    }
    const escrow = Array.from(escrowMap.values())

    // ── Build CSV ─────────────────────────────────────────────────────────
    const orderColumns = [
      'id', 'listing_id', 'offer_price', 'status',
      'payment_confirmed', 'escrow_released', 'created_at',
    ]
    const escrowColumns = [
      'id', 'product_id', 'buyer_id', 'seller_id',
      'amount_pi', 'status', 'shipping_method', 'created_at',
    ]

    const parts: string[] = []

    // Orders section
    parts.push('# Orders')
    parts.push(orderColumns.join(','))
    if ((orders ?? []).length > 0) {
      parts.push(toCSVRows(orders as Record<string, unknown>[], orderColumns))
    }

    // Blank line separator
    parts.push('')

    // Escrow section
    parts.push('# Escrow Transactions')
    parts.push(escrowColumns.join(','))
    if (escrow.length > 0) {
      parts.push(toCSVRows(escrow, escrowColumns))
    }

    const csv = parts.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pibazaar-export.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[users/export/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
