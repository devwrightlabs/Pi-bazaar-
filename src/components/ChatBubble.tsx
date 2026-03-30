'use client'

import type { Message } from '@/lib/types'

interface Props {
  message: Message
  isOwn: boolean
}

export default function ChatBubble({ message, isOwn }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className="max-w-[75%] px-4 py-2 rounded-2xl text-sm"
        style={{
          backgroundColor: isOwn ? 'var(--color-gold)' : 'var(--color-card-bg)',
          color: isOwn ? '#000' : 'var(--color-text)',
          borderBottomRightRadius: isOwn ? '4px' : '16px',
          borderBottomLeftRadius: isOwn ? '16px' : '4px',
        }}
      >
        <p className="break-words">{message.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] opacity-70">{time}</span>
          {isOwn && (
            <span className="text-[10px]" style={{ color: message.is_read ? '#4CAF50' : 'rgba(0,0,0,0.5)' }}>
              {message.is_read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
