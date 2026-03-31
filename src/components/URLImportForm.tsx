'use client'

import { useState } from 'react'
import type { ScrapedListing } from '@/lib/types'

interface Props {
  onImported: (data: Partial<ScrapedListing> & { piPrice?: number }) => void
}

export default function URLImportForm({ onImported }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const importRes = await fetch('/api/scrape-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      const importData = (await importRes.json()) as ScrapedListing & { error?: string }
      if (!importRes.ok || importData.error) {
        throw new Error(importData.error ?? 'Failed to import listing')
      }

      // Fetch Pi price to convert USD to Pi
      let piPrice: number | undefined
      try {
        const priceRes = await fetch('/api/pi-price')
        if (priceRes.ok) {
          const priceData = (await priceRes.json()) as { price_usd?: number }
          if (priceData.price_usd && priceData.price_usd > 0 && importData.price_usd > 0) {
            piPrice = parseFloat((importData.price_usd / priceData.price_usd).toFixed(2))
          }
        }
      } catch {
        // Pi price fetch is optional
      }

      onImported({ ...importData, piPrice })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import listing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm mb-2" style={{ color: 'var(--color-subtext)' }}>
          Paste an eBay or Amazon product URL to auto-fill the form
        </p>
        <div
          className="flex gap-2 rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(136,136,136,0.3)' }}
        >
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleImport()}
            placeholder="https://www.ebay.com/itm/... or https://www.amazon.com/dp/..."
            className="flex-1 px-4 py-3 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text)' }}
          />
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={loading || !url.trim()}
            className="px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000', minWidth: '90px' }}
          >
            {loading ? (
              <span
                className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#000', borderTopColor: 'transparent' }}
              />
            ) : (
              'Import'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {error}
        </div>
      )}

      <div
        className="p-4 rounded-xl text-sm"
        style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-subtext)' }}
      >
        <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>
          Supported sites
        </p>
        <ul className="space-y-1 text-xs">
          <li>&#8226; eBay (ebay.com)</li>
          <li>&#8226; Amazon (amazon.com)</li>
        </ul>
        <p className="text-xs mt-2">
          After import, review and edit all fields before publishing. Price is converted from USD to Pi using the live rate.
        </p>
      </div>
    </div>
  )
}
