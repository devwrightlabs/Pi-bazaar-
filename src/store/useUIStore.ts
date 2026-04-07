import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ViewMode = 'grid' | 'list' | 'swipe'
export type ThemeMode = 'dark' | 'light'
export type JurisdictionMode = 'local' | 'global'

interface UIState {
  // View
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Theme
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void

  // Jurisdiction
  jurisdictionMode: JurisdictionMode
  setJurisdictionMode: (mode: JurisdictionMode) => void

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

      jurisdictionMode: 'global',
      setJurisdictionMode: (mode) => set({ jurisdictionMode: mode }),

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
        jurisdictionMode: state.jurisdictionMode,
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
