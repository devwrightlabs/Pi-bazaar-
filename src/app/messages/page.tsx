import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ChatThreadRow } from '@/types/database'

/**
 * Messages List Page (Server Component)
 *
 * Fetches and displays the user's active chat_threads using @supabase/ssr.
 * This is a Server Component for optimal performance and SEO.
 */
export default async function MessagesPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: threads, error } = await (supabase as any)
    .from('chat_threads')
    .select('*')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch chat threads:', error)
  }

  const chatThreads = (threads as ChatThreadRow[]) ?? []

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Messages
          </h1>
          <Link href="/marketplace">
            <button
              className="px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
            >
              Browse Listings
            </button>
          </Link>
        </div>

        {chatThreads.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl"
              style={{ backgroundColor: 'var(--color-card-bg)' }}
            >
              💬
            </div>
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              No Messages Yet
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Start a conversation with a seller or buyer
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatThreads.map((thread) => {
              const otherUserId =
                thread.buyer_id === user.id ? thread.seller_id : thread.buyer_id
              const role = thread.buyer_id === user.id ? 'Seller' : 'Buyer'

              return (
                <Link key={thread.id} href={`/messages/${thread.id}`}>
                  <div
                    className="rounded-xl p-4 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ backgroundColor: 'var(--color-card-bg)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-gold)' }}
                      >
                        <span className="text-black font-bold">
                          {otherUserId.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className="font-semibold text-sm"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {role}
                          </p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: 'rgba(240,192,64,0.2)',
                              color: 'var(--color-gold)',
                            }}
                          >
                            {role === 'Seller' ? 'Buying' : 'Selling'}
                          </span>
                        </div>
                        <p
                          className="text-xs truncate"
                          style={{ color: 'var(--color-subtext)' }}
                        >
                          User ID: {otherUserId.slice(0, 8)}...
                        </p>
                        {thread.listing_id && (
                          <p
                            className="text-xs mt-1"
                            style={{ color: 'var(--color-subtext)' }}
                          >
                            Listing: {thread.listing_id.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xl" style={{ color: 'var(--color-gold)' }}>
                          →
                        </span>
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
