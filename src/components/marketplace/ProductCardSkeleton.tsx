export default function ProductCardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}
    >
      {/* Image placeholder */}
      <div className="skeleton-shimmer w-full aspect-square" />

      {/* Content placeholder */}
      <div className="p-3 space-y-2">
        {/* Title line */}
        <div className="skeleton-shimmer h-3 rounded" style={{ width: '85%' }} />
        {/* Subtitle line */}
        <div className="skeleton-shimmer h-3 rounded" style={{ width: '60%' }} />
        {/* Price */}
        <div className="skeleton-shimmer h-4 rounded mt-1" style={{ width: '40%' }} />
        {/* Location */}
        <div className="skeleton-shimmer h-3 rounded" style={{ width: '50%' }} />
      </div>

      {/* Action bar placeholder */}
      <div className="flex gap-2 px-3 pb-3">
        <div className="skeleton-shimmer h-8 rounded-lg flex-1" />
        <div className="skeleton-shimmer h-8 rounded-lg flex-1" />
      </div>
    </div>
  )
}
