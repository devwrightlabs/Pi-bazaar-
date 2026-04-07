import type { HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Preset shape: 'line' (default), 'circle', 'card' */
  shape?: 'line' | 'circle' | 'card'
}

export function Skeleton({ shape = 'line', className = '', ...props }: SkeletonProps) {
  const shapeStyles: Record<NonNullable<SkeletonProps['shape']>, string> = {
    line: 'h-4 w-full rounded',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full rounded-xl',
  }

  return (
    <div
      className={`skeleton-shimmer ${shapeStyles[shape]} ${className}`}
      {...props}
    />
  )
}
