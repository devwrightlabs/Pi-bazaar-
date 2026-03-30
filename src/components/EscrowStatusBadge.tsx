'use client'

import type { EscrowTransaction } from '@/lib/types'

const STATUS_CONFIG: Record<
  EscrowTransaction['status'],
  { label: string; color: string; bg: string }
> = {
  pending_payment: { label: 'Pending Payment', color: '#000', bg: '#F0C040' },
  payment_received: { label: 'Payment Received', color: '#fff', bg: '#3B82F6' },
  shipped: { label: 'Shipped', color: '#fff', bg: '#8B5CF6' },
  delivered: { label: 'Delivered', color: '#fff', bg: '#14B8A6' },
  completed: { label: 'Completed', color: '#fff', bg: '#22C55E' },
  disputed: { label: 'Disputed', color: '#fff', bg: '#EF4444' },
  refunded: { label: 'Refunded', color: '#fff', bg: '#888888' },
  auto_released: { label: 'Auto Released', color: '#fff', bg: '#22C55E' },
}

interface EscrowStatusBadgeProps {
  status: EscrowTransaction['status']
  className?: string
}

export default function EscrowStatusBadge({ status, className = '' }: EscrowStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${className}`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}
