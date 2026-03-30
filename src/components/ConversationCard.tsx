'use client'

import Link from 'next/link'
import type { Conversation } from '@/lib/types'

interface Props {
  conversation: Conversation
  otherUserName: string
  otherUserAvatar?: string | null
  unreadCount?: number
}

export default function ConversationCard({
  conversation,
  otherUserName,
  otherUserAvatar,
  unreadCount = 0,
}: Props) {
  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <Link href={`/chat/${conversation.id}`}>
      <div
        className="flex items-center gap-3 p-4 rounded-xl transition-colors active:opacity-80"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: 'var(--color-secondary-bg)' }}
        >
          {otherUserAvatar ? (
            <img src={otherUserAvatar} alt={otherUserName} className="w-full h-full object-cover" />
          ) : (
            <span>👤</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
              {otherUserName}
            </p>
            <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--color-subtext)' }}>
              {timeAgo(conversation.last_message_at)}
            </span>
          </div>
          <p className="text-xs truncate mt-1" style={{ color: 'var(--color-subtext)' }}>
            {conversation.last_message || 'No messages yet'}
          </p>
        </div>
        {unreadCount > 0 && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </div>
    </Link>
  )
}
