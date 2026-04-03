'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import type { EscrowTransaction, EscrowTimelineEvent } from '@/lib/types'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import EscrowStatusBadge from '@/components/EscrowStatusBadge'
import EscrowTimeline from '@/components/EscrowTimeline'
import AutoReleaseCountdown from '@/components/AutoReleaseCountdown'
import TrackingInput from '@/components/TrackingInput'
import DigitalDeliveryForm from '@/components/DigitalDeliveryForm'
import DisputeForm from '@/components/DisputeForm'
import Modal from '@/components/Modal'

type OrderDetail = EscrowTransaction & { timeline: EscrowTimelineEvent[] }

interface OrderDetailContentProps {
  orderId: string
}

function OrderDetailContent({ orderId }: OrderDetailContentProps) {
  const router = useRouter()
  const { currentUser, fetchOrderDetail, currentOrder, confirmReceipt, openDispute, openModal } = useStore()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showShipModal, setShowShipModal] = useState(false)
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchOrderDetail(orderId).finally(() => setLoading(false))
  }, [orderId, fetchOrderDetail])

  if (loading) return <LoadingSkeleton rows={6} variant="rows" />
  if (!currentOrder) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: 'var(--color-subtext)' }}>Order not found.</p>
      </div>
    )
  }

  const order = currentOrder as OrderDetail
  const isBuyer = currentUser?.id === order.buyer_id
  const isSeller = currentUser?.id === order.seller_id

  const handleConfirm = async () => {
    setActionLoading(true)
    const ok = await confirmReceipt(order.id)
    setActionLoading(false)
    if (ok) {
      openModal({ title: 'Receipt Confirmed', message: 'Pi has been released to the seller. Thank you!', variant: 'info' })
      await fetchOrderDetail(order.id)
    } else {
      openModal({ title: 'Error', message: 'Failed to confirm receipt. Please try again.', variant: 'alert' })
    }
  }

  const handleShip = async (tracking: string, carrier: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/escrow/${order.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_number: tracking, shipping_carrier: carrier }),
      })
      if (!res.ok) throw new Error('Ship failed')
      setShowShipModal(false)
      await fetchOrderDetail(order.id)
    } catch {
      openModal({ title: 'Error', message: 'Failed to update shipment. Please try again.', variant: 'alert' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeliver = async (proof: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/escrow/${order.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_proof: proof }),
      })
      if (!res.ok) throw new Error('Deliver failed')
      setShowDeliverModal(false)
      await fetchOrderDetail(order.id)
    } catch {
      openModal({ title: 'Error', message: 'Failed to mark as delivered. Please try again.', variant: 'alert' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDispute = async (reason: string, description: string, evidence_urls: string[]) => {
    setActionLoading(true)
    const ok = await openDispute(order.id, reason, description, evidence_urls)
    setActionLoading(false)
    if (ok) {
      setShowDisputeModal(false)
      openModal({ title: 'Dispute Opened', message: 'Your dispute has been submitted. Our team will review it shortly.', variant: 'info' })
      await fetchOrderDetail(order.id)
    } else {
      openModal({ title: 'Error', message: 'Failed to open dispute. Please try again.', variant: 'alert' })
    }
  }

  const canConfirm = isBuyer && (order.status === 'shipped' || order.status === 'delivered')
  const canShip = isSeller && order.status === 'payment_received' && order.product_type === 'physical'
  const canDeliver = isSeller && order.status === 'payment_received' && order.product_type === 'digital'
  const canDispute = isBuyer && ['payment_received', 'shipped', 'delivered'].includes(order.status)

  return (
    <main className="min-h-screen pb-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-xl" style={{ color: 'var(--color-gold)' }}>
            ←
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}>
            Order Detail
          </h1>
          <div className="ml-auto">
            <EscrowStatusBadge status={order.status} />
          </div>
        </div>

        {/* Order summary */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Order ID</span>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text)' }}>{order.id.slice(0, 8)}…</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Type</span>
            <span style={{ color: 'var(--color-text)', textTransform: 'capitalize' }}>{order.product_type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Amount</span>
            <span className="font-bold" style={{ color: 'var(--color-gold)' }}>{order.amount_pi} π</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Escrow Fee</span>
            <span style={{ color: 'var(--color-subtext)' }}>{order.escrow_fee_pi} π</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Seller Receives</span>
            <span style={{ color: '#22C55E' }}>{order.net_amount_pi} π</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Date</span>
            <span style={{ color: 'var(--color-text)' }}>{new Date(order.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Tracking info (buyer view, shipped) */}
        {order.status === 'shipped' && order.tracking_number && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid #8B5CF6' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#8B5CF6' }}>{'\u{1f4e6}'} Shipment Info</p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Carrier: <strong>{order.shipping_carrier}</strong>
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Tracking: <strong>{order.tracking_number}</strong>
            </p>
          </div>
        )}

        {/* Digital delivery proof */}
        {order.delivery_proof && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid #14B8A6' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#14B8A6' }}>{'\u{1f4e5}'} Delivery Proof</p>
            <a
              href={order.delivery_proof}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm break-all"
              style={{ color: 'var(--color-gold)' }}
            >
              {order.delivery_proof}
            </a>
          </div>
        )}

        {/* Auto-release countdown */}
        {!['completed', 'disputed', 'refunded', 'auto_released'].includes(order.status) && (
          <AutoReleaseCountdown autoReleaseAt={order.auto_release_at} />
        )}

        {/* Buyer actions */}
        {isBuyer && (
          <div className="space-y-2">
            {canConfirm && (
              <button
                onClick={() => void handleConfirm()}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#22C55E', color: '#fff', opacity: actionLoading ? 0.6 : 1 }}
              >
                {actionLoading ? 'Processing…' : '\u2713 Confirm Receipt'}
              </button>
            )}
            {canDispute && (
              <button
                onClick={() => setShowDisputeModal(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444' }}
              >
                Open Dispute
              </button>
            )}
          </div>
        )}

        {/* Seller actions */}
        {isSeller && (
          <div className="space-y-2">
            {canShip && (
              <button
                onClick={() => setShowShipModal(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
              >
              {'\u{1f69a}'} Mark as Shipped
              </button>
            )}
            {canDeliver && (
              <button
                onClick={() => setShowDeliverModal(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#14B8A6', color: '#fff' }}
              >
              {'\u{1f4e4}'} Deliver Item
              </button>
            )}
            {['payment_received', 'shipped', 'delivered', 'completed'].includes(order.status) && (
              <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-subtext)' }}>
                {order.status === 'completed'
                  ? '\u2705 Payout released \u2014 Pi has been sent to your wallet.'
                  : `Payout will be released when buyer confirms receipt or auto-release occurs.`}
              </div>
            )}
          </div>
        )}

        {/* Message button */}
        <button
          onClick={() => router.push('/chat')}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-gold)', border: '1px solid rgba(240,192,64,0.3)' }}
        >
          {'\u{1f4ac}'} Message {isBuyer ? 'Seller' : 'Buyer'}
        </button>

        {/* Timeline */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
            Order Timeline
          </h2>
          <EscrowTimeline
            currentStatus={order.status}
            timeline={order.timeline}
            productType={order.product_type}
          />
        </div>
      </div>

      {/* Ship modal */}
      {showShipModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
              Enter Tracking Info
            </h3>
            <TrackingInput onSubmit={handleShip} loading={actionLoading} />
            <button
              onClick={() => setShowShipModal(false)}
              className="w-full py-2 text-sm"
              style={{ color: 'var(--color-subtext)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deliver modal */}
      {showDeliverModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
              Deliver Digital Item
            </h3>
            <DigitalDeliveryForm onSubmit={handleDeliver} loading={actionLoading} />
            <button
              onClick={() => setShowDeliverModal(false)}
              className="w-full py-2 text-sm"
              style={{ color: 'var(--color-subtext)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h3 className="font-bold text-lg" style={{ color: '#EF4444', fontFamily: 'Sora, sans-serif' }}>
              Open Dispute
            </h3>
            <DisputeForm onSubmit={handleDispute} loading={actionLoading} />
            <button
              onClick={() => setShowDisputeModal(false)}
              className="w-full py-2 text-sm"
              style={{ color: 'var(--color-subtext)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default function OrderDetailPage({ params }: PageProps) {
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ orderId: id }) => setOrderId(id))
  }, [params])

  if (!orderId) return <LoadingSkeleton rows={6} variant="rows" />

  return (
    <ErrorBoundary>
      <OrderDetailContent orderId={orderId} />
    </ErrorBoundary>
  )
}
