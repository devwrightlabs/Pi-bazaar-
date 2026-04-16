'use client'

import { useEffect, useState } from 'react'
import { createPiPayment, approvePaymentOnServer, completePaymentOnServer } from '@/lib/pi-sdk'
import { useStore } from '@/store/useStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStage = 'idle' | 'creating' | 'approving' | 'completing' | 'success' | 'error'

interface PaymentOverlayProps {
  /** Amount in Pi to charge. */
  amount: number
  /** Short description shown to the user (e.g. "PiBazaar: Widget X"). */
  memo: string
  /** Arbitrary metadata forwarded to the Pi SDK. */
  metadata: Record<string, unknown>
  /** Escrow ID created before initiating the payment. */
  escrowId: string
  /** Called when the payment is fully verified and the escrow is held. */
  onSuccess?: (paymentId: string, txid: string, escrowId: string) => void
  /** Called when the user cancels the payment. */
  onCancel?: () => void
  /** Called when a non-recoverable error occurs. */
  onError?: (message: string) => void
  /** Whether the overlay is visible. */
  open: boolean
  /** Called to request closing the overlay (parent controls visibility). */
  onClose: () => void
}

// ─── Skeleton loader (payment-specific) ───────────────────────────────────────

function PaymentSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      <div className="skeleton-shimmer h-5 rounded w-3/5 mx-auto" />
      <div className="skeleton-shimmer h-4 rounded w-4/5 mx-auto" />
      <div className="skeleton-shimmer h-12 rounded-xl w-full" />
    </div>
  )
}

// ─── Stage message mapping ────────────────────────────────────────────────────

const STAGE_MESSAGES: Record<Exclude<PaymentStage, 'idle' | 'error'>, string> = {
  creating: 'Initiating payment…',
  approving: 'Waiting for server approval…',
  completing: 'Completing payment on the blockchain…',
  success: 'Payment confirmed!',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentOverlay({
  amount,
  memo,
  metadata,
  escrowId,
  onSuccess,
  onCancel,
  onClose,
  onError,
  open,
}: PaymentOverlayProps) {
  const { openModal } = useStore()
  const [stage, setStage] = useState<PaymentStage>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset state when the overlay opens.
  useEffect(() => {
    if (open) {
      setStage('idle')
      setErrorMessage(null)
    }
  }, [open])

  // Lock body scroll while overlay is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handlePay = () => {
    if (stage !== 'idle' && stage !== 'error') return
    setStage('creating')
    setErrorMessage(null)

    try {
      createPiPayment(
        { amount, memo, metadata },
        {
          onReadyForServerApproval: (paymentId) => {
            setStage('approving')
            void approvePaymentOnServer(paymentId, escrowId).then((result) => {
              if (!result.success) {
                setStage('error')
                const msg = result.error ?? 'Server could not approve the payment.'
                setErrorMessage(msg)
                onError?.(msg)
              }
            })
          },
          onReadyForServerCompletion: (paymentId, txid) => {
            setStage('completing')
            void completePaymentOnServer(paymentId, txid, escrowId).then((result) => {
              if (result.success) {
                setStage('success')
                onSuccess?.(paymentId, txid, result.escrow_id ?? escrowId)
              } else {
                setStage('error')
                const msg = result.error ?? 'Payment verification failed.'
                setErrorMessage(msg)
                onError?.(msg)
              }
            })
          },
          onCancel: () => {
            setStage('idle')
            onCancel?.()
            onClose()
          },
          onError: (error) => {
            setStage('error')
            const msg = error.message || 'An unexpected payment error occurred.'
            setErrorMessage(msg)
            onError?.(msg)
          },
        },
      )
    } catch (err) {
      setStage('error')
      const msg = err instanceof Error ? err.message : 'Failed to initiate payment.'
      setErrorMessage(msg)
      onError?.(msg)
    }
  }

  if (!open) return null

  const isProcessing = stage === 'creating' || stage === 'approving' || stage === 'completing'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose()
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-5"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
          >
            Confirm Payment
          </h3>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-sm"
              style={{ backgroundColor: 'var(--color-secondary-bg)', color: 'var(--color-subtext)' }}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Amount display */}
        <div className="text-center py-2">
          <p className="text-3xl font-bold" style={{ color: 'var(--color-gold)', fontFamily: 'Sora, sans-serif' }}>
            {amount.toFixed(2)} π
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-subtext)' }}>
            {memo}
          </p>
        </div>

        {/* Escrow protection note */}
        <div
          className="rounded-xl p-3 text-xs"
          style={{
            backgroundColor: 'var(--color-secondary-bg)',
            color: 'var(--color-subtext)',
            border: '1px solid var(--color-gold)',
            borderColor: 'color-mix(in srgb, var(--color-gold) 30%, transparent)',
          }}
        >
          🔒 Your Pi is held in escrow until you confirm receipt of the item.
        </div>

        {/* Processing skeleton or action area */}
        {isProcessing ? (
          <div className="space-y-3">
            <PaymentSkeleton />
            <p className="text-sm text-center" style={{ color: 'var(--color-subtext)' }}>
              {STAGE_MESSAGES[stage as keyof typeof STAGE_MESSAGES]}
            </p>
          </div>
        ) : stage === 'success' ? (
          <div className="text-center space-y-3 py-2">
            <div className="text-4xl">✓</div>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {STAGE_MESSAGES.success}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Your Pi is held securely in escrow.
            </p>
          </div>
        ) : stage === 'error' ? (
          <div className="text-center space-y-3 py-2">
            <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
              {errorMessage}
            </p>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="space-y-2">
          {(stage === 'idle' || stage === 'error') && (
            <button
              onClick={handlePay}
              className="w-full rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-opacity"
              style={{
                backgroundColor: 'var(--color-gold)',
                color: '#000',
                fontFamily: 'Sora, sans-serif',
                minHeight: '44px',
                padding: '12px 16px',
              }}
            >
              {stage === 'error' ? 'Retry Payment' : `Pay ${amount.toFixed(2)} π`}
            </button>
          )}

          {stage === 'success' && (
            <button
              onClick={onClose}
              className="w-full rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-opacity"
              style={{
                backgroundColor: 'var(--color-gold)',
                color: '#000',
                fontFamily: 'Sora, sans-serif',
                minHeight: '44px',
                padding: '12px 16px',
              }}
            >
              Continue
            </button>
          )}

          {!isProcessing && stage !== 'success' && (
            <button
              onClick={onClose}
              className="w-full rounded-xl font-medium text-sm flex items-center justify-center transition-opacity"
              style={{
                backgroundColor: 'var(--color-secondary-bg)',
                color: 'var(--color-subtext)',
                minHeight: '44px',
                padding: '12px 16px',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
