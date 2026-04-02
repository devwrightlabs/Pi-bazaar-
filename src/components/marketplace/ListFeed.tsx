'use client'

import type { RecommendedListing } from '@/hooks/useMarketplace'
import ProductCard from './ProductCard'

const SKELETON_COUNT = 4

function ListCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl overflow-hidden animate-pulse bg-card-bg border border-border">
      {/* Image placeholder */}
      <div className="w-32 shrink-0 aspect-video bg-secondary-bg" />
      {/* Content placeholder */}
      <div className="flex flex-col justify-between py-3 pr-3 flex-1 gap-2">
        <div className="h-4 rounded bg-secondary-bg w-4/5" />
        <div className="h-3 rounded bg-secondary-bg w-3/5" />
        <div className="h-5 rounded bg-secondary-bg w-2/5" />
        <div className="flex gap-2 mt-auto">
          <div className="h-8 rounded-lg flex-1 bg-secondary-bg" />
          <div className="h-8 rounded-lg flex-1 bg-secondary-bg" />
        </div>
      </div>
    </div>
  )
}

interface ListFeedProps {
  listings: RecommendedListing[]
  loadingMore: boolean
}

export default function ListFeed({ listings, loadingMore }: ListFeedProps) {
  return (
    <div className="flex flex-col gap-3 px-4">
      {listings.map((item) => (
        <ProductCard key={item.id} item={item} layout="list" />
      ))}
      {loadingMore &&
        Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <ListCardSkeleton key={`list-skeleton-${i}`} />
        ))}
    </div>
  )
}
