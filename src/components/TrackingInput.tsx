'use client'

import { useState } from 'react'

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Royal Mail', 'Canada Post', 'Australia Post', 'Other']

interface TrackingInputProps {
  onSubmit: (trackingNumber: string, carrier: string) => Promise<void>
  loading?: boolean
}

export default function TrackingInput({ onSubmit, loading = false }: TrackingInputProps) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState(CARRIERS[0])

  const handleSubmit = async () => {
    if (!trackingNumber.trim()) return
    await onSubmit(trackingNumber.trim(), carrier)
  }

  const inputStyle = {
    backgroundColor: '#0A0A0F',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs mb-1" style={{ color: '#888' }}>Shipping Carrier</label>
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          {CARRIERS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: '#888' }}>Tracking Number</label>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        />
      </div>
      <button
        onClick={() => void handleSubmit()}
        disabled={loading || !trackingNumber.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity"
        style={{
          backgroundColor: '#F0C040',
          color: '#000',
          opacity: loading || !trackingNumber.trim() ? 0.5 : 1,
        }}
      >
        {loading ? 'Updating\u2026' : 'Mark as Shipped'}
      </button>
    </div>
  )
}
