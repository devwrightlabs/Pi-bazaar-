'use client'

import { useEffect, useState } from 'react'

interface PaymentBreakdownProps {
  amountPi: number
}

export default function PaymentBreakdown({ amountPi }: PaymentBreakdownProps) {
  const [usdPrice, setUsdPrice] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pi-price')
        if (!res.ok) return
        const data = (await res.json()) as { price: number | null }
        setUsdPrice(data.price)
      } catch {
        // silently fail — USD conversion is cosmetic
      }
    }
    void load()
  }, [])

  const fee = parseFloat((amountPi * 0.025).toFixed(6))
  const total = parseFloat((amountPi + fee).toFixed(6))

  const toUsd = (pi: number) =>
    usdPrice !== null ? `\u2248 $${(pi * usdPrice).toFixed(2)}` : ''

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
        Payment Breakdown
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--color-subtext)' }}>Item price</span>
          <div className="text-right">
            <span style={{ color: 'var(--color-text)' }}>{amountPi} \u03c0</span>
            {usdPrice !== null && (
              <span className="ml-2 text-xs" style={{ color: 'var(--color-subtext)' }}>{toUsd(amountPi)}</span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--color-subtext)' }}>Escrow fee (2.5%)</span>
          <div className="text-right">
            <span style={{ color: 'var(--color-subtext)' }}>{fee} \u03c0</span>
            {usdPrice !== null && (
              <span className="ml-2 text-xs" style={{ color: 'var(--color-subtext)' }}>{toUsd(fee)}</span>
            )}
          </div>
        </div>
        <div className="border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between items-center">
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Total</span>
            <div className="text-right">
              <span className="font-bold" style={{ color: 'var(--color-gold)' }}>{total} \u03c0</span>
              {usdPrice !== null && (
                <span className="ml-2 text-xs" style={{ color: 'var(--color-subtext)' }}>{toUsd(total)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
