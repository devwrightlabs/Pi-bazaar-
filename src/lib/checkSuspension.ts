/**
 * checkSuspension — Server-side helper
 *
 * Checks whether a seller currently has an active suspension.
 * Used by API routes before allowing seller actions.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function checkSuspension(
  pi_uid: string
): Promise<{ suspended: boolean; reason?: string }> {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('seller_suspensions')
      .select('id, reason, expires_at')
      .eq('seller_pi_uid', pi_uid)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[checkSuspension] Query error:', error)
      // Fail open — don't block user if DB check fails
      return { suspended: false }
    }

    if (!data) {
      return { suspended: false }
    }

    return { suspended: true, reason: data.reason ?? undefined }
  } catch (err) {
    console.error('[checkSuspension] Unhandled error:', err)
    return { suspended: false }
  }
}
