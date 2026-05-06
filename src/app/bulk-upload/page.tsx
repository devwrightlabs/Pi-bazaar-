'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const EXAMPLE_JSON = JSON.stringify(
  [
    {
      title: 'Vintage Camera',
      description: 'Great condition 35mm film camera from the 80s.',
      price_pi: 25,
      category: 'Electronics',
      condition: 'good',
      images: [],
    },
    {
      title: 'Handmade Leather Wallet',
      description: 'Genuine leather, bifold, brown.',
      price_pi: 12,
      category: 'Accessories',
      condition: 'new',
    },
  ],
  null,
  2,
)

interface BulkError {
  index: number
  error: string
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [json, setJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; errors: BulkError[] } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Auth guard — redirect if no token
  useEffect(() => {
    const token = localStorage.getItem('pi_auth_token') || sessionStorage.getItem('pi_auth_token')
    if (!token) {
      router.push('/auth/signin')
    }
  }, [router])

  const handleSubmit = async () => {
    setParseError(null)
    setResult(null)

    // Validate JSON before sending
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      setParseError('Invalid JSON — please check your formatting.')
      return
    }

    if (!Array.isArray(parsed)) {
      setParseError('JSON must be an array of listing objects.')
      return
    }

    setLoading(true)
    try {
      const token =
        localStorage.getItem('pi_auth_token') || sessionStorage.getItem('pi_auth_token')
      const res = await fetch('/api/listings/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listings: parsed }),
      })
      const data = await res.json()
      if (!res.ok && !data.inserted) {
        setParseError(data.error || 'Upload failed')
      } else {
        setResult(data)
        if (data.inserted > 0) setJson('')
      }
    } catch {
      setParseError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen px-4 pt-8 pb-24 max-w-2xl mx-auto"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Header */}
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-gold)' }}
      >
        Bulk Upload Listings
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-subtext)' }}>
        Paste a JSON array of listings below. Max 20 per upload.
      </p>

      {/* JSON Input */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          Listings JSON
        </label>
        <textarea
          className="w-full rounded-xl p-3 text-sm font-mono resize-y focus:outline-none"
          style={{
            backgroundColor: 'var(--color-secondary-bg)',
            color: 'var(--color-text)',
            border: '1px solid rgba(240,192,64,0.2)',
            minHeight: '200px',
          }}
          placeholder='Paste your JSON array here, e.g. [{ "title": "...", "price_pi": 10, ... }]'
          value={json}
          onChange={(e) => {
            setJson(e.target.value)
            setParseError(null)
            setResult(null)
          }}
        />

        {parseError && (
          <p className="mt-2 text-sm text-red-400">{parseError}</p>
        )}
      </div>

      {/* Example */}
      <details
        className="rounded-2xl p-4 mb-6 cursor-pointer"
        style={{ backgroundColor: 'var(--color-card-bg)' }}
      >
        <summary className="text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
          Show JSON format example
        </summary>
        <pre
          className="mt-3 text-xs overflow-x-auto rounded-xl p-3"
          style={{
            backgroundColor: 'var(--color-secondary-bg)',
            color: 'var(--color-subtext)',
          }}
        >
          {EXAMPLE_JSON}
        </pre>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-subtext)' }}>
          Fields: <strong style={{ color: 'var(--color-text)' }}>title</strong>,{' '}
          <strong style={{ color: 'var(--color-text)' }}>description</strong>,{' '}
          <strong style={{ color: 'var(--color-text)' }}>price_pi</strong>,{' '}
          <strong style={{ color: 'var(--color-text)' }}>category</strong> are required.{' '}
          <strong style={{ color: 'var(--color-text)' }}>condition</strong> (new/like_new/good/fair/poor) and{' '}
          <strong style={{ color: 'var(--color-text)' }}>images</strong> (array of URLs) are optional.
        </p>
      </details>

      {/* Upload Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !json.trim()}
        className="w-full py-3 rounded-2xl font-semibold text-base transition-opacity"
        style={{
          backgroundColor: 'var(--color-gold)',
          color: '#0A0A0F',
          fontFamily: 'Sora, sans-serif',
          opacity: loading || !json.trim() ? 0.5 : 1,
          cursor: loading || !json.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Uploading…' : 'Upload Listings'}
      </button>

      {/* Results */}
      {result && (
        <div
          className="mt-6 rounded-2xl p-4"
          style={{ backgroundColor: 'var(--color-card-bg)' }}
        >
          <p
            className="text-base font-semibold mb-1"
            style={{ color: result.inserted > 0 ? '#4ade80' : 'var(--color-subtext)' }}
          >
            {result.inserted} listing{result.inserted !== 1 ? 's' : ''} created successfully.
            {result.errors.length > 0 && ` ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}.`}
          </p>

          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.errors.map((e) => (
                <li key={e.index} className="text-sm" style={{ color: '#f87171' }}>
                  <span className="font-medium">Item {e.index + 1}:</span> {e.error}
                </li>
              ))}
            </ul>
          )}

          {result.inserted > 0 && (
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 text-sm font-medium underline"
              style={{ color: 'var(--color-gold)' }}
            >
              View your listings →
            </button>
          )}
        </div>
      )}
    </main>
  )
}
