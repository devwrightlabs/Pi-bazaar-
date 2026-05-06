'use client'

import { useState } from 'react'

interface ScheduleListingInputProps {
  value: string | null
  onChange: (v: string | null) => void
}

export default function ScheduleListingInput({ value, onChange }: ScheduleListingInputProps) {
  const [enabled, setEnabled] = useState(value !== null)

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    if (!checked) {
      onChange(null)
    }
  }

  // Compute min datetime (now, rounded up to the next minute)
  const minDateTime = (() => {
    const d = new Date()
    d.setSeconds(0, 0)
    d.setMinutes(d.getMinutes() + 1)
    return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
  })()

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--color-secondary-bg)' }}
    >
      {/* Toggle row */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <div
            className="w-10 h-6 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: enabled ? 'var(--color-gold)' : 'rgba(255,255,255,0.15)',
            }}
          />
          <div
            className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
            style={{
              transform: enabled ? 'translateX(16px)' : 'translateX(0)',
            }}
          />
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          Schedule for later?
        </span>
      </label>

      {/* Datetime picker — only shown when enabled */}
      {enabled && (
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium"
            style={{ color: 'var(--color-subtext)' }}
          >
            Go live at
          </label>
          <input
            type="datetime-local"
            min={minDateTime}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
            style={{
              backgroundColor: 'var(--color-card-bg)',
              color: 'var(--color-text)',
              borderColor: 'rgba(240,192,64,0.3)',
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = 'var(--color-gold)')
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = 'rgba(240,192,64,0.3)')
            }
          />
        </div>
      )}
    </div>
  )
}
