'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface Props {
  value: number
  onChange: (value: number) => void
}

export default function RadiusSlider({ value, onChange }: Props) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const debouncedOnChange = useDebouncedCallback((val: number) => {
    onChange(val)
  }, 300)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value)
      setLocalValue(val)
      debouncedOnChange(val)
    },
    [debouncedOnChange]
  )

  return (
    <div
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Search Radius
        </span>
        <span
          className="text-sm font-bold px-2 py-1 rounded-lg"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          {localValue} km
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={500}
        value={localValue}
        onChange={handleChange}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          accentColor: 'var(--color-gold)',
          backgroundColor: 'var(--color-secondary-bg)',
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>1 km</span>
        <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>500 km</span>
      </div>
    </div>
  )
}
