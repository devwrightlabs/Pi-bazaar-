'use client'

import SeasonalBanner from '@/components/SeasonalBanner'
import ErrorBoundary from '@/components/ErrorBoundary'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'

export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
            >
              PiBazaar
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Your Pi marketplace
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-gold)' }}
          >
            <span className="font-bold text-black text-lg">P</span>
          </div>
        </div>

        <ErrorBoundary>
          <div className="mb-6">
            <SeasonalBanner />
          </div>
        </ErrorBoundary>

        <ErrorBoundary>
          <MarketplaceFeed />
        </ErrorBoundary>
      </div>
    </main>
  )
}

