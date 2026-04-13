'use client'

import dynamic from 'next/dynamic'

/* ─── CSS-variable skeleton loader ─────────────────────────────────────── */

function MapSkeleton() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden relative"
      style={{
        height: '55vh',
        minHeight: '340px',
        backgroundColor: 'var(--color-card-bg)',
      }}
    >
      {/* Shimmer overlay */}
      <div className="skeleton-shimmer absolute inset-0" />

      {/* Fake map elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
        {/* Map icon placeholder */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-secondary-bg)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-subtext)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-subtext)' }}>
          Loading map...
        </p>
      </div>

      {/* Fake road lines */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/3 left-0 right-0 h-px" style={{ backgroundColor: 'var(--color-subtext)' }} />
        <div className="absolute top-2/3 left-0 right-0 h-px" style={{ backgroundColor: 'var(--color-subtext)' }} />
        <div className="absolute left-1/3 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--color-subtext)' }} />
        <div className="absolute left-2/3 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--color-subtext)' }} />
      </div>
    </div>
  )
}

/* ─── Dynamic import with SSR disabled ─────────────────────────────────── */

const MapBase = dynamic(() => import('@/components/MapBase'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

/* ─── Props ────────────────────────────────────────────────────────────── */

interface MapWrapperProps {
  radius?: number
}

/* ─── Wrapper component ────────────────────────────────────────────────── */

export default function MapWrapper({ radius }: MapWrapperProps) {
  return <MapBase radius={radius} />
}
