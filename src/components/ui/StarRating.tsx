'use client'

import { useId } from 'react'

interface StarRatingProps {
  /** Trust score from 0 to 5 (supports half-stars via decimal values) */
  score: number
  /** Maximum stars to display */
  max?: number
  /** Size of each star in pixels */
  size?: number
  /** Additional CSS classes */
  className?: string
  /** Whether to show the numeric score next to stars */
  showScore?: boolean
}

/**
 * StarRating — Visual 5-star trust score display.
 *
 * Renders filled, half-filled, and empty stars based on a numeric score.
 * Uses the `--color-gold` token for themed star colors.
 */
export default function StarRating({
  score,
  max = 5,
  size = 14,
  className = '',
  showScore = false,
}: StarRatingProps) {
  const instanceId = useId()
  const clamped = Math.max(0, Math.min(score, max))

  return (
    <div className={`inline-flex items-center gap-1 ${className}`} aria-label={`Rating: ${clamped.toFixed(1)} out of ${max}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => {
          const fill = Math.min(1, Math.max(0, clamped - i))
          const clipId = `star-${instanceId}-${i}`
          return (
            <svg
              key={i}
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              {/* Empty star (background) */}
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="var(--color-control-bg)"
              />
              {/* Filled portion via clipPath */}
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={`${fill * 100}%`} height="100%" />
                </clipPath>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="var(--color-gold)"
                clipPath={`url(#${clipId})`}
              />
            </svg>
          )
        })}
      </div>
      {showScore && (
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-subtext)' }}
        >
          {clamped.toFixed(1)}
        </span>
      )}
    </div>
  )
}
