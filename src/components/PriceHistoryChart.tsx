'use client'

interface PricePoint {
  price: number
  date: string
}

interface PriceHistoryChartProps {
  history: PricePoint[]
  height?: number
}

const VIEWBOX_W = 400
const VIEWBOX_H = 120
const PAD_LEFT = 52   // room for price labels
const PAD_RIGHT = 12
const PAD_TOP = 12
const PAD_BOTTOM = 28 // room for date labels

function formatPrice(v: number): string {
  return `π ${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function PriceHistoryChart({ history, height = 180 }: PriceHistoryChartProps) {
  if (history.length < 2) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center justify-center"
        style={{
          backgroundColor: 'var(--color-card-bg)',
          minHeight: height,
          color: 'var(--color-subtext)',
          fontSize: '0.875rem',
        }}
      >
        Not enough data yet
      </div>
    )
  }

  const prices = history.map((p) => p.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1 // avoid divide-by-zero

  const chartW = VIEWBOX_W - PAD_LEFT - PAD_RIGHT
  const chartH = VIEWBOX_H - PAD_TOP - PAD_BOTTOM

  // Map each point to SVG coordinates
  const points = history.map((p, i) => {
    const x = PAD_LEFT + (i / (history.length - 1)) * chartW
    const y = PAD_TOP + (1 - (p.price - minPrice) / priceRange) * chartH
    return { x, y, price: p.price, date: p.date }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  const lastPoint = points[points.length - 1]

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-card-bg)', padding: '0 0 4px 0' }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        width="100%"
        height={height}
        style={{ display: 'block' }}
        aria-label="Price history chart"
      >
        {/* Background */}
        <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="var(--color-card-bg)" />

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((t, i) => {
          const y = PAD_TOP + (1 - t) * chartH
          return (
            <line
              key={i}
              x1={PAD_LEFT}
              y1={y}
              x2={VIEWBOX_W - PAD_RIGHT}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          )
        })}

        {/* Price axis labels (min / max) */}
        <text
          x={PAD_LEFT - 4}
          y={PAD_TOP + 4}
          textAnchor="end"
          fontSize="9"
          fill="var(--color-subtext)"
        >
          {formatPrice(maxPrice)}
        </text>
        <text
          x={PAD_LEFT - 4}
          y={PAD_TOP + chartH}
          textAnchor="end"
          fontSize="9"
          fill="var(--color-subtext)"
        >
          {formatPrice(minPrice)}
        </text>

        {/* Gold polyline */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* All data dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill={i === points.length - 1 ? 'var(--color-gold)' : 'var(--color-card-bg)'}
            stroke="var(--color-gold)"
            strokeWidth="2"
          />
        ))}

        {/* Date labels: first and last */}
        <text
          x={PAD_LEFT}
          y={VIEWBOX_H - 4}
          textAnchor="start"
          fontSize="9"
          fill="var(--color-subtext)"
        >
          {formatDate(history[0].date)}
        </text>
        <text
          x={VIEWBOX_W - PAD_RIGHT}
          y={VIEWBOX_H - 4}
          textAnchor="end"
          fontSize="9"
          fill="var(--color-subtext)"
        >
          {formatDate(history[history.length - 1].date)}
        </text>

        {/* Current price label above last dot */}
        <text
          x={lastPoint.x}
          y={lastPoint.y - 8}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--color-gold)"
        >
          {formatPrice(lastPoint.price)}
        </text>
      </svg>
    </div>
  )
}
