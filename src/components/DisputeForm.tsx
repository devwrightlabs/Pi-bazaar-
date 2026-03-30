'use client'

import { useState } from 'react'

const DISPUTE_REASONS = [
  'Item not received',
  'Item not as described',
  'Damaged item',
  'Wrong item',
  'Other',
]

interface DisputeFormProps {
  onSubmit: (reason: string, description: string, evidenceUrls: string[]) => Promise<void>
  loading?: boolean
}

export default function DisputeForm({ onSubmit, loading = false }: DisputeFormProps) {
  const [reason, setReason] = useState(DISPUTE_REASONS[0])
  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])

  const addEvidence = () => {
    if (evidenceUrl.trim()) {
      setEvidenceUrls([...evidenceUrls, evidenceUrl.trim()])
      setEvidenceUrl('')
    }
  }

  const handleSubmit = async () => {
    if (!description.trim()) return
    await onSubmit(reason, description.trim(), evidenceUrls)
  }

  const inputStyle = {
    backgroundColor: '#0A0A0F',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs mb-1 font-medium" style={{ color: '#888' }}>Dispute Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          {DISPUTE_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1 font-medium" style={{ color: '#888' }}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail..."
          rows={4}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs mb-1 font-medium" style={{ color: '#888' }}>Photo Evidence URLs (optional)</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
          <button
            onClick={addEvidence}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#16213E', color: '#F0C040', border: '1px solid #F0C040' }}
          >
            Add
          </button>
        </div>
        {evidenceUrls.length > 0 && (
          <ul className="mt-2 space-y-1">
            {evidenceUrls.map((url, i) => (
              <li key={i} className="text-xs truncate" style={{ color: '#888' }}>
                {url}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => void handleSubmit()}
        disabled={loading || !description.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity"
        style={{
          backgroundColor: '#EF4444',
          color: '#fff',
          opacity: loading || !description.trim() ? 0.5 : 1,
        }}
      >
        {loading ? 'Submitting\u2026' : 'Submit Dispute'}
      </button>
    </div>
  )
}
