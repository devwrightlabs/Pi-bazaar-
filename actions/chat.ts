'use server'

/**
 * Server Actions for Chat
 *
 * These actions handle message insertion on the server side.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database, MessageInsert } from '@/types/database'

async function getServerSupabaseClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll called from a Server Component
        }
      },
    },
  })
}

export async function insertMessage(message: MessageInsert): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getServerSupabaseClient()

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }

    // Insert message
    const { error } = await supabase
      .from('messages')
      .insert({
        thread_id: message.thread_id,
        sender_id: message.sender_id,
        content: message.content,
        is_read: message.is_read,
      })

    if (error) {
      console.error('[insertMessage] Error:', error)
      return { success: false, error: 'Failed to insert message' }
    }

    return { success: true }
  } catch (error) {
    console.error('[insertMessage] Unhandled error:', error)
    return { success: false, error: 'An error occurred' }
  }
}
