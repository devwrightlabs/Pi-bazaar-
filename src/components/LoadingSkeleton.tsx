interface LoadingSkeletonProps {
  rows?: number
  variant?: 'grid' | 'rows'
}

export default function LoadingSkeleton({ rows = 6, variant = 'grid' }: LoadingSkeletonProps) {
  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--color-card-bg)' }}
          >
            {/* Square image placeholder */}
            <div className="skeleton-shimmer w-full aspect-square" />

            {/* Content area */}
            <div className="p-3 flex flex-col gap-2 flex-1">
              {/* Title bar */}
              <div className="skeleton-shimmer h-3 rounded w-4/5" />
              {/* Price bar */}
              <div className="skeleton-shimmer h-3 rounded w-2/5" />
              {/* Location bar */}
              <div className="skeleton-shimmer h-3 rounded w-3/5" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 px-3 pb-3">
              <div className="skeleton-shimmer flex-1 h-8 rounded-lg" />
              <div className="skeleton-shimmer flex-1 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 'rows' variant — original text-line layout for backward compatibility
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <div className="skeleton-shimmer h-4 rounded w-3/4 mb-3" />
          <div className="skeleton-shimmer h-3 rounded w-1/2 mb-2" />
          <div className="skeleton-shimmer h-3 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}
