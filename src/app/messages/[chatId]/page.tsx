'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { sendMessage } from '@/actions/chat'
import type { MessageRow } from '@/types/database'

/**
 * Chat Window Page (Client Component)
 *
 * Displays messages for a specific chat thread with Supabase Realtime.
 * CRUCIAL: Includes real-time subscription for instant message updates.
 */
export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const chatId = params.chatId as string

  const [messages, setMessages] = useState<MessageRow[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const initChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('thread_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch messages:', error)
      } else {
        setMessages((data as MessageRow[]) ?? [])
      }

      setLoading(false)
    }

    void initChat()
  }, [chatId, router])

  useEffect(() => {
    if (!userId) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${chatId}`,
        },
        (payload: { new: MessageRow }) => {
          const newMsg = payload.new
          setMessages((prev) => [...prev, newMsg])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [chatId, userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !userId || sending) return

    setSending(true)

    try {
      await sendMessage(chatId, newMessage.trim())
      setNewMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="text-center">
          <div className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-gold)' }} />
          <p className="mt-2" style={{ color: 'var(--color-subtext)' }}>
            Loading messages...
          </p>
        </div>
      </div>
    )
  }

  return (
    <main
      className="flex flex-col h-screen"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'var(--color-secondary-bg)',
        }}
      >
        <button
          onClick={() => router.push('/messages')}
          className="text-2xl"
          style={{ color: 'var(--color-gold)' }}
          aria-label="Back to messages"
        >
          ←
        </button>
        <div>
          <p
            className="font-semibold text-sm"
            style={{ color: 'var(--color-text)' }}
          >
            Chat
          </p>
          <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
            Thread ID: {chatId.slice(0, 8)}...
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: 'var(--color-subtext)' }}>
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === userId
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: isOwn
                      ? 'var(--color-gold)'
                      : 'var(--color-card-bg)',
                    color: isOwn ? '#000' : 'var(--color-text)',
                  }}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: isOwn
                        ? 'rgba(0,0,0,0.6)'
                        : 'var(--color-subtext)',
                    }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="flex-shrink-0 px-4 py-4 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 px-4 py-3 rounded-xl text-sm"
            style={{
              backgroundColor: 'var(--color-card-bg)',
              color: 'var(--color-text)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-opacity"
            style={{
              backgroundColor: 'var(--color-gold)',
              color: '#000',
              opacity: !newMessage.trim() || sending ? 0.5 : 1,
            }}
          >
            {sending ? (
              <span className="inline-block w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
