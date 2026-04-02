'use client'

import { useState } from 'react'

interface Props {
  onLocationFound: (lat: number, lng: number, city: string) => void
  onRetryLocation: () => void
}

export default function MapFallback({ onLocationFound, onRetryLocation }: Props) {
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    const trimmed = city.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`
      )
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (data.length === 0) {
        setError('City not found. Please try a different name.')
        return
      }
      const { lat, lon, display_name } = data[0]
      onLocationFound(parseFloat(lat), parseFloat(lon), display_name ?? trimmed)
    } catch {
      setError('Failed to search location. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center p-6 rounded-2xl text-center"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      <h3
        className="text-lg font-semibold mb-2"
        style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
      >
        Location Access Denied
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--color-subtext)' }}>
        Enter your city to find nearby listings
      </p>

      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
          placeholder="Enter city name..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-secondary-bg)',
            color: 'var(--color-text)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        {error && (
          <p className="text-xs" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        )}
        <button
          onClick={() => void handleSearch()}
          disabled={loading || !city.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          {loading ? 'Searching...' : 'Search City'}
        </button>
        <button
          onClick={onRetryLocation}
          className="w-full py-3 rounded-xl text-sm font-medium border"
          style={{
            borderColor: 'var(--color-gold)',
            color: 'var(--color-gold)',
            backgroundColor: 'transparent',
          }}
        >
          Retry Location Access
        </button>
      </div>
    </div>
  )
}
