'use client'

import { useRef, useState, useCallback, type ReactNode } from 'react'

const THRESHOLD = 60 // px the user must pull to trigger a refresh
const MAX_PULL = 100 // cap visual displacement

interface PullToRefreshProps {
  /** Async callback invoked when the user completes a pull gesture */
  onRefresh: () => Promise<void>
  children: ReactNode
}

/**
 * PullToRefresh — wraps a scrollable container and intercepts touch gestures
 * to simulate native pull-to-refresh inside the Pi Browser.
 *
 * Only activates when the inner content is scrolled to the very top
 * (scrollTop ≤ 0) so it never conflicts with normal scroll.
 */
export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)

  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return
      const el = containerRef.current
      if (!el || el.scrollTop > 0) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    },
    [refreshing],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pullingRef.current || refreshing) return
      const currentY = e.touches[0].clientY
      const diff = currentY - startYRef.current
      if (diff > 0) {
        setPullDistance(Math.min(diff, MAX_PULL))
      }
    },
    [refreshing],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true)
      setPullDistance(THRESHOLD) // lock visual at threshold height
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, onRefresh])

  const progress = Math.min(pullDistance / THRESHOLD, 1)

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: refreshing ? THRESHOLD : pullDistance }}
      >
        <div
          className="flex items-center gap-2 text-xs font-medium"
          style={{ color: 'var(--color-gold)', opacity: Math.max(progress, 0.4) }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={refreshing ? 'animate-spin' : ''}
            style={{ transform: `rotate(${progress * 360}deg)` }}
            aria-hidden="true"
          >
            <path
              d="M8 1v4M8 11v4M3.05 3.05l2.83 2.83M10.12 10.12l2.83 2.83M1 8h4M11 8h4M3.05 12.95l2.83-2.83M10.12 5.88l2.83-2.83"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {refreshing ? 'Refreshing…' : 'Pull to refresh'}
        </div>
      </div>

      {children}
    </div>
  )
}
