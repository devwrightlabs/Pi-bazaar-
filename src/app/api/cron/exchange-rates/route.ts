/**
 * GET/POST /api/cron/exchange-rates
 *
 * Cron-triggered route that fetches the current Pi Network exchange rates
 * from a public cryptocurrency API and persists them in the exchange_rates
 * table so the frontend can display localized fiat prices.
 *
 * Designed to be invoked by Vercel Cron or Supabase pg_cron on a schedule
 * (e.g., every 5–15 minutes). Protected by a shared CRON_SECRET to prevent
 * unauthorized external invocations.
 *
 * Security:
 *   - All DB writes use supabaseAdmin (service role) — only the service role
 *     can modify exchange_rates (enforced by RLS).
 *   - The route verifies a CRON_SECRET header/query param to block unauthorized
 *     callers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ─── Constants ────────────────────────────────────────────────────────────────
const SUPPORTED_CURRENCIES = ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'inr', 'ngn', 'krw', 'vnd'] as const
const COINGECKO_API_TIMEOUT_MS = 10_000

// ─── Cron secret verification ─────────────────────────────────────────────────

function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  // If CRON_SECRET is not configured, reject all requests.
  if (!cronSecret) {
    console.error('[cron/exchange-rates] CRON_SECRET is not configured')
    return false
  }

  // Accept the secret from the Authorization header or query param.
  const headerValue = req.headers.get('Authorization')?.replace('Bearer ', '')
  const queryValue = req.nextUrl.searchParams.get('cron_secret')

  return headerValue === cronSecret || queryValue === cronSecret
}

// ─── Fetch rates from external API ────────────────────────────────────────────

interface CoinGeckoResponse {
  'pi-network'?: Record<string, number>
}

async function fetchPiRates(): Promise<Record<string, number> | null> {
  const currencyList = SUPPORTED_CURRENCIES.join(',')
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=${currencyList}`

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(COINGECKO_API_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      console.error(`[cron/exchange-rates] CoinGecko responded with ${res.status}`)
      return null
    }

    const data = (await res.json()) as CoinGeckoResponse
    const rates = data?.['pi-network']
    if (!rates || typeof rates !== 'object') {
      console.error('[cron/exchange-rates] Unexpected CoinGecko response shape')
      return null
    }

    return rates
  } catch (err) {
    console.error('[cron/exchange-rates] Fetch failed:', err)
    return null
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function handleCronRequest(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify cron secret.
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch latest rates from external API.
    const rates = await fetchPiRates()
    if (!rates) {
      return NextResponse.json(
        { error: 'Failed to fetch exchange rates from upstream' },
        { status: 502 }
      )
    }

    // 3. Upsert each currency rate into the exchange_rates table.
    const now = new Date().toISOString()
    const upsertResults: { currency: string; rate: number }[] = []
    const errors: { currency: string; message: string }[] = []

    for (const [currency, rate] of Object.entries(rates)) {
      if (typeof rate !== 'number' || rate <= 0) {
        errors.push({ currency, message: 'Invalid rate value' })
        continue
      }

      const { error } = await supabaseAdmin
        .from('exchange_rates')
        .upsert(
          {
            fiat_currency_code: currency.toUpperCase(),
            pi_rate: rate,
            last_updated: now,
          },
          { onConflict: 'fiat_currency_code' }
        )

      if (error) {
        console.error(`[cron/exchange-rates] Upsert failed for ${currency}:`, error)
        errors.push({ currency, message: error.message })
      } else {
        upsertResults.push({ currency: currency.toUpperCase(), rate })
      }
    }

    return NextResponse.json({
      success: true,
      updated: upsertResults,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now,
    })
  } catch (err) {
    console.error('[cron/exchange-rates] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Support both GET and POST for flexibility with different cron providers.
export async function GET(req: NextRequest) {
  return handleCronRequest(req)
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req)
}
