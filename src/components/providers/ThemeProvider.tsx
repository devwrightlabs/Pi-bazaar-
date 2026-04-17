'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useStore } from '@/store/useStore'

/**
 * ThemeProvider
 * ─────────────
 * Syncs the Zustand `themePreset` value to `document.documentElement` via the
 * `data-theme` attribute, and applies any custom CSS variable overrides from
 * `themeVars` in the app store.
 *
 * Runs inside a useEffect so the server render is always clean (no data-theme
 * attribute → :root dark defaults apply).
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themePreset = useUIStore((state) => state.themePreset)
  const hasHydrated = useUIStore((state) => state._hasHydrated)
  const themeVars = useStore((state) => state.themeVars)

  // On very first render (before hydration), apply the safe default
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  // After hydration, sync the persisted preset
  useEffect(() => {
    if (hasHydrated) {
      document.documentElement.setAttribute('data-theme', themePreset)
    }
  }, [themePreset, hasHydrated])

  // Apply custom CSS variable overrides from themeVars store
  useEffect(() => {
    Object.entries(themeVars).forEach(([key, value]) => {
      const trimmed = value.trim()
      if (!trimmed) {
        document.documentElement.style.removeProperty(key)
        return
      }
      document.documentElement.style.setProperty(key, trimmed)
    })
  }, [themeVars])

  return <>{children}</>
}
