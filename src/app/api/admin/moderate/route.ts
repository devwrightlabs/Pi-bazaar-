/**
 * POST /api/admin/moderate
 *
 * Executes administrative moderation actions on the marketplace.
 *
 * Supported actions:
 *   - suspend_user   — Sets is_suspended = true on the target user
 *   - unsuspend_user — Sets is_suspended = false on the target user
 *   - hide_product   — Sets status = 'suspended' on the target product
 *   - unhide_product — Sets status = 'active' on the target product
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body).
 *   - The caller's role is verified as 'admin' via a DB lookup using
 *     supabaseAdmin before any mutation is executed.
 *   - All DB writes use supabaseAdmin (service role) which bypasses RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModerationAction = 'suspend_user' | 'unsuspend_user' | 'hide_product' | 'unhide_product'

const VALID_ACTIONS: ReadonlySet<ModerationAction> = new Set([
  'suspend_user',
  'unsuspend_user',
  'hide_product',
  'unhide_product',
])

interface ModerateRequestBody {
  action?: unknown
  target_id?: unknown
}

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

// ─── POST /api/admin/moderate ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

    // 3. Parse and validate request body.
    let body: ModerateRequestBody
    try {
      body = (await req.json()) as ModerateRequestBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, target_id } = body

    if (
      typeof action !== 'string' ||
      !VALID_ACTIONS.has(action as ModerationAction)
    ) {
      return NextResponse.json(
        {
          error: `Invalid action. Must be one of: ${[...VALID_ACTIONS].join(', ')}`,
        },
        { status: 400 },
      )
    }

    if (typeof target_id !== 'string' || !isValidUuid(target_id)) {
      return NextResponse.json(
        { error: 'target_id must be a valid UUID' },
        { status: 400 },
      )
    }

    // 4. Execute the moderation action.
    switch (action as ModerationAction) {
      case 'suspend_user': {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ is_suspended: true })
          .eq('id', target_id)

        if (error) {
          console.error('[admin/moderate] suspend_user error:', error)
          return NextResponse.json(
            { error: 'Failed to suspend user' },
            { status: 500 },
          )
        }

        return NextResponse.json({
          success: true,
          action: 'suspend_user',
          target_id,
        })
      }

      case 'unsuspend_user': {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ is_suspended: false })
          .eq('id', target_id)

        if (error) {
          console.error('[admin/moderate] unsuspend_user error:', error)
          return NextResponse.json(
            { error: 'Failed to unsuspend user' },
            { status: 500 },
          )
        }

        return NextResponse.json({
          success: true,
          action: 'unsuspend_user',
          target_id,
        })
      }

      case 'hide_product': {
        const { error } = await supabaseAdmin
          .from('products')
          .update({ status: 'suspended' })
          .eq('id', target_id)

        if (error) {
          console.error('[admin/moderate] hide_product error:', error)
          return NextResponse.json(
            { error: 'Failed to hide product' },
            { status: 500 },
          )
        }

        return NextResponse.json({
          success: true,
          action: 'hide_product',
          target_id,
        })
      }

      case 'unhide_product': {
        const { error } = await supabaseAdmin
          .from('products')
          .update({ status: 'active' })
          .eq('id', target_id)

        if (error) {
          console.error('[admin/moderate] unhide_product error:', error)
          return NextResponse.json(
            { error: 'Failed to unhide product' },
            { status: 500 },
          )
        }

        return NextResponse.json({
          success: true,
          action: 'unhide_product',
          target_id,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[admin/moderate] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
