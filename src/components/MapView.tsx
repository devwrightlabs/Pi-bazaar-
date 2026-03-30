'use client'

import { useEffect, useRef, useState } from 'react'
import type { Listing } from '@/lib/types'
import ErrorBoundary from './ErrorBoundary'
import MapFallback from './MapFallback'
import RadiusSlider from './RadiusSlider'
import LoadingSkeleton from './LoadingSkeleton'
import { supabase } from '@/lib/supabase'

const DEFAULT_CENTER: [number, number] = [25.0343, -77.3963]
const DEFAULT_ZOOM = 12

interface MapViewInnerProps {
  center: [number, number]
  zoom: number
  listings: Listing[]
  radius: number
}

function MapViewInner({ center, zoom, listings, radius }: MapViewInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  const markersLayerRef = useRef<import('leaflet').LayerGroup | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let isMounted = true

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default
        // Leaflet CSS is loaded via a <link> tag to avoid TypeScript module resolution issues
        if (!document.querySelector('link[data-leaflet-css]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          link.setAttribute('data-leaflet-css', '1')
          document.head.appendChild(link)
        }

        if (!mapRef.current || !isMounted) return

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }

        const map = L.map(mapRef.current, {
          center,
          zoom,
          zoomControl: true,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map)

        const markersLayer = L.layerGroup().addTo(map)
        markersLayerRef.current = markersLayer
        mapInstanceRef.current = map

        L.circle(center, {
          radius: radius * 1000,
          color: '#F0C040',
          fillColor: '#F0C040',
          fillOpacity: 0.05,
          weight: 1,
        }).addTo(map)

        const goldIcon = L.divIcon({
          html: `<div style="width:24px;height:24px;background:#F0C040;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #000;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        })

        listings.forEach((listing) => {
          if (!listing.location_lat || !listing.location_lng) return
          const marker = L.marker([listing.location_lat, listing.location_lng], { icon: goldIcon })
          const popupContent = document.createElement('div')
          popupContent.style.cssText = 'min-width:180px;font-family:DM Sans,sans-serif;background:#16213E;padding:8px;border-radius:8px;'
          if (listing.images[0]) {
            const img = document.createElement('img')
            img.src = listing.images[0]
            img.alt = listing.title
            img.style.cssText = 'width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;'
            popupContent.appendChild(img)
          }
          const title = document.createElement('div')
          title.textContent = listing.title
          title.style.cssText = 'font-weight:600;font-size:13px;margin-bottom:3px;color:#fff;'
          popupContent.appendChild(title)
          const price = document.createElement('div')
          price.textContent = `${listing.price_pi} Pi`
          price.style.cssText = 'color:#F0C040;font-weight:700;font-size:15px;'
          popupContent.appendChild(price)
          const location = document.createElement('div')
          location.textContent = `${listing.city}, ${listing.country}`
          location.style.cssText = 'color:#888;font-size:11px;margin-top:2px;'
          popupContent.appendChild(location)
          marker.bindPopup(popupContent, { maxWidth: 220 })
          markersLayer.addLayer(marker)
        })
      } catch (err) {
        console.error('Map init error:', err)
      }
    }

    void initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center, zoom, listings, radius])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', minHeight: '400px', borderRadius: '12px' }}
    />
  )
}

export default function MapView() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [radius, setRadius] = useState(50)
  const [locationDenied, setLocationDenied] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationDenied(true)
      setLocationLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude])
        setLocationDenied(false)
        setLocationLoading(false)
      },
      () => {
        setLocationDenied(true)
        setLocationLoading(false)
      },
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('is_active', true)
          .limit(100)
        if (error) throw error
        setListings((data as Listing[]) ?? [])
      } catch (err) {
        console.error('Failed to fetch listings for map:', err)
      } finally {
        setListingsLoading(false)
      }
    }
    void fetchListings()
  }, [])

  const handleRetryLocation = () => {
    setLocationLoading(true)
    setLocationDenied(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude])
        setLocationDenied(false)
        setLocationLoading(false)
      },
      () => {
        setLocationDenied(true)
        setLocationLoading(false)
      },
      { timeout: 8000 }
    )
  }

  const handleManualLocation = (lat: number, lng: number, _city: string) => {
    setCenter([lat, lng])
    setLocationDenied(false)
  }

  if (locationLoading || listingsLoading) {
    return <LoadingSkeleton rows={4} />
  }

  if (mapError) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-6 text-center"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <div className="text-4xl mb-4">🗺️</div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Map unavailable
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
          {mapError}
        </p>
        <button
          onClick={() => setMapError(null)}
          className="px-4 py-2 rounded-lg font-medium text-sm"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <RadiusSlider value={radius} onChange={setRadius} />
      {locationDenied && (
        <MapFallback onLocationFound={handleManualLocation} onRetryLocation={handleRetryLocation} />
      )}
      <ErrorBoundary
        fallback={
          <div
            className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-6 text-center"
            style={{ backgroundColor: 'var(--color-card-bg)' }}
          >
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
              Map failed to load
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
              There was an error rendering the map.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg font-medium text-sm"
              style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
            >
              Reload Page
            </button>
          </div>
        }
      >
        <div style={{ height: '60vh', minHeight: '400px' }}>
          <MapViewInner
            center={center}
            zoom={DEFAULT_ZOOM}
            listings={listings}
            radius={radius}
          />
        </div>
      </ErrorBoundary>
    </div>
  )
}
