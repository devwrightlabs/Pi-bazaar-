'use client'

import { useUIStore, type ViewMode } from '@/store/useUIStore'

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="11" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="1" y="11" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="16" height="3" rx="1.5" fill="currentColor" />
      <rect x="1" y="7.5" width="16" height="3" rx="1.5" fill="currentColor" />
      <rect x="1" y="13" width="16" height="3" rx="1.5" fill="currentColor" />
    </svg>
  )
}

function SwipeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="4" y="1" width="10" height="16" rx="2.5" fill="currentColor" />
      <path d="M1 9H4M14 9H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M14.5 10.5A6 6 0 1 1 7.5 3.5a4.5 4.5 0 0 0 7 7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3.5" fill="currentColor" />
      <path
        d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.36 13.36l1.41 1.41M3.22 14.78l1.41-1.41M13.36 4.64l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

const VIEW_BUTTONS: { mode: ViewMode; label: string; Icon: () => JSX.Element }[] = [
  { mode: 'grid', label: 'Grid view', Icon: GridIcon },
  { mode: 'list', label: 'List view', Icon: ListIcon },
  { mode: 'swipe', label: 'Swipe view', Icon: SwipeIcon },
]

export default function ControlBar() {
  const viewMode = useUIStore((s) => s.viewMode)
  const themeMode = useUIStore((s) => s.themeMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)

  return (
    <div
      role="toolbar"
      aria-label="View and theme controls"
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 backdrop-blur-md border-b border-border bg-control-bg"
    >
      {/* View mode switcher */}
      <div className="flex items-center gap-1">
        {VIEW_BUTTONS.map(({ mode, label, Icon }) => {
          const isActive = viewMode === mode
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              aria-label={label}
              aria-pressed={isActive}
              className={`p-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-gold bg-control-active'
                  : 'text-text-sub bg-transparent hover:bg-control-bg'
              }`}
            >
              <Icon />
            </button>
          )
        })}
      </div>

      {/* Theme switcher */}
      <button
        onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
        aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className="p-2 rounded-lg transition-colors text-gold bg-control-active"
      >
        {themeMode === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  )
}
