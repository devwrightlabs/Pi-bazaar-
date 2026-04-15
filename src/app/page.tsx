'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { authenticateWithPi } from '@/lib/pi-sdk'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import PullToRefresh from '@/components/marketplace/PullToRefresh'
import MapWrapper, { MapSkeleton } from '@/components/MapWrapper'
import MainSidebar from '@/components/MainSidebar'
import MapModal from '@/components/MapModal'

/* ─── Unified feed skeleton ────────────────────────────────────────────── */

const SKELETON_GRID_COUNT = 6

function FeedSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 px-4">
      {/* Left column skeleton (listings) */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-1">
          <div className="skeleton-shimmer h-5 w-40 rounded" />
          <div className="skeleton-shimmer h-4 w-16 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: SKELETON_GRID_COUNT }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--color-card-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="skeleton-shimmer w-full aspect-square" />
              <div className="p-3 space-y-2">
                <div className="skeleton-shimmer h-3 rounded w-4/5" />
                <div className="skeleton-shimmer h-3 rounded w-3/5" />
                <div className="skeleton-shimmer h-4 rounded w-2/5" />
              </div>
              <div className="flex gap-2 px-3 pb-3">
                <div className="skeleton-shimmer h-8 rounded-lg flex-1" />
                <div className="skeleton-shimmer h-8 rounded-lg flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right column skeleton (map) */}
      <div className="hidden lg:block w-[380px] shrink-0">
        <MapSkeleton height="400px" />
      </div>
      {/* Mobile map skeleton */}
      <div className="lg:hidden">
        <MapSkeleton height="260px" />
      </div>
    </div>
  )
}

/* ─── Home Page ─────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { isAuthenticated, currentUser, setCurrentUser } = useStore()
  const [refreshKey, setRefreshKey] = useState(0)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [pageReady, setPageReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshKey((k) => k + 1)
    await new Promise<void>((r) => setTimeout(r, 800))
  }, [])

  const handleLogin = async () => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      const piAuth = await authenticateWithPi()
      if (!piAuth) {
        setAuthError('Pi Browser is required to log in.')
        setAuthLoading(false)
        return
      }

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: piAuth.accessToken }),
      })

      if (!res.ok) {
        setAuthError('Verification failed. Please try again.')
        setAuthLoading(false)
        return
      }

      const data = (await res.json()) as {
        token: string
        user: { pi_uid: string; username: string | null; avatar_url: string | null }
      }

      setCurrentUser({
        id: data.user.pi_uid,
        pi_uid: data.user.pi_uid,
        username: data.user.username ?? 'Pioneer',
        avatar_url: data.user.avatar_url ?? null,
        bio: null,
        created_at: new Date().toISOString(),
      })

      if (typeof window !== 'undefined') {
        localStorage.setItem('pibazaar-token', data.token)
      }
      setAuthLoading(false)
    } catch (err) {
      console.error('Pi login failed:', err)
      setAuthError('Login failed. Please try again.')
      setAuthLoading(false)
    }
  }

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev)
  }

  return (
    <main className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* ── Sticky header ────────────────────────────────────────────── */}
        <section
          className="sticky top-0 z-40 px-4 py-4"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Sidebar toggle */}
            <button
              onClick={handleSidebarToggle}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90"
              style={{ backgroundColor: 'var(--color-control-bg)' }}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold font-heading" style={{ color: 'var(--color-text)' }}>
              Trade with <span style={{ color: 'var(--color-gold)' }}>Pi</span>
            </h1>

            {/* Auth area */}
            {authLoading ? (
              <Skeleton shape="line" className="h-10 w-10 rounded-xl" />
            ) : isAuthenticated && currentUser ? (
              <button
                onClick={handleSidebarToggle}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ backgroundColor: 'var(--color-gold)' }}
              >
                <span className="font-bold text-black text-sm">
                  {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                </span>
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <Button size="sm" onClick={handleLogin}>
                  Login
                </Button>
                {authError && (
                  <p className="text-[10px]" style={{ color: 'var(--color-error)' }}>{authError}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Main content ─────────────────────────────────────────────── */}
        {!pageReady ? (
          <FeedSkeleton />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 px-4 max-w-7xl mx-auto">
            {/* ── Left column: Listings ─────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {/* Trending section header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold font-heading" style={{ color: 'var(--color-text)' }}>
                  Trending Near You
                </h2>
                <span className="text-xs font-medium" style={{ color: 'var(--color-gold)' }}>
                  View All
                </span>
              </div>

              {/* Mobile map widget (above listings on small screens) */}
              <div className="lg:hidden mb-4">
                <MapWidget
                  isAuthenticated={isAuthenticated}
                  onLogin={handleLogin}
                  onExpand={() => setMapModalOpen(true)}
                  height="260px"
                />
              </div>

              {/* Marketplace feed */}
              <ErrorBoundary>
                <MarketplaceFeed key={refreshKey} />
              </ErrorBoundary>
            </div>

            {/* ── Right column: Map widget (desktop) ───────────────────── */}
            <div className="hidden lg:block w-[380px] shrink-0">
              <div className="sticky top-20">
                <MapWidget
                  isAuthenticated={isAuthenticated}
                  onLogin={handleLogin}
                  onExpand={() => setMapModalOpen(true)}
                  height="400px"
                />
              </div>
            </div>
          </div>
        )}
      </PullToRefresh>

      {/* Left sidebar */}
      <MainSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Full-screen map modal */}
      <MapModal open={mapModalOpen} onClose={() => setMapModalOpen(false)} />
    </main>
  )
}

/* ─── Map Widget (shared between mobile + desktop) ─────────────────────── */

interface MapWidgetProps {
  isAuthenticated: boolean
  onLogin: () => void
  onExpand: () => void
  height: string
}

function MapWidget({ isAuthenticated, onLogin, onExpand, height }: MapWidgetProps) {
  if (!isAuthenticated) {
    /* ── UNAUTHENTICATED: blurred overlay lock screen ─────────────── */
    return (
      <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
        {/* Blurred map behind */}
        <div className="absolute inset-0" style={{ filter: 'blur(6px)' }}>
          <ErrorBoundary>
            <MapWrapper height={height} />
          </ErrorBoundary>
        </div>

        {/* Lock overlay */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center px-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(240, 192, 64, 0.15)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
            Connect Pi Wallet to view Local Sellers
          </p>
          <Button size="sm" onClick={onLogin}>
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  /* ── AUTHENTICATED: fully unlocked map with expand button ─────────── */
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-subtext)' }}>
          Local Sellers
        </span>
        <button
          onClick={onExpand}
          className="flex items-center gap-1 text-xs font-semibold transition-colors"
          style={{ color: 'var(--color-gold)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Expand
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ height }}>
        <ErrorBoundary>
          <MapWrapper height={height} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

