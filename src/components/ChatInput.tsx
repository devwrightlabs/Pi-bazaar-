'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSend: (content: string) => void
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, onTyping, disabled = false }: Props) {
  const [text, setText] = useState('')
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up the typing timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    if (onTyping) {
      onTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 1500)
    }
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (onTyping) {
      onTyping(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex items-end gap-2 p-3 border-t"
      style={{
        backgroundColor: 'var(--color-secondary-bg)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        rows={1}
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-2xl text-sm resize-none outline-none disabled:opacity-50"
        style={{
          backgroundColor: 'var(--color-card-bg)',
          color: 'var(--color-text)',
          maxHeight: '120px',
        }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: 'var(--color-gold)' }}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  )
}
