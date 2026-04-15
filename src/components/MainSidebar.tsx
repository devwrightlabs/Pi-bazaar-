'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/store/useStore'
import { useUIStore } from '@/store/useUIStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { authenticateWithPi } from '@/lib/pi-sdk'
import { supabase } from '@/lib/supabase'

/* ─── Props ────────────────────────────────────────────────────────────── */

interface MainSidebarProps {
  open: boolean
  onClose: () => void
}

/* ─── Constants ────────────────────────────────────────────────────────── */

const SWIPE_THRESHOLD = 80

/* ─── Dashboard link definition ────────────────────────────────────────── */

interface SidebarLink {
  href: string
  label: string
  icon: React.ReactNode
}

const DASHBOARD_LINKS: SidebarLink[] = [
  {
    href: '/orders',
    label: 'Orders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <path d="M8 7h8M8 12h6M8 17h4" />
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'Messages',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Reviews',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
]

const SETTINGS_LINKS: SidebarLink[] = [
  {
    href: '/profile',
    label: 'Privacy & Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

/* ─── Component ────────────────────────────────────────────────────────── */

export default function MainSidebar({ open, onClose }: MainSidebarProps) {
  const { currentUser, isAuthenticated, setCurrentUser } = useStore()
  const themeMode = useUIStore((s) => s.themeMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const piPriceUsd = useStore((s) => s.piPriceUsd)

  const [profileLoading, setProfileLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [saving, setSaving] = useState(false)

  /* ── Swipe-to-close state ──────────────────────────────────────────── */
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)
  const drawerRef = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)

  /* ── Simulate profile loading ──────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setProfileLoading(true)
      const timer = setTimeout(() => setProfileLoading(false), 600)
      return () => clearTimeout(timer)
    }
  }, [open])

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

  /* ── Theme toggle with optimistic UI ────────────────────────────────── */
  const handleThemeToggle = useCallback(() => {
    const next = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(next)

    if (currentUser) {
      setSaving(true)
      void (async () => {
        try {
          await supabase
            .from('users')
            .update({ theme_preference: next })
            .eq('pi_uid', currentUser.pi_uid)
        } catch {
          // Silently fail — optimistic update already applied
        } finally {
          setSaving(false)
        }
      })()
    }
  }, [themeMode, setThemeMode, currentUser])

  /* ── Pi Wallet connect ─────────────────────────────────────────────── */
  const handleConnect = async () => {
    setConnecting(true)
    setConnectError(null)
    try {
      const piAuth = await authenticateWithPi()
      if (!piAuth) {
        setConnectError('Pi Browser is required to connect.')
        setConnecting(false)
        return
      }

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: piAuth.accessToken }),
      })

      if (!res.ok) {
        setConnectError('Verification failed. Please try again.')
        setConnecting(false)
        return
      }

      const data = (await res.json()) as {
        token: string
        user: { pi_uid: string; pi_username: string | null }
      }

      setCurrentUser({
        id: data.user.pi_uid,
        pi_uid: data.user.pi_uid,
        username: data.user.pi_username ?? 'Pioneer',
        avatar_url: null,
        bio: null,
        created_at: new Date().toISOString(),
      })

      if (typeof window !== 'undefined') {
        localStorage.setItem('pibazaar-token', data.token)
      }
      setConnecting(false)
    } catch (err) {
      console.error('Wallet connection failed:', err)
      setConnectError('Connection failed. Please try again.')
      setConnecting(false)
    }
  }

  /* ── Touch handlers for swipe-to-close (swipe left closes) ─────────── */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = touchStartX.current - e.touches[0].clientX
    if (delta > 0) {
      touchDeltaX.current = delta
      setTranslateX(-delta)
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (touchDeltaX.current > SWIPE_THRESHOLD) {
      onClose()
    }
    setTranslateX(0)
    touchDeltaX.current = 0
  }, [onClose])

  /* ── Escape key closes sidebar ─────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const initials = (currentUser?.username ?? 'P').charAt(0).toUpperCase()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{ backgroundColor: 'var(--color-backdrop)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel — slides from left */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main sidebar"
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col overflow-y-auto"
        style={{
          width: 'min(320px, 85vw)',
          backgroundColor: 'var(--color-background)',
          borderRight: '1px solid var(--color-border)',
          transform: `translateX(${translateX}px)`,
          transition: translateX < 0 ? 'none' : 'transform 0.3s ease',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: 'var(--color-control-bg)' }}
          aria-label="Close sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        {/* ── Header with Pi Price Ticker ─────────────────────────────── */}
        <div className="px-5 pt-6 pb-4">
          {piPriceUsd !== null && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{
                backgroundColor: 'rgba(240, 192, 64, 0.12)',
                color: 'var(--color-gold)',
                border: '1px solid rgba(240, 192, 64, 0.25)',
              }}
            >
              <span>π</span>
              <span>1 Pi = ${piPriceUsd.toFixed(2)}</span>
            </div>
          )}

          {/* ── UNAUTHENTICATED: CTA ─────────────────────────────────── */}
          {!isAuthenticated && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-secondary-bg)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                Connect Pi Wallet to unlock Dashboard
              </p>
              <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                Access orders, messages, reviews, and the full seller map.
              </p>
              <Button
                size="lg"
                onClick={handleConnect}
                disabled={connecting}
                className="w-full"
              >
                {connecting ? 'Connecting…' : 'Connect Pi Wallet'}
              </Button>
              {connectError && (
                <p className="text-xs" style={{ color: 'var(--color-error)' }}>{connectError}</p>
              )}
            </div>
          )}

          {/* ── AUTHENTICATED: Profile snippet ───────────────────────── */}
          {isAuthenticated && (
            <>
              {profileLoading ? (
                <div className="flex items-center gap-3">
                  <Skeleton shape="circle" className="w-14 h-14" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton shape="line" className="h-4 w-3/4 rounded" />
                    <Skeleton shape="line" className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-gold)' }}
                  >
                    <span className="font-bold text-xl text-black">{initials}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-base truncate" style={{ color: 'var(--color-text)' }}>
                      {currentUser?.username ?? 'Pioneer'}
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--color-subtext)' }}>
                      {currentUser?.pi_uid ? `UID: ${currentUser.pi_uid.slice(0, 12)}…` : 'Pi Network User'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Authenticated-only sections ─────────────────────────────── */}
        {isAuthenticated && (
          <>
            {/* Divider */}
            <div className="mx-5 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Search filter */}
            <div className="px-5 py-3">
              <input
                type="text"
                placeholder="Search listings…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-control-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>

            {/* Divider */}
            <div className="mx-5 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Dashboard links */}
            <nav className="px-5 py-3 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-subtext)' }}>
                Dashboard
              </p>
              {DASHBOARD_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                  style={{ color: 'var(--color-text)' }}
                >
                  {link.icon}
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Divider */}
            <div className="mx-5 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Settings links */}
            <nav className="px-5 py-3 flex flex-col gap-1">
              {SETTINGS_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                  style={{ color: 'var(--color-text)' }}
                >
                  {link.icon}
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Divider */}
            <div className="mx-5 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Theme toggle */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round">
                    {themeMode === 'dark' ? (
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    ) : (
                      <>
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </>
                    )}
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>

                <button
                  onClick={handleThemeToggle}
                  className="relative w-11 h-6 rounded-full transition-colors duration-200"
                  style={{
                    backgroundColor: themeMode === 'dark' ? 'var(--color-gold)' : 'var(--color-control-bg)',
                  }}
                  aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200"
                    style={{
                      backgroundColor: themeMode === 'dark' ? 'var(--color-background)' : 'var(--color-text)',
                      transform: themeMode === 'dark' ? 'translateX(22px)' : 'translateX(2px)',
                    }}
                  />
                </button>
              </div>
              {saving && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-subtext)' }}>
                  Saving preferences…
                </p>
              )}
            </div>
          </>
        )}

        {/* Swipe hint (mobile) */}
        <div className="mt-auto px-5 py-4 text-center">
          <p className="text-[10px]" style={{ color: 'var(--color-subtext)' }}>
            Swipe left to close
          </p>
        </div>
      </aside>
    </>
  )
}
