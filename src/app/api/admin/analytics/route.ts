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
    const [revenueResult, disputesResult, kycResult, productsResult] =
      await Promise.all([
        // Total platform revenue (sum of all collected fees)
        supabaseAdmin
          .from('platform_revenue')
          .select('amount_pi'),

        // Active disputes (escrow transactions with status = 'disputed')
        supabaseAdmin
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'disputed'),

        // Pending KYC applications (users with kyc_status = 'pending')
        // Note: KYC table may not exist yet — handle gracefully.
        supabaseAdmin
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('kyc_status' as string, 'pending'),

        // Total active products
        supabaseAdmin
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
      ])

    // 4. Calculate total revenue from the returned rows.
    let totalRevenuePi = 0
    if (!revenueResult.error && revenueResult.data) {
      totalRevenuePi = revenueResult.data.reduce(
        (sum, row) => sum + Number(row.amount_pi),
        0,
      )
    }

    // 5. Assemble and return the dashboard metrics.
    return NextResponse.json({
      total_revenue_pi: totalRevenuePi,
      active_disputes: disputesResult.count ?? 0,
      pending_kyc: kycResult.count ?? 0,
      active_products: productsResult.count ?? 0,
    })
  } catch (err) {
    console.error('[admin/analytics] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
