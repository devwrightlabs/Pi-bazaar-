'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  listing: { id: string; title: string; price_in_pi: number; seller_id: string }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── MakeOfferModal ───────────────────────────────────────────────────────────

export default function MakeOfferModal({ listing, isOpen, onClose, onSuccess }: Props) {
  const [offerAmount, setOfferAmount] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const quickOffers = [
    { label: '70%', multiplier: 0.7 },
    { label: '80%', multiplier: 0.8 },
    { label: '90%', multiplier: 0.9 },
  ]

  const handleQuickOffer = (multiplier: number) => {
    const amount = (listing.price_in_pi * multiplier).toFixed(2)
    setOfferAmount(amount)
    setError(null)
  }

  const handleSubmit = async () => {
    const amount = parseFloat(offerAmount)
    if (!offerAmount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid offer amount.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ listing_id: listing.id, offer_amount: amount }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setOfferAmount('')
        onSuccess()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative rounded-2xl p-6 mx-4 w-full"
        style={{
          backgroundColor: 'var(--color-card-bg)',
          maxWidth: '384px',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-subtext)', backgroundColor: 'var(--color-secondary-bg)' }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Title */}
        <h2
          className="text-xl font-bold mb-1"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
        >
          Make an Offer
        </h2>

        {/* Listing title */}
        <p
          className="text-sm mb-1 truncate"
          style={{ color: 'var(--color-subtext)' }}
          title={listing.title}
        >
          {listing.title}
        </p>

        {/* Asking price */}
        <p className="text-sm font-semibold mb-5" style={{ color: '#F0C040' }}>
          Asking price: {listing.price_in_pi} π
        </p>

        {/* Quick offer buttons */}
        <div className="flex gap-2 mb-4">
          {quickOffers.map(({ label, multiplier }) => {
            const amount = (listing.price_in_pi * multiplier).toFixed(2)
            return (
              <button
                key={label}
                onClick={() => handleQuickOffer(multiplier)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: '#F0C040',
                  border: '1px solid rgba(240, 192, 64, 0.3)',
                }}
              >
                {label} · {amount} π
              </button>
            )
          })}
        </div>

        {/* Offer amount input */}
        <div className="relative mb-4">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold pointer-events-none"
            style={{ color: '#F0C040' }}
          >
            π
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter offer amount"
            value={offerAmount}
            onChange={(e) => {
              setOfferAmount(e.target.value)
              setError(null)
            }}
            disabled={loading || success}
            className="w-full rounded-xl py-3 pl-8 pr-4 text-sm font-medium outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-secondary-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs mb-3 font-medium" style={{ color: '#EF4444' }}>
            {error}
          </p>
        )}

        {/* Success message */}
        {success && (
          <p className="text-xs mb-3 font-semibold text-center" style={{ color: '#22C55E' }}>
            ✅ Offer sent successfully!
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading || success}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 active:scale-95"
          style={{
            backgroundColor: '#F0C040',
            color: '#0A0A0F',
            opacity: loading || success ? 0.7 : 1,
            cursor: loading || success ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Sending...' : success ? 'Sent!' : 'Send Offer'}
        </button>
      </div>
    </div>
  )
}
