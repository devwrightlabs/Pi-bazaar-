'use client'

import { useRef, useState, useCallback } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

const THRESHOLD = 80
const MAX_PULL = 120

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const startYRef = useRef<number>(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullingRef = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || refreshing) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) {
      setPullDistance(Math.min(delta, MAX_PULL))
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true)
      setPullDistance(THRESHOLD)
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

  const isPastThreshold = pullDistance >= THRESHOLD
  const indicatorVisible = pullDistance > 0 || refreshing

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
      onTouchCancel={() => void handleTouchEnd()}
      style={{ touchAction: pullDistance > 0 ? 'pan-x' : undefined }}
    >
      {/* Pull indicator */}
      <div
        style={{
          overflow: 'hidden',
          height: indicatorVisible ? `${refreshing ? THRESHOLD : pullDistance}px` : 0,
          transition: pullingRef.current ? undefined : 'height 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-background)',
        }}
      >
        {refreshing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)' }}>
            {/* Spinner */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="animate-spin"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6" stroke="var(--color-gold)" strokeWidth="2" strokeDasharray="20 18" />
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>Refreshing...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)' }}>
            {/* Arrow */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: isPastThreshold ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: 'var(--color-gold)',
              }}
              aria-hidden="true"
            >
              <path
                d="M8 3v10M4 9l4 4 4-4"
                stroke="var(--color-gold)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              {isPastThreshold ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
