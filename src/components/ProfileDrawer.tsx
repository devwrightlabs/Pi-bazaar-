'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useUIStore } from '@/store/useUIStore'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

/* ─── Types ────────────────────────────────────────────────────────────── */

interface ProfileDrawerProps {
  open: boolean
  onClose: () => void
}

/* ─── Constants ────────────────────────────────────────────────────────── */

const SWIPE_THRESHOLD = 80

/* ─── Component ────────────────────────────────────────────────────────── */

export default function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { currentUser } = useStore()
  const themeMode = useUIStore((s) => s.themeMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const piPriceUsd = useStore((s) => s.piPriceUsd)

  const [profileLoading, setProfileLoading] = useState(true)
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
    // Optimistic: apply immediately
    setThemeMode(next)

    // Background save to Supabase
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

  /* ── Touch handlers for swipe-to-close ─────────────────────────────── */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current
    // Only allow swiping right (positive delta closes drawer)
    if (delta > 0) {
      touchDeltaX.current = delta
      setTranslateX(delta)
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (touchDeltaX.current > SWIPE_THRESHOLD) {
      onClose()
    }
    setTranslateX(0)
    touchDeltaX.current = 0
  }, [onClose])

  /* ── Escape key closes drawer ──────────────────────────────────────── */
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

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Profile drawer"
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto"
        style={{
          width: 'min(320px, 85vw)',
          backgroundColor: 'var(--color-background)',
          borderLeft: '1px solid var(--color-border)',
          transform: `translateX(${translateX}px)`,
          transition: translateX > 0 ? 'none' : 'transform 0.3s ease',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.3)',
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
          aria-label="Close profile drawer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        {/* Header with Pi Price Ticker */}
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

          {/* User Info */}
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
                <span className="font-bold text-xl" style={{ color: '#000' }}>
                  {initials}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-base truncate" style={{ color: 'var(--color-text)' }}>
                  {currentUser?.username ?? 'Pioneer'}
                </span>
                <span className="text-xs truncate" style={{ color: 'var(--color-subtext)' }}>
                  {currentUser?.pi_uid ? `UID: ${currentUser.pi_uid.slice(0, 12)}...` : 'Pi Network User'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* Settings */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Theme toggle */}
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
                  backgroundColor: themeMode === 'dark' ? '#000' : 'var(--color-text)',
                  transform: themeMode === 'dark' ? 'translateX(22px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>

          {saving && (
            <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              Saving preferences...
            </p>
          )}

          {/* Bio section */}
          {profileLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton shape="line" className="h-3 w-full rounded" />
              <Skeleton shape="line" className="h-3 w-4/5 rounded" />
            </div>
          ) : (
            currentUser?.bio && (
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-subtext)' }}>
                  About
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {currentUser.bio}
                </p>
              </div>
            )
          )}
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* Account info */}
        <div className="px-5 py-4">
          {profileLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton shape="line" className="h-3 w-2/3 rounded" />
              <Skeleton shape="line" className="h-3 w-1/2 rounded" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-subtext)' }}>
                Member since
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                {currentUser?.created_at
                  ? new Date(currentUser.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'}
              </p>
            </div>
          )}
        </div>

        {/* Swipe hint (mobile) */}
        <div className="mt-auto px-5 py-4 text-center">
          <p className="text-[10px]" style={{ color: 'var(--color-subtext)' }}>
            Swipe right to close
          </p>
        </div>
      </aside>
    </>
  )
}
