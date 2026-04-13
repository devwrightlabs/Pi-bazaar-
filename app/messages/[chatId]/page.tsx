'use client'

/**
 * Chat Room Page - Client Component with Realtime
 *
 * This page implements real-time messaging using Supabase Realtime.
 * It subscribes to postgres_changes on the messages table.
 */

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database, MessageRow } from '@/types/database'
import { insertMessage } from '@/actions/chat'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export default function ChatRoomPage({ params }: { params: { chatId: string } }) {
  const { chatId } = params
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Load initial messages
    const loadMessages = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Please log in to view messages')
          setLoading(false)
          return
        }

        setUserId(session.user.id)

        // Fetch messages for this thread
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', chatId)
          .order('created_at', { ascending: true })

        if (fetchError) {
          console.error('[chat] Error fetching messages:', fetchError)
          setError('Failed to load messages')
        } else {
          setMessages(data || [])

          // Mark messages as read
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('thread_id', chatId)
            .neq('sender_id', session.user.id)
            .eq('is_read', false)
        }
      } catch (err) {
        console.error('[chat] Error:', err)
        setError('An error occurred')
      } finally {
        setLoading(false)
      }
    }

    void loadMessages()

    // Subscribe to new messages using Realtime
    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageRow
          setMessages((prev) => [...prev, newMsg])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !userId) return

    setSending(true)
    setError(null)

    try {
      // Use Server Action to insert message
      const result = await insertMessage({
        thread_id: chatId,
        sender_id: userId,
        content: newMessage.trim(),
        is_read: false,
      })

      if (!result.success) {
        setError(result.error || 'Failed to send message')
      } else {
        setNewMessage('')
      }
    } catch (err) {
      console.error('[chat] Send error:', err)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-subtext)' }}>Loading...</p>
      </main>
    )
  }

  if (error && !userId) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--color-subtext)' }}>{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          Chat #{chatId.slice(0, 8)}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: 'var(--color-subtext)' }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === userId
              return (
                <div
                  key={msg.id}
                  className={`mb-3 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[75%] px-4 py-2 rounded-xl"
                    style={{
                      backgroundColor: isOwn ? 'var(--color-gold)' : 'var(--color-card-bg)',
                      color: isOwn ? '#000' : 'var(--color-text)',
                    }}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className="text-xs mt-1"
                      style={{ opacity: 0.7 }}
                    >
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {error && (
          <div className="mb-2 p-2 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}
        <form onSubmit={(e) => void handleSend(e)} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl outline-none"
            style={{
              backgroundColor: 'var(--color-card-bg)',
              color: 'var(--color-text)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-3 rounded-xl font-semibold"
            style={{
              backgroundColor: 'var(--color-gold)',
              color: '#000',
              opacity: sending || !newMessage.trim() ? 0.5 : 1,
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </main>
  )
}
