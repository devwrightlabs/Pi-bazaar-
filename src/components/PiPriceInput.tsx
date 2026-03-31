'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import type { PiPriceResponse } from '@/lib/types'

interface Props {
  value: number
  onChange: (value: number) => void
}

export default function PiPriceInput({ value, onChange }: Props) {
  const [piPriceUsd, setPiPriceUsd] = useState<number | null>(null)
  const [priceError, setPriceError] = useState(false)
  const [localValue, setLocalValue] = useState(value === 0 ? '' : String(value))

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/pi-price')
      if (!res.ok) {
        setPriceError(true)
        return
      }
      const data = (await res.json()) as PiPriceResponse & { error?: string }
      if (data.error) {
        setPriceError(true)
      } else {
        setPiPriceUsd(data.price_usd)
        setPriceError(false)
      }
    } catch {
      setPriceError(true)
    }
  }, [])

  useEffect(() => {
    void fetchPrice()
  }, [fetchPrice])

  const debouncedOnChange = useDebouncedCallback((val: number) => {
    onChange(val)
  }, 500)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setLocalValue(raw)
    // Don't call onChange for incomplete decimal input (e.g. "5." or "")
    if (raw === '' || raw === '.') return
    const num = parseFloat(raw)
    if (!isNaN(num) && num >= 0) {
      debouncedOnChange(num)
    }
  }

  const numericValue = parseFloat(localValue) || 0
  const usdEquiv =
    piPriceUsd !== null && numericValue > 0
      ? `\u2248 $${(numericValue * piPriceUsd).toFixed(2)} USD`
      : null

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid rgba(136,136,136,0.3)',
        }}
      >
        <span className="text-lg font-bold" style={{ color: 'var(--color-gold)' }}>
          \u03c0
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={localValue}
          onChange={handleChange}
          placeholder="0.00"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--color-text)' }}
        />
        <span className="text-sm" style={{ color: 'var(--color-subtext)' }}>
          Pi
        </span>
      </div>
      {localValue && numericValue > 0 && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-subtext)' }}>
          {numericValue.toFixed(2)} \u03c0{' '}
          {priceError ? (
            <span style={{ color: 'var(--color-error)' }}>Rate unavailable</span>
          ) : usdEquiv ? (
            <span style={{ color: 'var(--color-gold)' }}>{usdEquiv}</span>
          ) : (
            <span>Loading rate...</span>
          )}
        </p>
      )}
    </div>
  )
}
