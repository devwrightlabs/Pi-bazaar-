'use client'

import { Button } from '@/components/ui/button'

/* ─── Props ────────────────────────────────────────────────────────────── */

interface ManualShippingGuideProps {
  userRole: 'buyer' | 'seller'
  shippingType: 'local' | 'international'
  escrowStatus: string
  onConfirmReceipt?: () => void
}

/* ─── Step definitions ─────────────────────────────────────────────────── */

const LOCAL_BUYER_STEPS = [
  'Agree on a public meetup location with the seller via Messages.',
  'Meet in a well-lit, busy area during daylight hours.',
  'Inspect the item thoroughly before confirming receipt.',
  'Once satisfied, tap "Confirm Receipt & Release Pi" below.',
]

const LOCAL_SELLER_STEPS = [
  'Respond to the buyer in Messages with a public meetup spot.',
  'Bring the item in its described condition to the meetup.',
  'Wait for the buyer to inspect and confirm receipt.',
  'Pi will be released from escrow automatically after confirmation.',
]

const INTERNATIONAL_BUYER_STEPS = [
  'Confirm your shipping address is accurate in your profile.',
  'Wait for the seller to ship and provide a tracking reference.',
  'Track the parcel using the reference provided in your order details.',
  'Once the item arrives and is as described, confirm receipt below.',
]

const INTERNATIONAL_SELLER_STEPS = [
  'Package the item securely for international transit.',
  'Ship via a trackable postal service (e.g., registered mail).',
  'Enter the tracking reference in the order details.',
  'Pi will be released after the buyer confirms receipt.',
]

function getSteps(role: 'buyer' | 'seller', type: 'local' | 'international'): string[] {
  if (role === 'buyer') {
    return type === 'local' ? LOCAL_BUYER_STEPS : INTERNATIONAL_BUYER_STEPS
  }
  return type === 'local' ? LOCAL_SELLER_STEPS : INTERNATIONAL_SELLER_STEPS
}

/* ─── Component ────────────────────────────────────────────────────────── */

export default function ManualShippingGuide({
  userRole,
  shippingType,
  escrowStatus,
  onConfirmReceipt,
}: ManualShippingGuideProps) {
  const steps = getSteps(userRole, shippingType)
  const title =
    shippingType === 'local'
      ? 'Safe Local Meetup Guide'
      : 'International Shipping Guide'

  const showConfirmButton =
    userRole === 'buyer' &&
    (escrowStatus === 'shipped' || escrowStatus === 'delivered')

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {shippingType === 'local' ? (
            <>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </>
          ) : (
            <>
              <rect x="1" y="6" width="22" height="12" rx="2" />
              <path d="M1 10h22" />
              <path d="M12 6v12" />
            </>
          )}
        </svg>
        <h3 className="text-base font-bold font-heading" style={{ color: 'var(--color-text)' }}>
          {title}
        </h3>
      </div>

      {/* Role badge */}
      <div
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: userRole === 'buyer' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(240, 192, 64, 0.12)',
          color: userRole === 'buyer' ? 'var(--color-success)' : 'var(--color-gold)',
        }}
      >
        {userRole === 'buyer' ? 'Buyer' : 'Seller'}
      </div>

      {/* Steps */}
      <ol className="space-y-3 list-none">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: 'var(--color-secondary-bg)',
                color: 'var(--color-gold)',
              }}
            >
              {i + 1}
            </span>
            <p className="text-sm leading-relaxed pt-0.5" style={{ color: 'var(--color-text)' }}>
              {step}
            </p>
          </li>
        ))}
      </ol>

      {/* Escrow status */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-subtext)' }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-gold)' }} />
        Escrow status: <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{escrowStatus}</span>
      </div>

      {/* Confirm Receipt button (buyer only, when applicable) */}
      {showConfirmButton && (
        <Button size="lg" className="w-full" onClick={onConfirmReceipt}>
          Confirm Receipt & Release Pi
        </Button>
      )}
    </div>
  )
}
