'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Message, Conversation } from '@/lib/types'
import ChatBubble from '@/components/ChatBubble'
import ChatInput from '@/components/ChatInput'
import TypingIndicator from '@/components/TypingIndicator'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useStore } from '@/store/useStore'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  const { currentUser } = useStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [otherUserName, setOtherUserName] = useState('User')
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!currentUser || !conversationId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()
      if (convData) {
        const conv = convData as Conversation
        const otherUserId =
          conv.participant_1 === currentUser.id ? conv.participant_2 : conv.participant_1
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('id', otherUserId)
          .single()
        if (userData) {
          setOtherUserName((userData as { username: string }).username)
        }
      }

      const { data: msgData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (!error) {
        setMessages((msgData as Message[]) ?? [])
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', currentUser.id)
          .eq('is_read', false)
      }
      setLoading(false)
    }

    void fetchData()

    const msgChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
          scrollToBottom()
        }
      )
      .subscribe()

    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const indicator = payload.new as { user_id: string; is_typing: boolean }
          if (indicator.user_id !== currentUser?.id) {
            setIsOtherTyping(indicator.is_typing)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(msgChannel)
      void supabase.removeChannel(typingChannel)
    }
  }, [currentUser, conversationId, scrollToBottom])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = async (content: string) => {
    if (!currentUser || !conversationId) return
    const newMsg: Omit<Message, 'id' | 'created_at'> = {
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content,
      is_read: false,
    }
    const { error } = await supabase.from('messages').insert(newMsg)
    if (error) console.error('Failed to send message:', error)
    await supabase
      .from('conversations')
      .update({ last_message: content, last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  const handleTyping = async (isTyping: boolean) => {
    if (!currentUser || !conversationId) return
    await supabase.from('typing_indicators').upsert({
      conversation_id: conversationId,
      user_id: currentUser.id,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    })
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--color-subtext)' }}>Please connect your Pi Wallet first</p>
          <button
            onClick={() => router.push('/profile')}
            className="mt-4 px-6 py-3 rounded-xl font-semibold"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            Go to Profile
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div
        className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'var(--color-secondary-bg)' }}
      >
        <button
          onClick={() => router.push('/chat')}
          className="text-2xl"
          aria-label="Back"
        >
          ←
        </button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-gold)' }}
        >
          <span className="text-black font-bold text-sm">
            {otherUserName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#ffffff' }}>
            @{otherUserName}
          </p>
          {isOtherTyping && (
            <p className="text-xs" style={{ color: 'var(--color-gold)' }}>
              typing...
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: '80px' }}>
        <ErrorBoundary>
          {loading ? (
            <LoadingSkeleton rows={5} variant="rows" />
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              
              <p style={{ color: 'var(--color-subtext)' }}>Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === currentUser.id}
                />
              ))}
              {isOtherTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </ErrorBoundary>
      </div>

      <div className="flex-shrink-0" style={{ paddingBottom: '64px' }}>
        <ChatInput
          onSend={(content) => { void handleSend(content) }}
          onTyping={(isTyping) => { void handleTyping(isTyping) }}
        />
      </div>
    </main>
  )
}
