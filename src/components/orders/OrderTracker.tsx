'use client'

/**
 * OrderTracker — Visual timeline + action buttons for escrow orders
 *
 * Displays:
 *   • A step-based timeline (Pending → Funded in Escrow → Shipped → Completed / Disputed)
 *   • "Confirm Receipt" and "Open Dispute" buttons for the buyer
 *   • Auto-release countdown
 *   • Full error handling with user-friendly messages
 *
 * Fetches data from `/api/escrow` and `/api/escrow/[orderId]`.
 * All colours use CSS custom properties; layout is mobile-first (min 320 px).
 */

import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import type { EscrowTransaction, EscrowTimelineEvent } from '@/lib/types'
import EscrowTimeline from '@/components/EscrowTimeline'
import EscrowStatusBadge from '@/components/EscrowStatusBadge'
import AutoReleaseCountdown from '@/components/AutoReleaseCountdown'
import DisputeForm from '@/components/DisputeForm'

/* ─── Types ──────────────────────────────────────────────────────────────── */

type OrderDetail = EscrowTransaction & { timeline: EscrowTimelineEvent[] }

interface OrderTrackerProps {
  /** The escrow order ID to display */
  orderId: string
  /** Called when the user wants to go back */
  onBack?: () => void
}

/* ─── Toast helper (inline) ──────────────────────────────────────────────── */

function InlineToast({ message, variant }: { message: string; variant: 'success' | 'error' }) {
  return (
    <div
      className="px-4 py-3 rounded-xl text-sm text-center font-medium"
      style={{
        backgroundColor: variant === 'success'
          ? 'rgba(34, 197, 94, 0.15)'
          : 'rgba(239, 68, 68, 0.15)',
        color: variant === 'success' ? 'var(--color-success)' : 'var(--color-error)',
      }}
    >
      {message}
    </div>
  )
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function OrderTracker({ orderId, onBack }: OrderTrackerProps) {
  const { currentUser, fetchOrderDetail, currentOrder, confirmReceipt, openDispute } = useStore()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const [showDisputeModal, setShowDisputeModal] = useState(false)

  /* ── Show toast for 4 s ────────────────────────────────────────────────── */

  const showToast = useCallback((message: string, variant: 'success' | 'error') => {
    setToast({ message, variant })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Fetch order detail ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchOrderDetail(orderId)
      .catch(() => showToast('Failed to load order details.', 'error'))
      .finally(() => setLoading(false))
  }, [orderId, fetchOrderDetail, showToast])

  /* ── Actions ───────────────────────────────────────────────────────────── */

  const handleConfirmReceipt = async () => {
    setActionLoading(true)
    try {
      const ok = await confirmReceipt(orderId)
      if (ok) {
        showToast('Receipt confirmed – Pi released to seller!', 'success')
        await fetchOrderDetail(orderId)
      } else {
        showToast('Failed to confirm receipt. Try again.', 'error')
      }
    } catch {
      showToast('An unexpected error occurred.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenDispute = async (reason: string, description: string, evidenceUrls: string[]) => {
    setActionLoading(true)
    try {
      const ok = await openDispute(orderId, reason, description, evidenceUrls)
      if (ok) {
        setShowDisputeModal(false)
        showToast('Dispute opened. Our team will review it.', 'success')
        await fetchOrderDetail(orderId)
      } else {
        showToast('Failed to open dispute. Try again.', 'error')
      }
    } catch {
      showToast('An unexpected error occurred.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  /* ── Loading skeleton ──────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div
        className="min-h-screen min-w-[320px] px-4 pt-6"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="max-w-lg mx-auto space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-12 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  /* ── Order not found ───────────────────────────────────────────────────── */

  if (!currentOrder) {
    return (
      <div
        className="min-h-screen min-w-[320px] flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <p className="text-4xl mb-4">📦</p>
        <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Order not found
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
          This order may have been removed or the link is invalid.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            Go Back
          </button>
        )}
      </div>
    )
  }

  const order = currentOrder as OrderDetail
  const isBuyer = currentUser?.id === order.buyer_id

  const canConfirm = isBuyer && ['shipped', 'delivered'].includes(order.status)
  const canDispute = isBuyer && ['payment_received', 'shipped', 'delivered'].includes(order.status)

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div
      className="min-h-screen min-w-[320px] pb-24"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-xl"
              style={{ color: 'var(--color-gold)' }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <h1
            className="text-xl font-bold flex-1"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Order Tracker
          </h1>
          <EscrowStatusBadge status={order.status} />
        </div>

        {/* ── Toast ──────────────────────────────────────────────────────── */}
        {toast && <InlineToast message={toast.message} variant={toast.variant} />}

        {/* ── Order summary card ─────────────────────────────────────────── */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Order ID</span>
            <span className="font-mono text-xs" style={{ color: 'var(--color-text)' }}>
              {order.id.slice(0, 8)}…
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Type</span>
            <span style={{ color: 'var(--color-text)', textTransform: 'capitalize' }}>
              {order.product_type}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Amount</span>
            <span className="font-bold" style={{ color: 'var(--color-gold)' }}>
              {order.amount_pi} π
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Date</span>
            <span style={{ color: 'var(--color-text)' }}>
              {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* ── Tracking info (if shipped) ─────────────────────────────────── */}
        {order.status === 'shipped' && order.tracking_number && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--color-card-bg)',
              border: '1px solid var(--color-royal-purple)',
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-royal-purple)' }}>
              📦 Shipment Info
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Carrier: <strong>{order.shipping_carrier}</strong>
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Tracking: <strong>{order.tracking_number}</strong>
            </p>
          </div>
        )}

        {/* ── Auto-release countdown ─────────────────────────────────────── */}
        {!['completed', 'disputed', 'refunded', 'auto_released'].includes(order.status) && (
          <AutoReleaseCountdown autoReleaseAt={order.auto_release_at} />
        )}

        {/* ── Visual Timeline ────────────────────────────────────────────── */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <h2
            className="font-semibold mb-4"
            style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}
          >
            Order Timeline
          </h2>
          <EscrowTimeline
            currentStatus={order.status}
            timeline={order.timeline}
            productType={order.product_type}
          />
        </div>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          {canConfirm && (
            <button
              onClick={() => void handleConfirmReceipt()}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--color-success)',
                color: '#fff',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? 'Processing…' : '✓ Confirm Receipt'}
            </button>
          )}
          {canDispute && (
            <button
              onClick={() => setShowDisputeModal(true)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-error)',
                border: '1px solid var(--color-error)',
              }}
            >
              Open Dispute
            </button>
          )}
        </div>
      </div>

      {/* ── Dispute modal ────────────────────────────────────────────────── */}
      {showDisputeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ backgroundColor: 'var(--color-backdrop)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--color-card-bg)' }}
          >
            <h3
              className="font-bold text-lg"
              style={{ color: 'var(--color-error)', fontFamily: 'Sora, sans-serif' }}
            >
              Open Dispute
            </h3>
            <DisputeForm onSubmit={handleOpenDispute} loading={actionLoading} />
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
    </div>
  )
}
