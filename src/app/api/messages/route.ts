/**
 * GET  /api/messages  — Fetch conversation between two users
 * POST /api/messages  — Send a message
 *
 * Security:
 *   - Caller identity is extracted from the verified JWT (never trusted from
 *     the request body or query params).
 *   - All DB operations use supabaseAdmin (service role) to bypass RLS.
 *   - Receiver existence is verified server-side before inserting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAuthToken } from '@/lib/authHelper'
import { stripHtml } from '@/lib/sanitize'
import type { SendMessageRequest, ConversationResponse, MessageRecord } from '@/types/messaging'

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

// ─── GET /api/messages ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate caller.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const myPiUid = auth.pi_uid

    // 2. Parse and validate query parameters.
    const { searchParams } = req.nextUrl
    const otherPiUid = searchParams.get('user_id')
    const productId = searchParams.get('product_id')

    if (!otherPiUid) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }
    if (otherPiUid === myPiUid) {
      return NextResponse.json({ error: 'user_id must not be your own user ID' }, { status: 400 })
    }
    if (productId && !isValidUuid(productId)) {
      return NextResponse.json({ error: 'product_id must be a valid UUID' }, { status: 400 })
    }

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50))
    const offset = (page - 1) * limit

    // 3. Build the messages query — fetch both directions of the conversation.
    let query = supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact' })
      .or(
        `and(sender_id.eq.${myPiUid},receiver_id.eq.${otherPiUid}),` +
        `and(sender_id.eq.${otherPiUid},receiver_id.eq.${myPiUid})`
      )
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data: messages, error: fetchError, count } = await query

    if (fetchError) {
      console.error('[messages/GET] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // 4. Mark incoming unread messages as read before returning so the update
    //    is not lost in serverless runtimes.
    let markReadQuery = supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherPiUid)
      .eq('receiver_id', myPiUid)
      .eq('is_read', false)

    if (productId) {
      markReadQuery = markReadQuery.eq('product_id', productId)
    }

    const { error: markReadError } = await markReadQuery
    if (markReadError) {
      console.error('[messages/GET] Mark-read error:', markReadError)
    }
    const total = count ?? 0
    const response: ConversationResponse = {
      messages: (messages ?? []) as MessageRecord[],
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[messages/GET] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/messages ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate sender.
    const auth = verifyAuthToken(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const senderPiUid = auth.pi_uid

    // 2. Parse and validate request body.
    const body = (await req.json()) as SendMessageRequest
    const { receiver_id, content, product_id } = body

    if (!receiver_id) {
      return NextResponse.json({ error: 'receiver_id is required' }, { status: 400 })
    }
    if (receiver_id === senderPiUid) {
      return NextResponse.json({ error: 'You cannot send a message to yourself' }, { status: 400 })
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }
    const trimmedContent = stripHtml(content)
    if (trimmedContent.length === 0) {
      return NextResponse.json({ error: 'content must not be empty' }, { status: 400 })
    }
    if (trimmedContent.length > 2000) {
      return NextResponse.json({ error: 'content must be at most 2000 characters' }, { status: 400 })
    }
    if (product_id !== undefined && !isValidUuid(product_id)) {
      return NextResponse.json({ error: 'product_id must be a valid UUID' }, { status: 400 })
    }

    // 3. Verify the receiver exists.
    const { data: receiver, error: receiverError } = await supabaseAdmin
      .from('users')
      .select('pi_uid')
      .eq('pi_uid', receiver_id)
      .single()

    if (receiverError || !receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
    }

    // 4. If product_id provided, verify the product exists.
    if (product_id) {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', product_id)
        .single()

      if (productError || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
    }

    // 5. Insert the message.
    const { data: message, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: senderPiUid,
        receiver_id,
        content: trimmedContent,
        product_id: product_id ?? null,
        is_read: false,
      })
      .select()
      .single()

    if (insertError || !message) {
      console.error('[messages/POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    console.error('[messages/POST] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
