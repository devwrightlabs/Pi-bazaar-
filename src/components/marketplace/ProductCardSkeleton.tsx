export default function ProductCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      {/* Image placeholder */}
      <div
        className="w-full"
        style={{ aspectRatio: '4/3', backgroundColor: 'var(--color-secondary-bg)' }}
      />

      {/* Content placeholder */}
      <div className="p-3 space-y-2">
        {/* Title lines */}
        <div
          className="h-3 rounded"
          style={{ backgroundColor: 'var(--color-secondary-bg)', width: '85%' }}
        />
        <div
          className="h-3 rounded"
          style={{ backgroundColor: 'var(--color-secondary-bg)', width: '60%' }}
        />
        {/* Price */}
        <div
          className="h-4 rounded mt-1"
          style={{ backgroundColor: 'var(--color-secondary-bg)', width: '40%' }}
        />
        {/* Location */}
        <div
          className="h-3 rounded"
          style={{ backgroundColor: 'var(--color-secondary-bg)', width: '50%' }}
        />
      </div>

      {/* Action bar placeholder */}
      <div
        className="flex gap-2 px-3 pb-3"
      >
        <div
          className="h-8 rounded-lg flex-1"
          style={{ backgroundColor: 'var(--color-secondary-bg)' }}
        />
        <div
          className="h-8 rounded-lg flex-1"
          style={{ backgroundColor: 'var(--color-secondary-bg)' }}
        />
      </div>
    </div>
  )
}
