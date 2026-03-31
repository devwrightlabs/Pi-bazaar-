'use client'

import { useState } from 'react'

interface Props {
  city: string
  country: string
  onCityChange: (city: string) => void
  onCountryChange: (country: string) => void
}

export default function LocationPicker({ city, country, onCityChange, onCountryChange }: Props) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      className="px-4 py-3 rounded-xl"
      style={{
        backgroundColor: 'var(--color-background)',
        border: '1px solid rgba(136,136,136,0.3)',
      }}
    >
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-between text-sm"
        >
          <span className="flex items-center gap-2" style={{ color: city ? 'var(--color-text)' : 'var(--color-subtext)' }}>
            <span>&#128205;</span>
            {city && country ? `${city}, ${country}` : 'Set your location'}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-gold)' }}>
            Edit
          </span>
        </button>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="City"
            autoFocus
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
          />
          <div className="h-px" style={{ backgroundColor: 'rgba(136,136,136,0.2)' }} />
          <input
            type="text"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            placeholder="Country"
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text)' }}
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-medium"
            style={{ color: 'var(--color-gold)' }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
