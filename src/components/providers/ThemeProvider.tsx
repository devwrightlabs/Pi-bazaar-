'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'

/**
 * ThemeProvider
 * ─────────────
 * Syncs the Zustand `themeMode` value to `document.documentElement` via the
 * `data-theme` attribute. Runs inside a useEffect so the server render is
 * always clean (no data-theme attribute → :root dark defaults apply).
 *
 * On mount (after StoreHydration triggers rehydrate), this component reads
 * the persisted themeMode and applies `data-theme="dark"` or `"light"`,
 * which swaps all CSS custom properties defined in globals.css.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useUIStore((state) => state.themeMode)
  const hasHydrated = useUIStore((state) => state._hasHydrated)

  // On very first render (before hydration), apply the safe default
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  // After hydration, sync the persisted preference
  useEffect(() => {
    if (hasHydrated) {
      document.documentElement.setAttribute('data-theme', themeMode)
    }
  }, [themeMode, hasHydrated])

  return <>{children}</>
}
