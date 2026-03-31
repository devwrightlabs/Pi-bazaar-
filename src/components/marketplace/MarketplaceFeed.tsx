'use client'

import ErrorBoundary from '@/components/ErrorBoundary'
import { useMarketplace, type RecommendedListing } from '@/hooks/useMarketplace'
import CategoryNav from './CategoryNav'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

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

  return (
    <div>
      {/* Category navigation */}
      <div className="mb-4">
        <CategoryNav activeCategory={activeCategory} onSelect={setCategory} />
      </div>

      {/* Initial loading state */}
      {loading && listings.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Something went wrong
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
            {error}
          </p>
          <button
            onClick={retry}
            className="px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🛍️</div>
          <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            No listings found
          </p>
          <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
            Try a different category or expand your search radius.
          </p>
        </div>
      )}

      {/* Product grid */}
      {listings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {listings.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}

          {/* Skeleton row while loading more */}
          {loadingMore &&
            Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <ProductCardSkeleton key={`skeleton-more-${i}`} />
            ))}
        </div>
      )}

      {/* Sentinel element for IntersectionObserver */}
      {hasMore && <div ref={sentinelRef} className="h-4 mt-4" aria-hidden="true" />}

      {/* End of results */}
      {!hasMore && listings.length > 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'var(--color-subtext)' }}>
          You&apos;ve seen all listings in this area.
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
