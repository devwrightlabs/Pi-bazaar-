'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { authenticateWithPi } from '@/lib/pi-sdk'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import PullToRefresh from '@/components/marketplace/PullToRefresh'

export default function HomePage() {
  const { isAuthenticated, currentUser, setCurrentUser } = useStore()
  const [refreshKey, setRefreshKey] = useState(0)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

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
        return
      }

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: piAuth.accessToken }),
      })

      if (!res.ok) {
        setAuthError('Verification failed. Please try again.')
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
    } catch (err) {
      console.error('Pi login failed:', err)
      setAuthError('Login failed. Please try again.')
    } finally {
      setAuthLoading(false)
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card-bg">
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
                <span className="font-bold text-black text-xs">
                  {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-text-primary">
                Welcome, {currentUser.username}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={handleLogin}>
                Login with Pi
              </Button>
              {authError && (
                <p className="text-xs text-error">{authError}</p>
              )}
            </div>
          )}
        </section>

        {/* Marketplace feed */}
        <ErrorBoundary>
          <MarketplaceFeed key={refreshKey} />
        </ErrorBoundary>
      </PullToRefresh>
    </main>
  )
}
