/**
 * POST /api/kyc/submit
 *
 * Allows an authenticated user to submit KYC (Know Your Customer) documents
 * for identity verification.
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body).
 *   - All DB writes use supabaseAdmin (service role) to bypass RLS; the
 *     caller's pi_uid is enforced explicitly in the insert.
 *   - The user's is_kyc_verified flag is set to false until an admin approves.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'

// ─── Allowed document types ───────────────────────────────────────────────────

const ALLOWED_DOCUMENT_TYPES = ['passport', 'national_id', 'drivers_license'] as const
type DocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number]

function isValidDocumentType(value: string): value is DocumentType {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(value)
}

// ─── Request body ─────────────────────────────────────────────────────────────

interface KycSubmitRequest {
  document_type: string
  document_url: string
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller via custom JWT.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const piUid = auth.pi_uid

    // 2. Parse and validate request body.
    let body: KycSubmitRequest
    try {
      body = (await req.json()) as KycSubmitRequest
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { document_type, document_url } = body

    if (!document_type || typeof document_type !== 'string') {
      return NextResponse.json({ error: 'document_type is required' }, { status: 400 })
    }

    if (!isValidDocumentType(document_type)) {
      return NextResponse.json(
        { error: `Invalid document_type. Allowed: ${ALLOWED_DOCUMENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!document_url || typeof document_url !== 'string') {
      return NextResponse.json({ error: 'document_url is required' }, { status: 400 })
    }

    // Basic URL format validation — must start with https://
    if (!document_url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'document_url must be a valid HTTPS URL' },
        { status: 400 }
      )
    }

    // 3. Insert a pending KYC record.
    //    The UNIQUE constraint on user_id prevents duplicate submissions.
    const { data: kycRecord, error: submitError } = await supabaseAdmin.rpc(
      'submit_kyc_and_mark_user_unverified',
      {
        p_user_id: piUid,
        p_document_type: document_type,
        p_document_url: document_url,
      }
    )

    if (submitError) {
      // Unique violation — user already has a KYC record
      if (submitError.code === '23505') {
        return NextResponse.json(
          { error: 'A KYC submission already exists for this user' },
          { status: 409 }
        )
      }
      // Foreign-key violation — authenticated user has no corresponding users row
      if (submitError.code === '23503') {
        return NextResponse.json(
          { error: 'User record not found for this authenticated user' },
          { status: 404 }
        )
      }
      console.error('[kyc/submit] Transactional KYC submit error:', submitError)
      return NextResponse.json({ error: 'Failed to submit KYC record' }, { status: 500 })
    }
    return NextResponse.json(
      {
        success: true,
        kyc: kycRecord,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[kyc/submit] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
