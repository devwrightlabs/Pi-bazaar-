'use client'

import { useState, useCallback } from 'react'
import SeasonalBanner from '@/components/SeasonalBanner'
import ErrorBoundary from '@/components/ErrorBoundary'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import PullToRefresh from '@/components/PullToRefresh'

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(async () => {
    await new Promise<void>((r) => setTimeout(r, 800))
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold font-heading text-text-primary">
                PiBazaar
              </h1>
              <p className="text-sm text-text-sub">
                Your Pi marketplace
              </p>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gold">
                <span className="font-bold text-black text-lg">P</span>
              </div>
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: 'var(--color-error)' }}
                aria-label="3 unread notifications"
              >
                3
              </span>
            </div>
          </div>

          <ErrorBoundary>
            <div className="mb-6">
              <SeasonalBanner />
            </div>
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <MarketplaceFeed key={refreshKey} />
        </ErrorBoundary>
      </PullToRefresh>
    </main>
  )
}
