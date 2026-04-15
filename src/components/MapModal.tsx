'use client'

import { useEffect } from 'react'
import MapWrapper from '@/components/MapWrapper'

/* ─── Props ────────────────────────────────────────────────────────────── */

interface MapModalProps {
  open: boolean
  onClose: () => void
}

/* ─── Component ────────────────────────────────────────────────────────── */

export default function MapModal({ open, onClose }: MapModalProps) {
  /* ── Lock body scroll when open ────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  /* ── Escape key closes modal ───────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h2 id="map-modal-title" className="text-lg font-bold font-heading" style={{ color: 'var(--color-text)' }}>
          Seller Map
        </h2>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: 'var(--color-control-bg)' }}
          aria-label="Close map"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Full-screen map */}
      <div className="flex-1 min-h-0">
        <MapWrapper height="100%" />
      </div>
    </div>
  )
}
