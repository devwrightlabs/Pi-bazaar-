'use client'

import { useEffect } from 'react'
import type { ModalProps } from '@/lib/types'

export default function Modal({
  isOpen,
  title,
  message,
  variant = 'info',
  onConfirm,
  onCancel,
  onClose,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <h3
          className="text-lg font-semibold mb-3"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
        >
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--color-subtext)' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          {variant === 'confirm' && (
            <button
              onClick={() => {
                onCancel?.()
                onClose()
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--color-secondary-bg)', color: 'var(--color-text)' }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              onConfirm?.()
              onClose()
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            {variant === 'confirm' ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
