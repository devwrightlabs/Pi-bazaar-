'use client'

import type { CreateListingForm } from '@/lib/types'

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

interface Props {
  form: CreateListingForm
  sellerName?: string
}

export default function ListingPreviewCard({ form, sellerName = 'You' }: Props) {
  const hasPhoto = form.images.length > 0
  const coverPhoto = hasPhoto ? form.images[0] : null

  return (
    <div
      className="rounded-2xl overflow-hidden w-full max-w-xs"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      {/* Cover image */}
      <div className="relative h-48 bg-gray-800 flex items-center justify-center">
        {coverPhoto ? (
          <img src={coverPhoto} alt={form.title || 'Listing'} className="w-full h-full object-cover" />
        ) : (
          <div className="text-5xl opacity-30">📷</div>
        )}
        {form.condition && (
          <span
            className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: 'var(--color-gold)' }}
          >
            {CONDITION_LABELS[form.condition] ?? form.condition}
          </span>
        )}
        {form.category && (
          <span
            className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(240,192,64,0.15)', color: 'var(--color-gold)' }}
          >
            {form.category}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <h3
          className="font-semibold text-sm leading-snug mb-1 line-clamp-2"
          style={{ color: form.title ? 'var(--color-text)' : 'var(--color-subtext)', fontFamily: 'Sora, sans-serif' }}
        >
          {form.title || 'Your listing title will appear here'}
        </h3>

        <p
          className="text-lg font-bold"
          style={{ color: form.price_pi > 0 ? 'var(--color-gold)' : 'var(--color-subtext)' }}
        >
          {form.price_pi > 0 ? `${form.price_pi.toFixed(2)} \u03c0` : '0.00 \u03c0'}
        </p>

        {form.allow_offers && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-success)' }}>
            Offers accepted
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
            >
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              @{sellerName}
            </span>
          </div>
          {(form.location_city || form.location_country) && (
            <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              &#128205; {[form.location_city, form.location_country].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
