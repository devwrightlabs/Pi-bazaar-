'use client'

import { useState } from 'react'
import type { AISuggestResponse } from '@/lib/types'

interface Props {
  title: string
  category: string
  condition: string
  onGenerated: (description: string) => void
}

export default function AISuggestButton({ title, category, condition, onGenerated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!title.trim() || !category || !condition) {
      setError('Please fill in title, category, and condition first')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, condition }),
      })
      if (!res.ok) {
        throw new Error('Failed to generate description')
      }
      const data = (await res.json()) as AISuggestResponse & { error?: string }
      if (data.error) throw new Error(data.error)
      onGenerated(data.description)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate description')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-gold)', border: '1px solid var(--color-gold)' }}
      >
        {loading ? (
          <>
            <span
              className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
            />
            Generating...
          </>
        ) : (
          <>\u2728 Generate Description</>
        )}
      </button>
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
