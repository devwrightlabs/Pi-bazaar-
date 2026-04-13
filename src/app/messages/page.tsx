/**
 * Messages Page - Server Component
 *
 * This page fetches the user's active chat_threads on the server.
 * It uses @supabase/ssr createServerClient for server-side data fetching.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { Database, ChatThreadRow } from '@/types/database'

async function getServerSupabaseClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
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

export default async function MessagesPage() {
  // Get authenticated user from session
  const supabase = await getServerSupabaseClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--color-subtext)' }}>Please log in to view messages</p>
          <Link href="/login">
            <button
              className="mt-4 px-6 py-3 rounded-xl font-semibold"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
            >
              Log In
            </button>
          </Link>
        </div>
      </main>
    )
  }

  const userId = session.user.id

  // Fetch chat threads where user is either buyer or seller
  const { data: chatThreads, error } = await supabase
    .from('chat_threads')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('id', { ascending: false })

  if (error) {
    console.error('[messages] Error fetching chat threads:', error)
  }

  const threads = (chatThreads as unknown as ChatThreadRow[]) || []

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Messages
          </h1>
        </div>

        {threads.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: 'var(--color-subtext)' }}>No conversations yet</p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-subtext)' }}>
              Start chatting with sellers or buyers
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => {
              const otherUserId = thread.buyer_id === userId ? thread.seller_id : thread.buyer_id
              return (
                <Link key={thread.id} href={`/messages/${thread.id}`}>
                  <div
                    className="p-4 rounded-xl border transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-card-bg)',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-gold)' }}
                      >
                        <span className="text-black font-bold">
                          {otherUserId.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                          Chat #{thread.id.slice(0, 8)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                          Listing: {thread.listing_id.slice(0, 8)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xl" style={{ color: 'var(--color-gold)' }}>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
