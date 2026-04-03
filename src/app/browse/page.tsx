'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Listing } from '@/lib/types'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Home', 'Garden', 'Outdoor', 'Sports', 'Books', 'Art']

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Failed to load listings. Please try again.'
}

function BrowseContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryParam = searchParams.get('category') ?? ''
  const seasonParam = searchParams.get('season') ?? ''

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!isSupabaseConfigured) {
      setError(
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment.'
      )
      setLoading(false)
      return
    }

    try {
      let query = supabase
        .from('listings')
        .select('*')
        .eq('is_active', true)
        .order('is_boosted', { ascending: false })
        .order('created_at', { ascending: false })

      if (selectedCategory !== 'All') {
        query = query.ilike('category', `%${selectedCategory}%`)
      }
      if (seasonParam) {
        query = query.ilike('category', `%${seasonParam}%`)
      }
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`)
      }

      const { data, error: fetchError } = await query.limit(50)
      if (fetchError) throw fetchError
      setListings((data as Listing[]) ?? [])
    } catch (err) {
      console.error('Failed to fetch listings:', err)
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery, seasonParam])

  useEffect(() => {
    void fetchListings()
  }, [fetchListings])

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
        >
          Browse
          {seasonParam && (
            <span className="text-base font-normal ml-2" style={{ color: 'var(--color-gold)' }}>
              — {seasonParam} deals
            </span>
          )}
        </h1>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search listings..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            color: 'var(--color-text)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-colors"
              style={{
                backgroundColor: selectedCategory === cat ? 'var(--color-gold)' : 'var(--color-card-bg)',
                color: selectedCategory === cat ? '#000' : 'var(--color-text)',
              }}
            >
              {cat}
            </button>
          ))}
          <div className="flex-shrink-0 w-4" aria-hidden="true" />
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : error ? (
          <div className="text-center py-16">
            
            <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Something went wrong
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
              {error}
            </p>
            <button
              onClick={() => void fetchListings()}
              className="px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
            >
              Try Again
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            
            <p style={{ color: 'var(--color-subtext)' }}>No listings found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--color-card-bg)' }}
              >
                <div className="h-40 bg-gray-800 relative">
                  {listing.images[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800"></div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {listing.title}
                  </h3>
                  <p className="font-bold mt-1" style={{ color: 'var(--color-gold)' }}>
                    {listing.price_pi} Pi
                  </p>
                  <button
                    onClick={() => router.push(`/checkout/${listing.id}`)}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: '#F0C040', color: '#000' }}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function BrowsePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton rows={5} />}>
        <BrowseContent />
      </Suspense>
    </ErrorBoundary>
  )
}
