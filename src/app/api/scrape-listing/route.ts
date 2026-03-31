import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import type { ScrapedListing } from '@/lib/types'

function isAllowedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === 'ebay.com' ||
      hostname.endsWith('.ebay.com') ||
      hostname === 'amazon.com' ||
      hostname.endsWith('.amazon.com')
    )
  } catch {
    return false
  }
}

async function scrapeEbay(html: string): Promise<Partial<ScrapedListing>> {
  const $ = cheerio.load(html)
  const title =
    $('h1.x-item-title__mainTitle span').first().text().trim() ||
    $('h1[itemprop="name"]').first().text().trim() ||
    $('title').first().text().replace(/\s*\|.*$/, '').trim()

  const description =
    $('div.itemAttr').text().trim() ||
    $('[itemprop="description"]').text().trim() ||
    `${title} — listed on eBay`

  const priceText =
    $('[itemprop="price"]').attr('content') ||
    $('div.x-price-primary span').first().text().replace(/[^0-9.]/g, '') ||
    '0'
  const price_usd = parseFloat(priceText) || 0

  const images: string[] = []
  $('img.img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    try {
      const { hostname } = new URL(src)
      if ((hostname === 'i.ebayimg.com' || hostname.endsWith('.ebayimg.com')) && !images.includes(src)) {
        images.push(src)
      }
    } catch {
      // skip invalid URLs
    }
  })

  return { title, description: description.slice(0, 2000), price_usd, images: images.slice(0, 10) }
}

async function scrapeAmazon(html: string): Promise<Partial<ScrapedListing>> {
  const $ = cheerio.load(html)
  const title =
    $('#productTitle').first().text().trim() ||
    $('title').first().text().replace(/\s*:\s*Amazon.*$/, '').trim()

  const description =
    $('#feature-bullets').text().trim() ||
    $('#productDescription').text().trim() ||
    `${title} — listed on Amazon`

  const priceText =
    $('.a-price .a-offscreen').first().text().replace(/[^0-9.]/g, '') ||
    $('[itemprop="price"]').attr('content') ||
    '0'
  const price_usd = parseFloat(priceText) || 0

  const images: string[] = []
  $('img[data-old-hires], img[data-a-dynamic-image]').each((_, el) => {
    const src =
      $(el).attr('data-old-hires') || $(el).attr('src') || ''
    if (src.startsWith('https://') && !images.includes(src)) {
      images.push(src)
    }
  })

  return { title, description: description.slice(0, 2000), price_usd, images: images.slice(0, 10) }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { url?: string }
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    if (!isAllowedDomain(url)) {
      return NextResponse.json(
        { error: 'Only eBay (ebay.com) and Amazon (amazon.com) URLs are supported' },
        { status: 400 }
      )
    }

    let html: string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: HTTP ${res.status}` },
          { status: 422 }
        )
      }
      html = await res.text()
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Network error'
      return NextResponse.json({ error: `Could not fetch URL: ${msg}` }, { status: 422 })
    }

    const { hostname } = new URL(url)
    const scraped =
      hostname === 'amazon.com' || hostname.endsWith('.amazon.com')
        ? await scrapeAmazon(html)
        : await scrapeEbay(html)

    const result: ScrapedListing = {
      title: scraped.title ?? '',
      description: scraped.description ?? '',
      price_usd: scraped.price_usd ?? 0,
      images: scraped.images ?? [],
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to scrape listing' }, { status: 500 })
  }
}
