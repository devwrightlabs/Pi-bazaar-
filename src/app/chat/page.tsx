'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Conversation } from '@/lib/types'
import ConversationCard from '@/components/ConversationCard'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useStore } from '@/store/useStore'

export default function ChatPage() {
  const { currentUser } = useStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${currentUser.id},participant_2.eq.${currentUser.id}`)
      .order('last_message_at', { ascending: false })
    if (fetchError) {
      console.error('Failed to fetch conversations:', fetchError)
      setError('Failed to load conversations. Please try again.')
    } else {
      setConversations((data as Conversation[]) ?? [])
    }
    setLoading(false)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }
    void fetchConversations()

    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_1=eq.${currentUser.id}`,
        },
        () => { void fetchConversations() }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [currentUser, fetchConversations])

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
          >
            Messages
          </h1>
          <Link href="/chat/new">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              aria-label="New message"
            >
              +
            </button>
          </Link>
        </div>
        <ErrorBoundary>
          {!currentUser ? (
            <div className="text-center py-16">
              
              <p style={{ color: 'var(--color-subtext)' }}>Connect your Pi Wallet to access messages</p>
              <Link href="/profile">
                <button
                  className="mt-4 px-6 py-3 rounded-xl font-semibold"
                  style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
                >
                  Go to Profile
                </button>
              </Link>
            </div>
          ) : loading ? (
            <LoadingSkeleton rows={5} />
          ) : error ? (
            <div className="text-center py-16">
              
              <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Something went wrong
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
                {error}
              </p>
              <button
                onClick={() => void fetchConversations()}
                className="px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                Try Again
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              
              <p style={{ color: 'var(--color-subtext)' }}>No conversations yet</p>
              <Link href="/chat/new">
                <button
                  className="mt-4 px-6 py-3 rounded-xl font-semibold"
                  style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
                >
                  Start a Conversation
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => {
                const otherUserId =
                  conv.participant_1 === currentUser.id ? conv.participant_2 : conv.participant_1
                return (
                  <ConversationCard
                    key={conv.id}
                    conversation={conv}
                    otherUserName={otherUserId}
                  />
                )
              })}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </main>
  )
}
