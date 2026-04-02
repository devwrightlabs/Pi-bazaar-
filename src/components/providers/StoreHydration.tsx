'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'

/**
 * StoreHydration
 * ──────────────
 * Manually triggers Zustand persist rehydration on the client AFTER the
 * initial server render. This guarantees the server and first client paint
 * share the same default state ('grid' + 'dark'), eliminating all React
 * hydration mismatch errors.
 *
 * Once rehydration completes, the onRehydrateStorage callback inside
 * useUIStore sets _hasHydrated = true, and downstream consumers re-render
 * with the user's persisted preferences.
 */
export default function StoreHydration() {
  useEffect(() => {
    void useUIStore.persist.rehydrate()
  }, [])

  return null
}
