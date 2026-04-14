'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import type { Listing } from '@/lib/types'
import { useUIStore } from '@/store/useUIStore'
import { supabase } from '@/lib/supabase'

/* ─── Leaflet CSS injection (idempotent) ───────────────────────────────── */

function ensureLeafletCss() {
  if (typeof document === 'undefined') return
  if (document.querySelector('link[data-leaflet-css]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  link.setAttribute('data-leaflet-css', '1')
  document.head.appendChild(link)
}

/* ─── Custom gold pin icon ─────────────────────────────────────────────── */

const GOLD_ICON = L.divIcon({
  html: `<div style="width:24px;height:24px;background:var(--color-gold, #F0C040);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid var(--color-background);box-shadow:0 2px 8px var(--color-backdrop)"></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

/* ─── Props ────────────────────────────────────────────────────────────── */

interface MapBaseProps {
  radius?: number
}

/* ─── Persistent map events handler ────────────────────────────────────── */

function MapEventHandler() {
  const setMapCenter = useUIStore((s) => s.setMapCenter)
  const setMapZoom = useUIStore((s) => s.setMapZoom)

  useMapEvents({
    moveend(e) {
      const map = e.target as LeafletMap
      const c = map.getCenter()
      setMapCenter([c.lat, c.lng])
    },
    zoomend(e) {
      const map = e.target as LeafletMap
      setMapZoom(map.getZoom())
    },
  })

  return null
}

/* ─── Component ────────────────────────────────────────────────────────── */

export default function MapBase({ radius = 50 }: MapBaseProps) {
  const mapCenter = useUIStore((s) => s.mapCenter)
  const mapZoom = useUIStore((s) => s.mapZoom)
  const hasHydrated = useUIStore((s) => s._hasHydrated)
  const themeMode = useUIStore((s) => s.themeMode)

  const mapRef = useRef<LeafletMap | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [locating, setLocating] = useState(false)

  /* ── Read gold color from CSS variable for Leaflet SVG compatibility ── */
  const goldColor = useMemo(() => {
    if (typeof document === 'undefined') return '#F0C040'
    return getComputedStyle(document.documentElement).getPropertyValue('--color-gold').trim() || '#F0C040'
  }, [themeMode])

  /* ── Inject Leaflet CSS once ───────────────────────────────────────── */
  useEffect(() => {
    ensureLeafletCss()
  }, [])

  /* ── Fetch active listings ─────────────────────────────────────────── */
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'active')
          .is('deleted_at', null)
          .limit(100)
        if (error) throw error
        setListings((data as Listing[]) ?? [])
      } catch (err) {
        console.error('MapBase: Failed to fetch listings:', err)
      }
    }
    void fetchListings()
  }, [])

  /* ── "Locate Me" handler ───────────────────────────────────────────── */
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        mapRef.current?.flyTo([latitude, longitude], 14, { duration: 1.5 })
        setLocating(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }, [])

  // Wait for Zustand hydration so we use persisted center/zoom
  if (!hasHydrated) return null

  return (
    <div className="relative w-full" style={{ height: '55vh', minHeight: '340px' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full rounded-2xl"
        zoomControl={true}
        ref={mapRef}
        style={{ background: 'var(--color-card-bg)' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <MapEventHandler />

        {/* Radius circle */}
        <Circle
          center={mapCenter}
          radius={radius * 1000}
          pathOptions={{
            color: goldColor,
            fillColor: goldColor,
            fillOpacity: 0.05,
            weight: 1,
          }}
        />

        {/* Listing markers */}
        {listings.map((listing) => {
          if (!listing.location_lat || !listing.location_lng) return null
          return (
            <Marker
              key={listing.id}
              position={[listing.location_lat, listing.location_lng]}
              icon={GOLD_ICON}
            />
          )
        })}
      </MapContainer>

      {/* "Locate Me" floating button */}
      <button
        onClick={handleLocateMe}
        disabled={locating}
        className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-50"
        style={{
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-border)',
        }}
        aria-label="Locate me"
      >
        {locating ? (
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        )}
      </button>
    </div>
  )
}
