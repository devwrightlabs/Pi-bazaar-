'use client'

import Link from 'next/link'
import type { EscrowTransaction } from '@/lib/types'
import EscrowStatusBadge from './EscrowStatusBadge'

interface OrderCardProps {
  order: EscrowTransaction
  listingTitle?: string
  listingImage?: string
}

export default function OrderCard({ order, listingTitle, listingImage }: OrderCardProps) {
  const formattedDate = new Date(order.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Link href={`/orders/${order.id}`}>
      <div
        className="flex gap-3 rounded-xl p-3 cursor-pointer transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-3xl overflow-hidden"
          style={{ backgroundColor: '#0A0A0F' }}
        >
          {listingImage ? (
            <img src={listingImage} alt={listingTitle ?? 'Order'} className="w-full h-full object-cover" />
          ) : (
            <span>📦</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
            {listingTitle ?? 'Order'}
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-gold)' }}>
            {order.amount_pi} \u03c0
          </p>
          <div className="flex items-center justify-between mt-2">
            <EscrowStatusBadge status={order.status} />
            <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
