'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useStore } from '@/store/useStore'
import type { Listing, MatchScore } from '@/lib/types'
import VerifiedBadge from '@/components/VerifiedBadge'

type RecommendedListing = Listing & { match_score: MatchScore }

export type CardLayout = 'grid' | 'list' | 'swipe'

const CONDITION_LABELS: Record<NonNullable<Listing['condition']>, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

interface ProductCardProps {
  item: RecommendedListing
  layout?: CardLayout
}

export default function ProductCard({ item, layout = 'grid' }: ProductCardProps) {
  const router = useRouter()
  const { openModal } = useStore()
  const [imgError, setImgError] = useState(false)

  const imageUrl = item.images[0]
  const hasImage = Boolean(imageUrl) && !imgError
  const distanceKm = item.match_score.distance_km
  const sellerInitial = item.seller_id.charAt(0).toUpperCase() || '?'
  const conditionLabel = item.condition ? CONDITION_LABELS[item.condition] : null

  const handleQuickView = () => {
    const distanceText =
      distanceKm !== null ? `${distanceKm.toFixed(1)} km away` : 'Unknown distance'
    const detailsParts = [
      item.description,
      `Price: π ${item.price_pi}`,
      conditionLabel ? `Condition: ${conditionLabel}` : null,
      `Location: ${item.city}, ${item.country}`,
      `Distance: ${distanceText}`,
    ].filter((part): part is string => Boolean(part))

    openModal({
      title: item.title,
      message: detailsParts.join(' • '),
      variant: 'info',
    })
  }

  const handleBuy = () => {
    router.push(`/checkout/${item.id}`)
  }

  // ----- SWIPE layout -----
  if (layout === 'swipe') {
    return (
      <div className="rounded-2xl border border-border bg-card-bg overflow-hidden flex flex-col">
        {/* Hero image */}
        <div className="relative w-full overflow-hidden aspect-[3/4]">
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
            <div className="w-full h-full flex items-center justify-center bg-secondary-bg" />
          )}

          {/* Boosted badge */}
          {item.is_boosted && (
            <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full z-10 bg-gold text-black">
              BOOSTED
            </span>
          )}

          {/* Floating pills — location + condition */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap z-10">
            {distanceKm !== null && (
              <span className="text-xs px-3 py-1 rounded-full backdrop-blur-md bg-backdrop text-text-primary">
                {distanceKm.toFixed(1)} km
              </span>
            )}
            {conditionLabel && (
              <span className="text-xs px-3 py-1 rounded-full backdrop-blur-md bg-backdrop text-text-primary">
                {conditionLabel}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="text-xl font-bold line-clamp-2 font-heading text-text-primary">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-text-sub line-clamp-2">
              {item.description}
            </p>
          )}
          <p className="text-3xl font-bold text-gold">π {item.price_pi}</p>

          {/* Seller row */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-gold text-black">
              {sellerInitial}
            </div>
            <span className="text-sm text-text-sub">{item.city}</span>
            <VerifiedBadge size="sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 pb-4">
          <button
            onClick={handleQuickView}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 bg-secondary-bg text-text-primary border border-border"
          >
            Quick View
          </button>
          <button
            onClick={handleBuy}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 bg-gold text-black"
          >
            Buy with π
          </button>
        </div>
      </div>
    )
  }

  // ----- LIST layout -----
  if (layout === 'list') {
    return (
      <div className="rounded-2xl border border-border bg-card-bg overflow-hidden flex flex-row">
        {/* Fixed image area */}
        <div className="relative w-32 shrink-0 overflow-hidden">
          <div className="w-32 h-full min-h-[5.5rem]">
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
              <div className="w-full h-full flex items-center justify-center bg-secondary-bg" />
            )}
            {/* Boosted badge */}
            {item.is_boosted && (
              <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-full z-10 bg-gold text-black">
                BOOSTED
              </span>
            )}
            {/* Floating pills */}
            <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap z-10">
              {distanceKm !== null && (
                <span className="text-xs px-1.5 py-0.5 rounded-full backdrop-blur-md bg-backdrop text-text-primary leading-tight">
                  {distanceKm.toFixed(1)} km
                </span>
              )}
              {conditionLabel && (
                <span className="text-xs px-1.5 py-0.5 rounded-full backdrop-blur-md bg-backdrop text-text-primary leading-tight">
                  {conditionLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col justify-between p-3 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold line-clamp-2 font-heading text-text-primary flex-1">
              {item.title}
            </h3>
            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-secondary-bg text-text-sub">
                {item.category}
              </span>
            )}
          </div>

          <p className="text-2xl font-bold text-gold mt-1">π {item.price_pi}</p>

          <p className="text-xs text-text-sub">{item.city}</p>

          <VerifiedBadge size="sm" />

          {/* Actions */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleQuickView}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 bg-secondary-bg text-text-primary border border-border"
            >
              Quick View
            </button>
            <button
              onClick={handleBuy}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 bg-gold text-black"
            >
              Buy with π
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- GRID layout (default) -----
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: item.is_pro_seller
          ? '2px solid var(--color-gold)'
          : '1px solid var(--color-border)',
        backgroundColor: 'var(--color-card-bg)',
      }}
    >
      {/* Square image */}
      <div className="relative w-full aspect-square overflow-hidden">
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
          <div className="w-full h-full flex items-center justify-center text-4xl bg-secondary-bg">
            
          </div>
        )}

        {/* Pro-Seller badge */}
        {item.is_pro_seller && (
          <span
            className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full z-10"
            style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
          >
            ✓ Pro Seller
          </span>
        )}

        {/* Boosted badge */}
        {item.is_boosted && !item.is_pro_seller && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full z-10 bg-gold text-black">
            BOOSTED
          </span>
        )}

        {/* Category badge */}
        {item.category && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full z-10 backdrop-blur-md bg-backdrop text-text-primary">
            {item.category}
          </span>
        )}

        {/* Floating pills — location + condition */}
        <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap z-10">
          {distanceKm !== null && (
            <span className="text-xs px-2 py-0.5 rounded-full backdrop-blur-md bg-backdrop text-text-primary leading-tight">
              {distanceKm.toFixed(1)} km
            </span>
          )}
          {conditionLabel && (
            <span className="text-xs px-2 py-0.5 rounded-full backdrop-blur-md bg-backdrop text-text-primary leading-tight">
              {conditionLabel}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 font-heading text-text-primary">
          {item.title}
        </h3>

        <p className="font-bold text-lg text-gold">π {item.price_pi}</p>

        <p className="text-xs text-text-sub">{item.city}</p>

        {/* Seller avatar */}
        <div className="flex items-center justify-end gap-1.5 mt-1">
          {item.is_pro_seller ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}
              aria-label="Verified Pro Seller"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1L7.5 4.2L11 4.7L8.5 7.1L9.1 10.6L6 9L2.9 10.6L3.5 7.1L1 4.7L4.5 4.2L6 1Z" fill="#8B5CF6" />
                <path d="M4 6L5.5 7.5L8 5" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified Pro
            </span>
          ) : (
            <VerifiedBadge size="sm" />
          )}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: item.is_pro_seller ? '#8B5CF6' : 'var(--color-gold)',
              color: item.is_pro_seller ? '#fff' : '#000',
            }}
          >
            {sellerInitial}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={handleQuickView}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 bg-secondary-bg text-text-primary border border-border"
        >
          Quick View
        </button>
        <button
          onClick={handleBuy}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 bg-gold text-black"
        >
          Buy with π
        </button>
      </div>
    </div>
  )
}
