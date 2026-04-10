'use client'

import type { Listing } from '@/lib/types'

interface Props {
  listing: Listing
}

// Renders popup content for a map pin — actual Leaflet marker is created in MapView.tsx
export default function ListingPinContent({ listing }: Props) {
  return (
    <div style={{ minWidth: '180px', fontFamily: 'DM Sans, sans-serif' }}>
      {listing.images[0] && (
        <img
          src={listing.images[0]}
          alt={listing.title}
          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
        />
      )}
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: '#fff' }}>
        {listing.title}
      </div>
      <div style={{ color: '#F0C040', fontWeight: 700, fontSize: '16px' }}>
        {listing.price_in_pi} Pi
      </div>
      <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>
        {listing.city}, {listing.country}
      </div>
    </div>
  )
}
