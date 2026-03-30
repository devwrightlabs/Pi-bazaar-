export default function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <div className="h-4 rounded w-3/4 mb-3" style={{ backgroundColor: 'var(--color-secondary-bg)' }} />
          <div className="h-3 rounded w-1/2 mb-2" style={{ backgroundColor: 'var(--color-secondary-bg)' }} />
          <div className="h-3 rounded w-2/3" style={{ backgroundColor: 'var(--color-secondary-bg)' }} />
        </div>
      ))}
    </div>
  )
}
