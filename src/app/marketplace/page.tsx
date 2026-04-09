import { Suspense } from 'react'
import type { Metadata } from 'next'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Listing, MatchScore } from '@/lib/types'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import ProductCardSkeleton from '@/components/marketplace/ProductCardSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'PiBazaar Marketplace',
  description: 'Discover local and digital listings on PiBazaar — the Pi Network marketplace.',
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

async function FeedWithData() {
  if (!isSupabaseConfigured) {
    console.warn('[marketplace] Supabase is not configured — serving empty feed')
    return <MarketplaceFeed initialListings={[]} />
  }

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('is_boosted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[marketplace] Supabase query error:', error)
      return <MarketplaceFeed initialListings={[]} />
    }

    const initialListings = ((data ?? []) as Listing[]).map((listing) => ({
      ...listing,
      match_score: {
        listing_id: listing.id,
        score: 0,
        distance_km: null,
        category_match: false,
        is_boosted: listing.is_boosted,
      } satisfies MatchScore,
    }))

    return <MarketplaceFeed initialListings={initialListings} />
  } catch (err) {
    console.error('[marketplace] Unexpected error fetching listings:', err)
    return <MarketplaceFeed initialListings={[]} />
  }
}

export default function MarketplacePage() {
  return (
    <main className="min-h-screen px-4 pt-6 pb-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
        >
          Marketplace
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
          Find listings near you
        </p>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<SkeletonGrid />}>
          <FeedWithData />
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}
