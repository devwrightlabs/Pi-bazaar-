'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Listing } from '@/lib/types'
import SeasonalBanner from '@/components/SeasonalBanner'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      <div className="relative h-40 bg-gray-800">
        {listing.images[0] ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        )}
        {listing.is_boosted && (
          <span
            className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            BOOSTED
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
          {listing.title}
        </h3>
        <p className="font-bold mt-1" style={{ color: 'var(--color-gold)' }}>
          {listing.price_pi} Pi
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-subtext)' }}>
          {listing.city}
        </p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20)
        if (error) throw error
        setListings((data as Listing[]) ?? [])
      } catch (err) {
        console.error('Failed to fetch listings:', err)
      } finally {
        setLoading(false)
      }
    }
    void fetchListings()
  }, [])

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

        <section>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Recent Listings
          </h2>
          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🛍️</div>
              <p style={{ color: 'var(--color-subtext)' }}>No listings yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
