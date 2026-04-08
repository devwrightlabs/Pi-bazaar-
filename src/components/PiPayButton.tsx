'use client'

import { useState } from 'react'
import { createPiPayment, approvePaymentOnServer, completePaymentOnServer } from '@/lib/pi-sdk'
import { useStore } from '@/store/useStore'

interface PiPayButtonProps {
  amount: number
  memo: string
  metadata: Record<string, unknown>
  escrowId?: string
  onPaymentId?: (paymentId: string) => void
  onComplete?: (paymentId: string, txid: string) => void
  onCancel?: (paymentId: string) => void
  onEscrowHeld?: (escrowId: string) => void
  disabled?: boolean
}

export default function PiPayButton({
  amount,
  memo,
  metadata,
  escrowId,
  onPaymentId,
  onComplete,
  onCancel,
  onEscrowHeld,
  disabled = false,
}: PiPayButtonProps) {
  const [processing, setProcessing] = useState(false)
  const { openModal } = useStore()

  const handlePay = () => {
    if (processing || disabled) return
    setProcessing(true)

    createPiPayment(
      { amount, memo, metadata },
      {
        onReadyForServerApproval: (paymentId) => {
          onPaymentId?.(paymentId)

          // If we have an escrow ID, approve the payment server-side.
          // The server links the paymentId to the escrow record and
          // developer-approves the payment with the Pi Network API.
          if (escrowId) {
            void approvePaymentOnServer(paymentId, escrowId).then((result) => {
              if (!result.success) {
                console.error('[PiPayButton] Server approval failed:', result.error)
                openModal({
                  title: 'Approval Error',
                  message: result.error ?? 'Server could not approve the payment. Please try again or contact support.',
                  variant: 'alert',
                })
              }
            })
          }
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          // Complete the payment server-side via /api/pi/verify.
          // This transitions the escrow to 'held_in_escrow'.
          if (escrowId) {
            void completePaymentOnServer(paymentId, txid, escrowId).then((result) => {
              setProcessing(false)
              if (result.success) {
                onComplete?.(paymentId, txid)
                if (result.escrow_id) {
                  onEscrowHeld?.(result.escrow_id)
                }
              } else {
                openModal({
                  title: 'Verification Failed',
                  message: result.error ?? 'Payment completed but server verification failed. Please contact support.',
                  variant: 'alert',
                })
              }
            })
          } else {
            // Fallback: no escrow ID — pass through to parent callback.
            setProcessing(false)
            onComplete?.(paymentId, txid)
          }
        },
        onCancel: (paymentId) => {
          setProcessing(false)
          onCancel?.(paymentId)
        },
        onError: (error) => {
          setProcessing(false)
          openModal({
            title: 'Payment Failed',
            message: error.message || 'An error occurred while processing your Pi payment. Please try again.',
            variant: 'alert',
          })
        },
      }
    )
  }

  return (
    <button
      onClick={handlePay}
      disabled={processing || disabled}
      className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-opacity"
      style={{
        backgroundColor: '#F0C040',
        color: '#000',
        fontFamily: 'Sora, sans-serif',
        opacity: processing || disabled ? 0.7 : 1,
      }}
    >
      {processing ? (
        <>
          <span
            className="inline-block w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin"
          />
          Processing…
        </>
      ) : (
        <>
          Pay {amount.toFixed(2)} π
        </>
      )}
    </button>
  )
}
