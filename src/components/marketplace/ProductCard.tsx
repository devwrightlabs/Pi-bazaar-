'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useStore } from '@/store/useStore'
import type { Listing, MatchScore } from '@/lib/types'

type RecommendedListing = Listing & { match_score: MatchScore }

const CONDITION_LABELS: Record<NonNullable<Listing['condition']>, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

interface ProductCardProps {
  item: RecommendedListing
}

export default function ProductCard({ item }: ProductCardProps) {
  const router = useRouter()
  const { openModal } = useStore()
  const [imgError, setImgError] = useState(false)

  const imageUrl = item.images[0]
  const hasImage = Boolean(imageUrl) && !imgError
  const distanceKm = item.match_score.distance_km
  const sellerInitial = item.seller_id.charAt(0).toUpperCase() || '?'

  const handleQuickView = () => {
    const conditionLabel = item.condition ? CONDITION_LABELS[item.condition] : null
    const distanceText =
      distanceKm !== null ? `${distanceKm.toFixed(1)} km away` : 'Unknown distance'
    const details = [
      item.description,
      '',
      `Price: π ${item.price_pi}`,
      conditionLabel ? `Condition: ${conditionLabel}` : null,
      `Location: ${item.city}, ${item.country}`,
      `Distance: ${distanceText}`,
    ]
      .filter(Boolean)
      .join('\n')

    openModal({
      title: item.title,
      message: details,
      variant: 'info',
    })
  }

  const handleBuy = () => {
    router.push(`/checkout/${item.id}`)
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      {/* Image section */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            loading="lazy"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ backgroundColor: 'var(--color-secondary-bg)' }}
          >
            📦
          </div>
        )}

        {/* Boosted badge */}
        {item.is_boosted && (
          <span
            className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full z-10"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            ⚡ BOOSTED
          </span>
        )}

        {/* Category badge */}
        {item.category && (
          <span
            className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full z-10"
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'var(--color-text)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {item.category}
          </span>
        )}
      </div>

      {/* Content section */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        {/* Title */}
        <h3
          className="font-semibold text-sm leading-tight"
          style={{
            color: 'var(--color-text)',
            fontFamily: 'Sora, sans-serif',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.title}
        </h3>

        {/* Price */}
        <p className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
          π {item.price_pi}
        </p>

        {/* Proximity */}
        {distanceKm !== null && (
          <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
            📍 {distanceKm.toFixed(1)} km away
          </p>
        )}

        {/* City */}
        <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
          {item.city}
        </p>

        {/* Condition + Seller row */}
        <div className="flex items-center justify-between mt-1">
          {item.condition && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--color-secondary-bg)',
                color: 'var(--color-subtext)',
              }}
            >
              {CONDITION_LABELS[item.condition]}
            </span>
          )}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ml-auto"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            {sellerInitial}
          </div>
        </div>
      </div>

      {/* Quick Actions bar */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={handleQuickView}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-secondary-bg)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-card-bg)',
          }}
        >
          Quick View
        </button>
        <button
          onClick={handleBuy}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          Buy with π
        </button>
      </div>
    </div>
  )
}
