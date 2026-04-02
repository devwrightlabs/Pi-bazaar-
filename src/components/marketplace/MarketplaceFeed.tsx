'use client'

import ErrorBoundary from '@/components/ErrorBoundary'
import { useMarketplace, type RecommendedListing } from '@/hooks/useMarketplace'
import { useUIStore } from '@/store/useUIStore'
import CategoryNav from './CategoryNav'
import ControlBar from './ControlBar'
import GridFeed from './GridFeed'
import ListFeed from './ListFeed'
import SwipeFeed from './SwipeFeed'

const SKELETON_COUNT = 6

interface MarketplaceFeedProps {
  initialListings?: RecommendedListing[]
}

function FeedContent({ initialListings = [] }: MarketplaceFeedProps) {
  const {
    listings,
    loading,
    loadingMore,
    error,
    hasMore,
    activeCategory,
    setCategory,
    sentinelRef,
    retry,
  } = useMarketplace(initialListings)

  const viewMode = useUIStore((s) => s.viewMode)

  return (
    <div>
      <ControlBar />

      {/* Category navigation */}
      {viewMode !== 'swipe' && (
        <div className="px-4 mt-3 mb-4">
          <CategoryNav activeCategory={activeCategory} onSelect={setCategory} />
        </div>
      )}

      {/* Initial loading state */}
      {loading && listings.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden animate-pulse bg-card-bg border border-border"
            >
              <div className="w-full aspect-square bg-secondary-bg" />
              <div className="p-3 space-y-2">
                <div className="h-3 rounded bg-secondary-bg w-4/5" />
                <div className="h-3 rounded bg-secondary-bg w-3/5" />
                <div className="h-4 rounded bg-secondary-bg w-2/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <p className="font-semibold mb-2 text-text-primary">
            Something went wrong
          </p>
          <p className="text-sm mb-4 text-text-sub">
            {error}
          </p>
          <button
            onClick={retry}
            className="px-6 py-3 rounded-xl font-semibold text-sm bg-gold text-black"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <p className="font-semibold mb-2 text-text-primary">
            No listings found
          </p>
          <p className="text-sm text-text-sub">
            Try a different category or expand your search radius.
          </p>
        </div>
      )}

      {/* Feed — routed by viewMode */}
      {listings.length > 0 && viewMode === 'grid' && (
        <GridFeed listings={listings} loadingMore={loadingMore} />
      )}
      {listings.length > 0 && viewMode === 'list' && (
        <ListFeed listings={listings} loadingMore={loadingMore} />
      )}
      {listings.length > 0 && viewMode === 'swipe' && (
        <SwipeFeed listings={listings} />
      )}

      {/* Sentinel element for IntersectionObserver (infinite scroll) */}
      {hasMore && viewMode !== 'swipe' && (
        <div ref={sentinelRef} className="h-4 mt-4" aria-hidden="true" />
      )}
      {hasMore && viewMode === 'swipe' && (
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      )}

      {/* End of results (grid/list only — swipe has its own end card) */}
      {!hasMore && listings.length > 0 && viewMode !== 'swipe' && (
        <p className="text-center text-sm py-8 text-text-sub">
          You've seen all listings in this area.
        </p>
      )}
    </div>
  )
}

export default function MarketplaceFeed({ initialListings = [] }: MarketplaceFeedProps) {
  return (
    <ErrorBoundary>
      <FeedContent initialListings={initialListings} />
    </ErrorBoundary>
  )
}
