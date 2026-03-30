'use client'

import { useEffect, useState } from 'react'

interface AutoReleaseCountdownProps {
  autoReleaseAt: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function AutoReleaseCountdown({ autoReleaseAt }: AutoReleaseCountdownProps) {
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const releaseMs = new Date(autoReleaseAt).getTime()
    const nowMs = Date.now()
    const diff = releaseMs - nowMs
    setRemaining(Math.max(0, diff))
    // Determine total from how far in the future (assume 14d or 3d)
    // We use the diff itself as a proxy for max in first render
    setTotal(Math.max(0, diff))

    const interval = setInterval(() => {
      const newDiff = new Date(autoReleaseAt).getTime() - Date.now()
      setRemaining(Math.max(0, newDiff))
    }, 60_000)

    return () => clearInterval(interval)
  }, [autoReleaseAt])

  const totalMs = total || 1
  const elapsed = totalMs - remaining
  const progress = Math.min(100, (elapsed / totalMs) * 100)

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

  if (remaining <= 0) {
    return (
      <div className="rounded-xl p-4" style={{ backgroundColor: '#16213E' }}>
        <p className="text-sm font-medium" style={{ color: '#22C55E' }}>
          \u2713 Escrow period ended. Pi has been released to seller.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#16213E', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-sm font-semibold" style={{ color: '#fff', fontFamily: 'Sora, sans-serif' }}>
        Auto-Release Countdown
      </p>
      <div className="flex gap-4 justify-center">
        {[
          { val: pad(days), label: 'Days' },
          { val: pad(hours), label: 'Hrs' },
          { val: pad(minutes), label: 'Min' },
        ].map(({ val, label }) => (
          <div key={label} className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#F0C040', fontFamily: 'Sora, sans-serif' }}>{val}</div>
            <div className="text-xs" style={{ color: '#888' }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: '#F0C040' }}
        />
      </div>
      <p className="text-xs text-center" style={{ color: '#888' }}>
        Pi will be automatically released to seller in {days}d {pad(hours)}h
      </p>
    </div>
  )
}
