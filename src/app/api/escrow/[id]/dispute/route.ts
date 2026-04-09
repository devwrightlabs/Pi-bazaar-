import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { stripHtml } from '@/lib/sanitize'
import type { EscrowTimelineEvent } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    // 1. Authenticate the caller.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const callerPiUid = auth.pi_uid

    const { id } = await params
    const body = (await req.json()) as {
      reason: string
      description: string
      evidence_urls?: string[]
    }

    if (!body.reason || typeof body.reason !== 'string') {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 })
    }
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    const reason = stripHtml(body.reason.trim())
    const description = stripHtml(body.description.trim())

    if (!reason) {
      return NextResponse.json({ error: 'reason must not be empty' }, { status: 400 })
    }
    if (!description) {
      return NextResponse.json({ error: 'description must not be empty' }, { status: 400 })
    }
    if (reason.length > 500) {
      return NextResponse.json({ error: 'reason must not exceed 500 characters' }, { status: 400 })
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: 'description must not exceed 5000 characters' }, { status: 400 })
    }

    // Validate evidence_urls if provided
    if (body.evidence_urls !== undefined) {
      if (!Array.isArray(body.evidence_urls)) {
        return NextResponse.json({ error: 'evidence_urls must be an array' }, { status: 400 })
      }
      if (body.evidence_urls.length > 10) {
        return NextResponse.json({ error: 'evidence_urls must not exceed 10 items' }, { status: 400 })
      }
      for (const url of body.evidence_urls) {
        if (typeof url !== 'string') {
          return NextResponse.json({ error: 'each evidence_url must be a string' }, { status: 400 })
        }
        try {
          const parsed = new URL(url)
          if (parsed.protocol !== 'https:') {
            return NextResponse.json({ error: 'evidence_urls must use HTTPS' }, { status: 400 })
          }
        } catch {
          return NextResponse.json({ error: 'each evidence_url must be a valid URL' }, { status: 400 })
        }
      }
    }

    // 2. Fetch the escrow and verify the caller is a participant.
    const { data: escrow, error: fetchError } = await supabaseAdmin
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    if (escrow.buyer_id !== callerPiUid && escrow.seller_id !== callerPiUid) {
      return NextResponse.json({ error: 'Only a buyer or seller can open a dispute' }, { status: 403 })
    }

    // 3. Update the escrow status.
    const { error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'disputed',
        dispute_reason: reason,
      })
      .eq('id', id)

    if (error) {
      console.error('Dispute update error:', error)
      return NextResponse.json({ error: 'Failed to open dispute' }, { status: 500 })
    }

    const evidenceSummary = body.evidence_urls?.length
      ? ` Evidence: ${body.evidence_urls.join(', ')}`
      : ''

    await supabaseAdmin.from('escrow_timeline').insert({
      escrow_id: id,
      event: 'disputed',
      description: `Dispute opened: ${reason}. ${description}${evidenceSummary}`,
    } as Omit<EscrowTimelineEvent, 'id' | 'created_at'>)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/escrow/[id]/dispute error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
