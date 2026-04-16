import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ViewMode = 'grid' | 'list' | 'swipe'
export type ThemeMode = 'dark' | 'light'
export type ThemePreset = 'dark' | 'light' | 'midnight' | 'forest'
export type JurisdictionMode = 'local' | 'global'

interface UIState {
  // View
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Theme
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void

  // Theme preset (extends themeMode with additional presets)
  themePreset: ThemePreset
  setThemePreset: (preset: ThemePreset) => void

  // Jurisdiction
  jurisdictionMode: JurisdictionMode
  setJurisdictionMode: (mode: JurisdictionMode) => void

  // Persistent map state
  mapCenter: [number, number]
  mapZoom: number
  setMapCenter: (center: [number, number]) => void
  setMapZoom: (zoom: number) => void

  // Hydration flag — true once client-side rehydration from localStorage completes
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Defaults — these are the SSR-safe values the server will render with
      viewMode: 'grid',
      setViewMode: (mode) => set({ viewMode: mode }),

      themeMode: 'dark',
      setThemeMode: (mode) => set({ themeMode: mode }),

      themePreset: 'dark',
      setThemePreset: (preset) => {
        // Sync themeMode for components that still read it
        const mode: ThemeMode = preset === 'light' ? 'light' : 'dark'
        set({ themePreset: preset, themeMode: mode })
      },

      jurisdictionMode: 'global',
      setJurisdictionMode: (mode) => set({ jurisdictionMode: mode }),

      // Default map center: Nassau, Bahamas
      mapCenter: [25.0343, -77.3963],
      mapZoom: 12,
      setMapCenter: (center) => set({ mapCenter: center }),
      setMapZoom: (zoom) => set({ mapZoom: zoom }),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'pibazaar-ui-preferences',
      storage: createJSONStorage(() => localStorage),

      // Only persist these keys — exclude _hasHydrated and actions
      partialize: (state) => ({
        viewMode: state.viewMode,
        themeMode: state.themeMode,
        themePreset: state.themePreset,
        jurisdictionMode: state.jurisdictionMode,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
      }),

      // skipHydration: the store will NOT auto-rehydrate on creation.
      // We manually trigger rehydration in StoreHydration.tsx inside a
      // useEffect to guarantee the server and initial client render match.
      skipHydration: true,

      // Callback fired after rehydration completes
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.setHasHydrated(true)
          }
        }
      },
    },
  ),
)
