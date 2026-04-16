'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  LayersControl,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import type { Listing } from '@/lib/types'
import { useUIStore } from '@/store/useUIStore'
import { useStore } from '@/store/useStore'

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

/* ─── Custom gold pin icon (HTML/CSS divIcon) ──────────────────────────── */

const GOLD_ICON = L.divIcon({
  html: `<div style="width:24px;height:24px;background:var(--color-accent, var(--color-gold, #F0C040));border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid var(--color-background);box-shadow:0 2px 8px var(--color-backdrop)"></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

/* ─── Tile URLs ────────────────────────────────────────────────────────── */

const TILES = {
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  night: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
} as const

/* ─── Props ────────────────────────────────────────────────────────────── */

interface MapBaseProps {
  radius?: number
  /** When provided, fixes the container height (e.g. "400px") */
  height?: string
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

export default function MapBase({ radius, height }: MapBaseProps) {
  const mapCenter = useUIStore((s) => s.mapCenter)
  const mapZoom = useUIStore((s) => s.mapZoom)
  const hasHydrated = useUIStore((s) => s._hasHydrated)
  const themeMode = useUIStore((s) => s.themeMode)
  const listings = useStore((s) => s.listings)
  const storeRadius = useStore((s) => s.mapRadius)
  const userLocation = useStore((s) => s.userLocation)

  const mapRef = useRef<LeafletMap | null>(null)
  const [locating, setLocating] = useState(false)
  const [visibleListings, setVisibleListings] = useState<Listing[]>([])
  const effectiveRadius = radius ?? storeRadius

  /* ── Read gold color from CSS variable for Leaflet SVG compatibility ── */
  const [goldColor, setGoldColor] = useState('#F0C040')
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--color-gold').trim()
      if (val) setGoldColor(val)
    })
    return () => cancelAnimationFrame(raf)
  }, [themeMode])

  /* ── Inject Leaflet CSS once ───────────────────────────────────────── */
  useEffect(() => {
    ensureLeafletCss()
  }, [])

  /* ── Filter listings within current radius ─────────────────────────── */
  useEffect(() => {
    const center = userLocation ?? mapCenter
    const toRadians = (deg: number) => (deg * Math.PI) / 180
    const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const earthRadiusKm = 6371
      const dLat = toRadians(bLat - aLat)
      const dLng = toRadians(bLng - aLng)
      const p =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(aLat)) *
          Math.cos(toRadians(bLat)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p))
      return earthRadiusKm * c
    }

    const inRange = listings.filter((listing) => {
      if (listing.status !== 'active' || listing.deleted_at !== null) return false
      if (typeof listing.location_lat !== 'number' || typeof listing.location_lng !== 'number') return false
      return distanceKm(center[0], center[1], listing.location_lat, listing.location_lng) <= effectiveRadius
    })
    setVisibleListings(inRange)
  }, [effectiveRadius, listings, mapCenter, userLocation])

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
      { timeout: 10000 },
    )
  }, [])

  // Wait for Zustand hydration so we use persisted center/zoom
  if (!hasHydrated) return null

  /* ── Determine which BaseLayer is checked by default based on theme ── */
  const isDark = themeMode === 'dark'
  const effectiveCenter = userLocation ?? mapCenter

  return (
    <div
      className="relative w-full"
      style={{ height: height ?? '55vh', minHeight: height ? undefined : '340px', minWidth: '320px' }}
    >
      <MapContainer
        center={effectiveCenter}
        zoom={mapZoom}
        className="w-full h-full rounded-2xl"
        zoomControl={false}
        ref={mapRef}
        style={{ background: 'var(--color-card-bg)' }}
      >
        {/* ── Layer toggle ───────────────────────────────────────────── */}
        <LayersControl position="topright">
          <LayersControl.BaseLayer name="Street View" checked={!isDark}>
            <TileLayer url={TILES.street.url} attribution={TILES.street.attribution} />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Night View" checked={isDark}>
            <TileLayer url={TILES.night.url} attribution={TILES.night.attribution} />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satellite">
            <TileLayer url={TILES.satellite.url} attribution={TILES.satellite.attribution} />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapEventHandler />

        {/* Radius circle */}
        <Circle
          center={effectiveCenter}
          radius={effectiveRadius * 1000}
          pathOptions={{
            color: goldColor,
            fillColor: goldColor,
            fillOpacity: 0.05,
            weight: 1,
          }}
        />

        {/* Listing markers */}
        {visibleListings.map((listing) => {
          if (listing.location_lat == null || listing.location_lng == null) return null
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
