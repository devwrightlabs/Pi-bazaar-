'use client'

import { useState } from 'react'
import { createPiPayment } from '@/lib/pi-sdk'
import { useStore } from '@/store/useStore'

interface PiPayButtonProps {
  amount: number
  memo: string
  metadata: Record<string, unknown>
  onPaymentId?: (paymentId: string) => void
  onComplete?: (paymentId: string, txid: string) => void
  onCancel?: (paymentId: string) => void
  disabled?: boolean
}

export default function PiPayButton({
  amount,
  memo,
  metadata,
  onPaymentId,
  onComplete,
  onCancel,
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
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          setProcessing(false)
          onComplete?.(paymentId, txid)
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
          Processing\u2026
        </>
      ) : (
        <>
          Pay {amount.toFixed(2)} \u03c0
        </>
      )}
    </button>
  )
}
