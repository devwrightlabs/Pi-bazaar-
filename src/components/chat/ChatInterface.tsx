'use client'

/**
 * ChatInterface — Full-screen mobile chat UI with Supabase Realtime
 *
 * Features:
 *   • Realtime message subscription via Supabase postgres_changes
 *   • Read receipts (double-check marks)
 *   • Typing indicators (bouncing dots)
 *   • Auto-scroll on new messages
 *   • Mobile-first, responsive (min 320 px)
 *   • All colours via CSS custom properties
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { Message } from '@/lib/types'
import ChatBubble from '@/components/ChatBubble'
import ChatInput from '@/components/ChatInput'
import TypingIndicator from '@/components/TypingIndicator'
import ReadReceipt from '@/components/ReadReceipt'

/* ─── Props ──────────────────────────────────────────────────────────────── */

interface ChatInterfaceProps {
  /** chat_threads.id */
  threadId: string
  /** Display name of the other participant */
  otherUserName?: string
  /** Called when the user taps the back arrow */
  onBack?: () => void
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ChatInterface({
  threadId,
  otherUserName = 'Chat',
  onBack,
}: ChatInterfaceProps) {
  const {
    currentUser,
    messages: storeMessages,
    setMessages,
    addMessage,
  } = useStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remoteTyping, setRemoteTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const msgs: Message[] = storeMessages[threadId] ?? []

  /* ── Scroll helper ─────────────────────────────────────────────────────── */

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  /* ── Load initial messages + subscribe ─────────────────────────────────── */

  useEffect(() => {
    if (!threadId || !currentUser) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseClient()

    const loadMessages = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchErr } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })

        if (fetchErr) {
          throw new Error(fetchErr.message)
        }

        const mapped: Message[] = (data ?? []).map((row) => ({
          id: row.id as string,
          conversation_id: threadId,
          sender_id: row.sender_id as string,
          content: row.content as string,
          is_read: row.is_read as boolean,
          created_at: row.created_at as string,
        }))

        setMessages(threadId, mapped)

        // Mark unread messages from the other user as read
        await supabase
          .from('messages')
          .update({ is_read: true } as never)
          .eq('thread_id', threadId)
          .neq('sender_id', currentUser.id)
          .eq('is_read', false)
      } catch (err) {
        console.error('[ChatInterface] loadMessages error:', err)
        setError('Could not load messages. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    void loadMessages()

    /* ── Realtime subscription for new messages ──────────────────────────── */

    const channel = supabase
      .channel(`chat-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const newMsg: Message = {
            id: row.id as string,
            conversation_id: threadId,
            sender_id: row.sender_id as string,
            content: row.content as string,
            is_read: row.is_read as boolean,
            created_at: row.created_at as string,
          }
          addMessage(threadId, newMsg)
          scrollToBottom()

          // Auto-mark as read if the message is from the other user
          if (newMsg.sender_id !== currentUser.id) {
            void supabase
              .from('messages')
              .update({ is_read: true } as never)
              .eq('id', newMsg.id)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          // Update read receipt in local state
          const updatedMessages = (storeMessages[threadId] ?? []).map((m) =>
            m.id === (row.id as string) ? { ...m, is_read: row.is_read as boolean } : m,
          )
          setMessages(threadId, updatedMessages)
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const othersTyping = Object.values(state).some((presences) =>
          (presences as unknown as Array<{ user_id: string; is_typing: boolean }>).some(
            (p) => p.user_id !== currentUser.id && p.is_typing,
          ),
        )
        setRemoteTyping(othersTyping)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            is_typing: false,
          })
        }
      })

    return () => {
      void supabase.removeChannel(channel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, currentUser?.id])

  /* ── Auto-scroll when messages change ──────────────────────────────────── */

  useEffect(() => {
    scrollToBottom()
  }, [msgs.length, scrollToBottom])

  /* ── Send message ──────────────────────────────────────────────────────── */

  const handleSend = useCallback(
    async (content: string) => {
      if (!currentUser || !threadId) return
      try {
        const supabase = getSupabaseClient()
        const { error: insertErr } = await supabase.from('messages').insert({
          thread_id: threadId,
          sender_id: currentUser.id,
          content,
          is_read: false,
        } as never)

        if (insertErr) {
          throw new Error(insertErr.message)
        }
      } catch (err) {
        console.error('[ChatInterface] send error:', err)
        setError('Failed to send message. Please try again.')
      }
    },
    [currentUser, threadId],
  )

  /* ── Typing broadcast ──────────────────────────────────────────────────── */

  const typingChannelRef = useRef<
    ReturnType<ReturnType<typeof getSupabaseClient>['channel']> | null
  >(null)
  const typingChannelKeyRef = useRef<string | null>(null)

  const clearTypingChannel = useCallback(() => {
    if (!typingChannelRef.current) return

    const supabase = getSupabaseClient()
    void supabase.removeChannel(typingChannelRef.current)
    typingChannelRef.current = null
    typingChannelKeyRef.current = null
  }, [])

  const getTypingChannel = useCallback(async () => {
    if (!threadId) return null

    const channelKey = `chat-${threadId}`

    if (
      typingChannelRef.current &&
      typingChannelKeyRef.current === channelKey
    ) {
      return typingChannelRef.current
    }

    clearTypingChannel()

    const supabase = getSupabaseClient()
    const channel = supabase.channel(channelKey)

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve()
          return
        }

        if (
          status === 'CLOSED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          reject(new Error(`Typing channel failed with status: ${status}`))
        }
      })
    })

    typingChannelRef.current = channel
    typingChannelKeyRef.current = channelKey

    return channel
  }, [clearTypingChannel, threadId])

  useEffect(() => {
    return () => {
      clearTypingChannel()
    }
  }, [clearTypingChannel, threadId])

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (!currentUser || !threadId) return

      void (async () => {
        try {
          const channel = await getTypingChannel()
          if (!channel) return

          await channel.track({ user_id: currentUser.id, is_typing: isTyping })
        } catch (err) {
          console.error('[ChatInterface] typing presence error:', err)
        }
      })()
    },
    [currentUser, getTypingChannel, threadId],
  )

  /* ── Render ────────────────────────────────────────────────────────────── */

  if (!currentUser) {
    return (
      <div
        className="flex items-center justify-center min-h-screen min-w-[320px]"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <p style={{ color: 'var(--color-subtext)' }}>Sign in to start chatting.</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-screen min-w-[320px]"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-secondary-bg)',
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ backgroundColor: 'var(--color-control-bg)' }}
            aria-label="Go back"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-gold)' }}
        >
          <span className="font-bold text-black text-sm">
            {otherUserName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm truncate"
            style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}
          >
            {otherUserName}
          </p>
          {remoteTyping && (
            <p className="text-[11px]" style={{ color: 'var(--color-gold)' }}>
              typing…
            </p>
          )}
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: 'var(--color-subtext)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : error && msgs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm mb-3" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
            >
              Retry
            </button>
          </div>
        ) : msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Start the conversation
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Say hello to {otherUserName}!
            </p>
          </div>
        ) : (
          <>
            {msgs.map((msg, idx) => {
              const isOwn = msg.sender_id === currentUser.id
              const isLastOwn =
                isOwn &&
                (idx === msgs.length - 1 || msgs[idx + 1]?.sender_id !== currentUser.id)
              return (
                <div key={msg.id}>
                  <ChatBubble message={msg} isOwn={isOwn} />
                  {isLastOwn && (
                    <div className="flex justify-end mb-2 -mt-1 pr-1">
                      <ReadReceipt isRead={msg.is_read} />
                    </div>
                  )}
                </div>
              )
            })}
            {remoteTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Error toast ───────────────────────────────────────────────────── */}
      {error && msgs.length > 0 && (
        <div
          className="mx-4 mb-2 px-4 py-2 rounded-xl text-xs text-center"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <ChatInput onSend={(c) => void handleSend(c)} onTyping={handleTyping} />
    </div>
  )
}
