'use client'

import SeasonalBanner from '@/components/SeasonalBanner'
import ErrorBoundary from '@/components/ErrorBoundary'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
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
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gold">
            <span className="font-bold text-black text-lg">P</span>
          </div>
        </div>

        <ErrorBoundary>
          <div className="mb-6">
            <SeasonalBanner />
          </div>
        </ErrorBoundary>
      </div>

      <ErrorBoundary>
        <MarketplaceFeed />
      </ErrorBoundary>
    </main>
  )
}

