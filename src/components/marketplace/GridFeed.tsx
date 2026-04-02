'use client'

import type { RecommendedListing } from '@/hooks/useMarketplace'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

const SKELETON_COUNT = 6

interface GridFeedProps {
  listings: RecommendedListing[]
  loadingMore: boolean
}

export default function GridFeed({ listings, loadingMore }: GridFeedProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4">
      {listings.map((item) => (
        <ProductCard key={item.id} item={item} layout="grid" />
      ))}
      {loadingMore &&
        Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <ProductCardSkeleton key={`grid-skeleton-${i}`} />
        ))}
    </div>
  )
}
