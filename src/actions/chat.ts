'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Simple HTML sanitization for message content
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Server Action: Send Message
 *
 * Safely inserts a new message into the messages table using @supabase/ssr.
 * Includes XSS protection via input sanitization.
 */
export async function sendMessage(threadId: string, content: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized: User must be logged in to send messages')
  }

  const sanitizedContent = stripHtml(content.trim())

  if (!sanitizedContent) {
    throw new Error('Message content cannot be empty')
  }

  if (sanitizedContent.length > 2000) {
    throw new Error('Message content cannot exceed 2000 characters')
  }

  const newMessage = {
    thread_id: threadId,
    sender_id: user.id,
    content: sanitizedContent,
    is_read: false,
  }

  const { error } = await supabase.from('messages').insert(newMessage as any)

  if (error) {
    console.error('Failed to insert message:', error)
    throw new Error('Failed to send message')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  return { success: true }
}

/**
 * Server Action: Mark Messages as Read
 *
 * Updates all unread messages in a thread for the current user.
 */
export async function markMessagesAsRead(threadId: string) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .eq('is_read', false)
    .neq('sender_id', user.id)

  if (error) {
    console.error('Failed to mark messages as read:', error)
    throw new Error('Failed to mark messages as read')
  }

  return { success: true }
}
