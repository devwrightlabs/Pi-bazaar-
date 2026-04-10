/**
 * GET /api/admin/analytics
 *
 * Returns key marketplace metrics for the admin dashboard.
 *
 * Metrics returned:
 *   - total_revenue_pi    — Sum of all collected platform fees (π)
 *   - active_disputes      — Number of escrow transactions in 'disputed' status
 *   - pending_kyc          — Number of users with pending KYC verification
 *   - active_products      — Number of products currently listed as 'active'
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body or query params).
 *   - The caller's role is verified as 'admin' via a DB lookup using
 *     supabaseAdmin before any data is returned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── GET /api/admin/analytics ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate caller via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify the caller has the 'admin' role.
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('pi_uid', auth.pi_uid)
      .single()

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Fetch all metrics concurrently for performance.
    const [revenueResult, disputesResult, productsResult] =
      await Promise.all([
        // Total platform revenue (server-side aggregation via RPC)
        supabaseAdmin.rpc('get_total_platform_revenue'),

        // Active disputes (escrow transactions with status = 'disputed')
        supabaseAdmin
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'disputed'),

        // Total active listings
        supabaseAdmin
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .is('deleted_at', null),
      ])

    if (revenueResult.error || disputesResult.error || productsResult.error) {
      console.error('[admin/analytics] Failed to load metrics:', {
        revenueError: revenueResult.error,
        disputesError: disputesResult.error,
        productsError: productsResult.error,
      })
      return NextResponse.json(
        { error: 'Failed to load analytics metrics' },
        { status: 500 }
      )
    }
    // 4. Assemble and return the dashboard metrics.
    // TODO: Replace pending_kyc with actual KYC query when table is created.
    // The KYC table has not been created yet (planned for a future phase).
    // Once available, this metric will query KYC applications with
    // status = 'pending'.
    return NextResponse.json({
      total_revenue_pi: Number(revenueResult.data) || 0,
      active_disputes: disputesResult.count ?? 0,
      pending_kyc: 0,
      active_products: productsResult.count ?? 0,
    })
  } catch (err) {
    console.error('[admin/analytics] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
