import { NextResponse } from 'next/server'

// In-memory cache: { price_usd, fetchedAt }
let cachedPrice: { price_usd: number; fetchedAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function fetchPiPrice(): Promise<number | null> {
  try {
    // Use CoinGecko public API for Pi Network price
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd',
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }
    )
    if (res.status === 429) {
      // Rate limited — return null so caller falls back to cached value
      return null
    }
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, { usd?: number }>
    return data?.['pi-network']?.usd ?? null
  } catch {
    return null
  }
}

function staleCacheResponse() {
  if (!cachedPrice) return null
  return NextResponse.json({
    price_usd: cachedPrice.price_usd,
    price: cachedPrice.price_usd,
    timestamp: new Date(cachedPrice.fetchedAt).toISOString(),
    stale: true,
  })
}

export async function GET() {
  try {
    const now = Date.now()

    // Return cached value if fresh
    if (cachedPrice && now - cachedPrice.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        price_usd: cachedPrice.price_usd,
        price: cachedPrice.price_usd,
        timestamp: new Date(cachedPrice.fetchedAt).toISOString(),
      })
    }

    const price = await fetchPiPrice()

    if (price === null) {
      return (
        staleCacheResponse() ??
        NextResponse.json(
          { error: 'Rate unavailable', price: null },
          { status: 503 }
        )
      )
    }

    cachedPrice = { price_usd: price, fetchedAt: now }
    return NextResponse.json({
      price_usd: price,
      price,
      timestamp: new Date(now).toISOString(),
    })
  } catch (err) {
    console.error('[pi-price] Unhandled error:', err)
    return (
      staleCacheResponse() ??
      NextResponse.json(
        { error: 'Internal server error', price: null },
        { status: 500 }
      )
    )
  }
}
