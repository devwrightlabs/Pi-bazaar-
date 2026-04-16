'use client'

/**
 * HomeFeed — Discovery feed with search filters, trending tags & infinite scroll
 *
 * Features:
 *   • Expandable search filter bar (category, condition, price range in Pi)
 *   • Trending tags (horizontally scrollable pills)
 *   • Infinite scroll via IntersectionObserver (already wired from useMarketplace)
 *   • Mobile-first (min 320 px), all colours via CSS custom properties
 *   • Error handling with user-friendly messages
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useMarketplace, type RecommendedListing } from '@/hooks/useMarketplace'
import { useUIStore } from '@/store/useUIStore'
import GridFeed from '@/components/marketplace/GridFeed'
import ListFeed from '@/components/marketplace/ListFeed'
import SwipeFeed from '@/components/marketplace/SwipeFeed'
import CategoryNav from '@/components/marketplace/CategoryNav'
import ControlBar from '@/components/marketplace/ControlBar'
import PullToRefresh from '@/components/marketplace/PullToRefresh'

/* ─── Constants ──────────────────────────────────────────────────────────── */

const TRENDING_TAGS = [
  'Pi Merch',
  'Handmade',
  'Electronics',
  'Vintage',
  'Limited Edition',
  'Free Shipping',
  'Art & Prints',
  'Local Only',
  'Crypto Goods',
  'New Arrivals',
]

const CONDITIONS: Array<{ label: string; value: string }> = [
  { label: 'Any', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Like New', value: 'like_new' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
]

const SKELETON_COUNT = 6

/* ─── Search Filter Bar ──────────────────────────────────────────────────── */

interface SearchFilters {
  query: string
  condition: string
  priceMin: string
  priceMax: string
}

function SearchFilterBar({
  filters,
  onChange,
  expanded,
  onToggle,
}: {
  filters: SearchFilters
  onChange: (f: SearchFilters) => void
  expanded: boolean
  onToggle: () => void
}) {
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-card-bg)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search listings…"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-subtext)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <button
          onClick={onToggle}
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          style={{
            backgroundColor: expanded ? 'var(--color-gold)' : 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Toggle filters"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={expanded ? '#000' : 'var(--color-text)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          {/* Condition selector */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--color-subtext)' }}>
              Condition
            </label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const isActive = filters.condition === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => onChange({ ...filters, condition: c.value })}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? 'var(--color-gold)' : 'var(--color-control-bg)',
                      color: isActive ? '#000' : 'var(--color-text)',
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price range */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--color-subtext)' }}>
              Price Range (π)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceMin}
                onChange={(e) => onChange({ ...filters, priceMin: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
                min={0}
              />
              <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceMax}
                onChange={(e) => onChange({ ...filters, priceMax: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
                min={0}
              />
            </div>
          </div>

          {/* Clear filters */}
          <button
            onClick={() => onChange({ query: '', condition: '', priceMin: '', priceMax: '' })}
            className="text-xs font-semibold"
            style={{ color: 'var(--color-gold)' }}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Trending Tags ──────────────────────────────────────────────────────── */

function TrendingTags({ onSelect }: { onSelect: (tag: string) => void }) {
  return (
    <div>
      <h3
        className="text-xs font-semibold mb-2 px-1"
        style={{ color: 'var(--color-subtext)' }}
      >
        Trending
      </h3>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
          {TRENDING_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelect(tag)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--color-secondary-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              🔥 {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Feed Content ───────────────────────────────────────────────────────── */

interface HomeFeedProps {
  initialListings?: RecommendedListing[]
}

function FeedContent({ initialListings = [] }: HomeFeedProps) {
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
    refresh,
  } = useMarketplace(initialListings)

  const viewMode = useUIStore((s) => s.viewMode)

  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    condition: '',
    priceMin: '',
    priceMax: '',
  })

  // Client-side filtering on top of the already-fetched listings
  const filteredListings = listings.filter((l) => {
    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase()
      if (
        !l.title.toLowerCase().includes(q) &&
        !l.description.toLowerCase().includes(q) &&
        !l.category.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    // Condition filter
    if (filters.condition && l.condition !== filters.condition) {
      return false
    }
    // Price range
    const pMin = filters.priceMin ? Number(filters.priceMin) : 0
    const pMax = filters.priceMax ? Number(filters.priceMax) : Infinity
    if (l.price_in_pi < pMin || l.price_in_pi > pMax) {
      return false
    }
    return true
  })

  const handleRefresh = useCallback(async () => {
    await refresh()
  }, [refresh])

  const handleTagSelect = useCallback(
    (tag: string) => {
      setFilters((prev) => ({ ...prev, query: tag }))
      setFiltersExpanded(false)
    },
    [],
  )

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-w-[320px]">
        {/* Search & Filters */}
        <div className="px-4 mb-3">
          <SearchFilterBar
            filters={filters}
            onChange={setFilters}
            expanded={filtersExpanded}
            onToggle={() => setFiltersExpanded((v) => !v)}
          />
        </div>

        {/* Trending Tags */}
        <div className="px-4 mb-3">
          <TrendingTags onSelect={handleTagSelect} />
        </div>

        {/* Control bar */}
        <ControlBar />

        {/* Category navigation */}
        {viewMode !== 'swipe' && (
          <div className="px-4 mt-3 mb-4">
            <CategoryNav activeCategory={activeCategory} onSelect={setCategory} />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && listings.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
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
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Something went wrong
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
              {error}
            </p>
            <button
              onClick={retry}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              No listings found
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              {filters.query || filters.condition || filters.priceMin || filters.priceMax
                ? 'Try adjusting your filters or search terms.'
                : 'Try a different category or expand your search radius.'}
            </p>
            {(filters.query || filters.condition || filters.priceMin || filters.priceMax) && (
              <button
                onClick={() => setFilters({ query: '', condition: '', priceMin: '', priceMax: '' })}
                className="mt-3 px-5 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Feed — routed by viewMode */}
        {filteredListings.length > 0 && viewMode === 'grid' && (
          <GridFeed listings={filteredListings} loadingMore={loadingMore} />
        )}
        {filteredListings.length > 0 && viewMode === 'list' && (
          <ListFeed listings={filteredListings} loadingMore={loadingMore} />
        )}
        {filteredListings.length > 0 && viewMode === 'swipe' && (
          <SwipeFeed listings={filteredListings} />
        )}

        {/* Sentinel for infinite scroll */}
        {hasMore && viewMode !== 'swipe' && (
          <div ref={sentinelRef} className="h-4 mt-4" aria-hidden="true" />
        )}
        {hasMore && viewMode === 'swipe' && (
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
        )}

        {/* End of results */}
        {!hasMore && filteredListings.length > 0 && viewMode !== 'swipe' && (
          <p
            className="text-center text-sm py-8"
            style={{ color: 'var(--color-subtext)' }}
          >
            You've seen all listings in this area.
          </p>
        )}
      </div>
    </PullToRefresh>
  )
}

/* ─── Export with ErrorBoundary ───────────────────────────────────────────── */

export default function HomeFeed({ initialListings = [] }: HomeFeedProps) {
  return (
    <ErrorBoundary>
      <FeedContent initialListings={initialListings} />
    </ErrorBoundary>
  )
}
