'use client'

import { useState } from 'react'

interface DigitalDeliveryFormProps {
  onSubmit: (deliveryProof: string) => Promise<void>
  loading?: boolean
}

export default function DigitalDeliveryForm({ onSubmit, loading = false }: DigitalDeliveryFormProps) {
  const [mode, setMode] = useState<'url' | 'text'>('url')
  const [value, setValue] = useState('')

  const handleSubmit = async () => {
    if (!value.trim()) return
    await onSubmit(value.trim())
  }

  const inputStyle = {
    backgroundColor: '#0A0A0F',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('url')}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: mode === 'url' ? '#F0C040' : '#16213E', color: mode === 'url' ? '#000' : '#fff' }}
        >
          Download Link
        </button>
        <button
          onClick={() => setMode('text')}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: mode === 'text' ? '#F0C040' : '#16213E', color: mode === 'text' ? '#000' : '#fff' }}
        >
          Code / Key
        </button>
      </div>

      {mode === 'url' ? (
        <div>
          <label className="block text-xs mb-1" style={{ color: '#888' }}>Download URL</label>
          <input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>
      ) : (
        <div>
          <label className="block text-xs mb-1" style={{ color: '#888' }}>License Code / Key</label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter your code or key here..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={inputStyle}
          />
        </div>
      )}

      <button
        onClick={() => void handleSubmit()}
        disabled={loading || !value.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity"
        style={{
          backgroundColor: '#F0C040',
          color: '#000',
          opacity: loading || !value.trim() ? 0.5 : 1,
        }}
      >
        {loading ? 'Delivering\u2026' : 'Mark as Delivered'}
      </button>
    </div>
  )
}
