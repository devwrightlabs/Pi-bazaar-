import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.minepi.com/v2/prices/pi', { next: { revalidate: 60 } })
    if (!res.ok) throw new Error('Upstream price fetch failed')
    const data = (await res.json()) as { price?: number }
    const price = typeof data.price === 'number' ? data.price : null
    return NextResponse.json({ price })
  } catch {
    // Return null price on failure — callers handle the null case
    return NextResponse.json({ price: null })
  }
}
