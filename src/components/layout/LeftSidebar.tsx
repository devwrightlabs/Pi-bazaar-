'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ErrorBoundary from '@/components/ErrorBoundary'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'

interface LeftSidebarProps {
  open: boolean
  onClose: () => void
}

type SectionKey = 'dashboard' | 'privacy' | 'settings' | 'theme'

const NAV_ITEMS: { key: SectionKey; label: string }[] = [
  { key: 'dashboard', label: 'Profile Dashboard' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'settings', label: 'Settings' },
  { key: 'theme', label: 'Theme Customization' },
]

export default function LeftSidebar({ open, onClose }: LeftSidebarProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard')
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [open, onClose])

  if (!open) return null

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 z-50 md:pointer-events-none">
        <button
          className="absolute inset-0 md:hidden"
          style={{ backgroundColor: 'var(--color-backdrop)' }}
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
        <aside
          className="absolute left-0 top-0 h-full w-[min(320px,85vw)] md:w-80 md:pointer-events-auto"
          style={{
            backgroundColor: 'var(--color-background)',
            borderRight: '1px solid var(--color-border)',
            transform: 'translateX(0)',
            transition: 'transform 180ms ease',
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX
          }}
          onTouchEnd={() => {
            touchStartX.current = null
          }}
          onTouchMove={(event) => {
            if (touchStartX.current === null) return
            const delta = touchStartX.current - event.touches[0].clientX
            if (delta > 80) {
              onClose()
              touchStartX.current = null
            }
          }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Menu
              </p>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: 'var(--color-control-bg)', color: 'var(--color-text)' }}
                aria-label="Close sidebar"
              >
                ×
              </button>
            </div>

            <nav className="px-3 pb-3">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className="mb-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium"
                  style={{
                    color: activeSection === item.key ? 'var(--color-text)' : 'var(--color-subtext)',
                    backgroundColor: activeSection === item.key ? 'var(--color-secondary-bg)' : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mx-3 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {activeSection === 'dashboard' && (
                <Link href="/dashboard" onClick={onClose} className="text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
                  Open Profile Dashboard
                </Link>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-2 text-sm" style={{ color: 'var(--color-text)' }}>
                  <p>Privacy controls are managed from your profile preferences.</p>
                  <Link href="/profile" onClick={onClose} style={{ color: 'var(--color-gold)' }}>
                    Manage Privacy
                  </Link>
                </div>
              )}

              {activeSection === 'settings' && (
                <div className="space-y-2 text-sm" style={{ color: 'var(--color-text)' }}>
                  <p>General app settings are available in your account profile.</p>
                  <Link href="/profile" onClick={onClose} style={{ color: 'var(--color-gold)' }}>
                    Open Settings
                  </Link>
                </div>
              )}

              {activeSection === 'theme' && (
                <ThemeSwitcher />
              )}
            </div>
          </div>
        </aside>
      </div>
    </ErrorBoundary>
  )
}
