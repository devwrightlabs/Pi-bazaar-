'use client'

import dynamic from 'next/dynamic'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <LoadingSkeleton rows={4} />,
})

export default function MapPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
        >
          Nearby Listings
        </h1>
        <ErrorBoundary>
          <MapView />
        </ErrorBoundary>
      </div>
    </main>
  )
}
