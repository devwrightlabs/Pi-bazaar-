'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { authenticateWithPi } from '@/lib/pi-sdk'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import PullToRefresh from '@/components/marketplace/PullToRefresh'
import MapWrapper from '@/components/MapWrapper'
import ProfileDrawer from '@/components/ProfileDrawer'

/* ─── Unified feed skeleton ────────────────────────────────────────────── */

const SKELETON_GRID_COUNT = 6

function FeedSkeleton() {
  return (
    <div className="px-4 flex flex-col gap-4">
      {/* Map skeleton */}
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          height: '55vh',
          minHeight: '340px',
          backgroundColor: 'var(--color-card-bg)',
        }}
      >
        <div className="skeleton-shimmer absolute inset-0" />
      </div>

      {/* "Trending Near You" section skeleton */}
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
  )
}

/* ─── Home Page ─────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { isAuthenticated, currentUser, setCurrentUser } = useStore()
  const [refreshKey, setRefreshKey] = useState(0)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
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
      setAuthLoading(false)
    } catch (err) {
      console.error('Pi login failed:', err)
      setAuthError('Login failed. Please try again.')
      setAuthLoading(false)
    }
  }

  const handleProfileClick = () => {
    if (isAuthenticated && currentUser) {
      setDrawerOpen(true)
    } else {
      void handleLogin()
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Hero section */}
        <section className="px-4 pt-8 pb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold font-heading text-text-primary mb-3">
            Trade with <span className="text-gold">Pi</span>
          </h1>
          <p className="text-sm text-text-sub max-w-md mx-auto mb-6">
            The decentralized peer-to-peer marketplace built for the Pi Network.
            Buy, sell, and trade — powered by real Pi payments.
          </p>

          {authLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Skeleton shape="line" className="h-12 w-48 rounded-xl" />
              <Skeleton shape="line" className="h-4 w-32 rounded" />
            </div>
          ) : isAuthenticated && currentUser ? (
            <button
              onClick={handleProfileClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95"
              style={{ backgroundColor: 'var(--color-card-bg)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-gold)' }}
              >
                <span className="font-bold text-black text-xs">
                  {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-text-primary">
                Welcome, {currentUser.username}
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={handleProfileClick}>
                Login with Pi
              </Button>
              {authError && (
                <p className="text-xs text-error">{authError}</p>
              )}
            </div>
          )}
        </section>

        {/* Map + Feed */}
        {!pageReady ? (
          <FeedSkeleton />
        ) : (
          <>
            {/* Interactive Map */}
            <section className="px-4 mb-6">
              <ErrorBoundary>
                <MapWrapper />
              </ErrorBoundary>
            </section>

            {/* Trending section header */}
            <section className="px-4 mb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-heading" style={{ color: 'var(--color-text)' }}>
                  Trending Near You
                </h2>
                <span className="text-xs font-medium" style={{ color: 'var(--color-gold)' }}>
                  View All
                </span>
              </div>
            </section>

            {/* Marketplace feed */}
            <ErrorBoundary>
              <MarketplaceFeed key={refreshKey} />
            </ErrorBoundary>
          </>
        )}
      </PullToRefresh>

      {/* Profile Drawer */}
      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </main>
  )
}

