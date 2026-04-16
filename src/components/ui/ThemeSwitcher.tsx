'use client'

import { useState, useCallback } from 'react'
import { useUIStore, type ThemePreset } from '@/store/useUIStore'
import { useStore } from '@/store/useStore'

/* ─── Preset definitions ──────────────────────────────────────────────── */

interface PresetConfig {
  key: ThemePreset
  label: string
  swatch: string
  description: string
}

const PRESETS: PresetConfig[] = [
  { key: 'dark', label: 'Dark', swatch: '#0A0A0F', description: 'Default dark theme' },
  { key: 'light', label: 'Light', swatch: '#F5F5F7', description: 'Clean light theme' },
  { key: 'midnight', label: 'Midnight Blue', swatch: '#0B1120', description: 'Deep blue theme' },
  { key: 'forest', label: 'Forest', swatch: '#0A120A', description: 'Natural green theme' },
]

/* ─── Customizable CSS variable keys ──────────────────────────────────── */

const CUSTOM_KEYS = [
  { key: '--color-background', label: 'Background' },
  { key: '--color-card-bg', label: 'Card' },
  { key: '--color-text', label: 'Text' },
  { key: '--color-subtext', label: 'Subtext' },
  { key: '--color-gold', label: 'Accent' },
] as const

/* ─── Component ───────────────────────────────────────────────────────── */

export default function ThemeSwitcher() {
  const themePreset = useUIStore((s) => s.themePreset)
  const setThemePreset = useUIStore((s) => s.setThemePreset)
  const themeVars = useStore((s) => s.themeVars)
  const setThemeVars = useStore((s) => s.setThemeVars)

  const [showCustom, setShowCustom] = useState(false)
  const [draftVars, setDraftVars] = useState<Record<string, string>>({})

  const handlePresetSelect = useCallback(
    (preset: ThemePreset) => {
      setThemePreset(preset)
      // Clear custom overrides when switching to a preset
      setThemeVars({})
      setDraftVars({})
    },
    [setThemePreset, setThemeVars],
  )

  const handleColorChange = useCallback(
    (cssVar: string, value: string) => {
      setDraftVars((prev) => ({ ...prev, [cssVar]: value }))
      const next = { ...themeVars, [cssVar]: value }
      setThemeVars(next)
    },
    [themeVars, setThemeVars],
  )

  const handleReset = useCallback(() => {
    setThemeVars({})
    setDraftVars({})
  }, [setThemeVars])

  return (
    <div className="space-y-4">
      {/* Preset grid */}
      <div>
        <p
          className="text-xs font-semibold mb-2 uppercase tracking-wider"
          style={{ color: 'var(--color-subtext)' }}
        >
          Theme Presets
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const isActive = themePreset === preset.key
            return (
              <button
                key={preset.key}
                onClick={() => handlePresetSelect(preset.key)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 min-h-[44px] transition-all duration-200"
                style={{
                  backgroundColor: isActive
                    ? 'var(--color-control-active)'
                    : 'var(--color-card-bg)',
                  border: isActive
                    ? '2px solid var(--color-gold)'
                    : '1px solid var(--color-border)',
                }}
                aria-pressed={isActive}
                aria-label={`Select ${preset.label} theme`}
              >
                <span
                  className="w-6 h-6 rounded-full shrink-0 border"
                  style={{
                    backgroundColor: preset.swatch,
                    borderColor: preset.swatch === '#F5F5F7' ? '#ccc' : 'transparent',
                  }}
                />
                <div className="text-left min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {preset.label}
                  </p>
                  <p
                    className="text-[10px] truncate"
                    style={{ color: 'var(--color-subtext)' }}
                  >
                    {preset.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom toggle */}
      <button
        onClick={() => setShowCustom((v) => !v)}
        className="flex items-center gap-2 w-full rounded-xl px-3 py-3 min-h-[44px] transition-colors"
        style={{
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-border)',
        }}
        aria-expanded={showCustom}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Custom Colors
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-subtext)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-auto transition-transform duration-200"
          style={{ transform: showCustom ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Custom color pickers */}
      {showCustom && (
        <div
          className="rounded-xl p-3 space-y-3"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          {CUSTOM_KEYS.map(({ key, label }) => {
            const currentValue =
              draftVars[key] ||
              themeVars[key] ||
              (typeof window !== 'undefined'
                ? getComputedStyle(document.documentElement).getPropertyValue(key).trim()
                : '')
            return (
              <label key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={currentValue || '#000000'}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                  style={{ minWidth: '32px', minHeight: '32px' }}
                  aria-label={`Pick color for ${label}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {label}
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--color-subtext)' }}>
                    {currentValue || 'auto'}
                  </p>
                </div>
              </label>
            )
          })}

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="w-full py-2 rounded-lg text-xs font-semibold min-h-[44px] transition-colors"
            style={{
              backgroundColor: 'var(--color-control-bg)',
              color: 'var(--color-error)',
            }}
          >
            Reset to Preset Defaults
          </button>
        </div>
      )}
    </div>
  )
}
