'use client'

import type { EscrowTimelineEvent, EscrowTransaction } from '@/lib/types'

const STEP_ORDER: EscrowTransaction['status'][] = [
  'pending_payment',
  'payment_received',
  'shipped',
  'delivered',
  'completed',
]

const STEP_LABELS: Record<string, { icon: string; label: string }> = {
  pending_payment: { icon: '\u23f3', label: 'Awaiting Payment' },
  payment_received: { icon: '\u{1f4b0}', label: 'Payment Received' },
  shipped: { icon: '\u{1f4e6}', label: 'Item Shipped' },
  delivered: { icon: '\u2705', label: 'Item Delivered' },
  completed: { icon: '\u{1f3c6}', label: 'Order Complete' },
  disputed: { icon: '\u26a0\ufe0f', label: 'Dispute Opened' },
  refunded: { icon: '\u21a9\ufe0f', label: 'Refunded' },
  auto_released: { icon: '\u23f0', label: 'Auto Released' },
}

interface EscrowTimelineProps {
  currentStatus: EscrowTransaction['status']
  timeline: EscrowTimelineEvent[]
  productType: 'physical' | 'digital'
}

export default function EscrowTimeline({ currentStatus, timeline, productType }: EscrowTimelineProps) {
  const steps = productType === 'digital'
    ? STEP_ORDER.filter((s) => s !== 'shipped')
    : STEP_ORDER

  const currentIndex = steps.indexOf(currentStatus)

  const timelineMap: Record<string, EscrowTimelineEvent> = {}
  for (const event of timeline) {
    timelineMap[event.event] = event
  }

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex || currentStatus === 'completed' || currentStatus === 'auto_released'
        const isActive = step === currentStatus
        const isFuture = idx > currentIndex && currentStatus !== 'completed' && currentStatus !== 'auto_released'
        const cfg = STEP_LABELS[step]
        const event = timelineMap[step]

        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2"
                style={{
                  backgroundColor: isActive
                    ? '#F0C040'
                    : isCompleted
                    ? '#22C55E'
                    : '#16213E',
                  borderColor: isActive
                    ? '#F0C040'
                    : isCompleted
                    ? '#22C55E'
                    : '#333',
                  color: isActive ? '#000' : isCompleted ? '#fff' : '#888',
                }}
              >
                {isCompleted ? '\u2713' : cfg.icon}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className="w-0.5 flex-1 min-h-8"
                  style={{ backgroundColor: isCompleted ? '#22C55E' : '#333' }}
                />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p
                className="font-semibold text-sm"
                style={{
                  color: isActive ? '#F0C040' : isCompleted ? '#22C55E' : isFuture ? '#888' : '#fff',
                  fontFamily: 'Sora, sans-serif',
                }}
              >
                {cfg.label}
              </p>
              {event && (
                <>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                    {event.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#666' }}>
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </div>
        )
      })}

      {(currentStatus === 'disputed' || currentStatus === 'refunded') && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2"
              style={{ backgroundColor: currentStatus === 'disputed' ? '#EF4444' : '#888', borderColor: currentStatus === 'disputed' ? '#EF4444' : '#888', color: '#fff' }}
            >
              {STEP_LABELS[currentStatus]?.icon}
            </div>
          </div>
          <div className="pb-6 pt-1">
            <p className="font-semibold text-sm" style={{ color: currentStatus === 'disputed' ? '#EF4444' : '#888', fontFamily: 'Sora, sans-serif' }}>
              {STEP_LABELS[currentStatus]?.label}
            </p>
            {timelineMap[currentStatus] && (
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                {timelineMap[currentStatus].description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
