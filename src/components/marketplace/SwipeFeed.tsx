'use client'

import { useRef, useEffect } from 'react'
import type { RecommendedListing } from '@/hooks/useMarketplace'
import ProductCard from './ProductCard'

interface SwipeFeedProps {
  listings: RecommendedListing[]
}

export default function SwipeFeed({ listings }: SwipeFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // When user scrolls near the bottom of the snap container (within 1.5x
  // viewport height), nudge the parent sentinel into view so the
  // IntersectionObserver in useMarketplace triggers the next page load.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Prevent repeatedly triggering smooth scroll while near the bottom.
    let hasNudged = false

    function handleScroll() {
      if (!container) return
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom < clientHeight * 1.5) {
        if (!hasNudged) {
          hasNudged = true
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        }
      } else {
        // User moved away from the bottom; allow a future nudge.
        hasNudged = false
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
    >
      {listings.map((item) => (
        <div
          key={item.id}
          className="h-[100dvh] snap-start flex items-center justify-center px-4"
        >
          <div className="w-full max-w-lg">
            <ProductCard item={item} layout="swipe" />
          </div>
        </div>
      ))}

      {/* End-of-feed indicator */}
      {listings.length > 0 && (
        <div className="h-[100dvh] snap-start flex flex-col items-center justify-center gap-4 text-center px-8">
          <p className="text-xl font-bold font-heading text-text-primary">
            You&apos;re all caught up
          </p>
          <p className="text-sm text-text-sub">
            Check back later for more listings near you.
          </p>
        </div>
      )}
    </div>
  )
}
