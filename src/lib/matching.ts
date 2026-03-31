import type { Listing, MatchScore } from './types'

const EARTH_RADIUS_KM = 6371

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

export function scoreListings(
  listings: Listing[],
  userLat: number,
  userLng: number,
  radiusKm: number,
  preferredCategories: string[],
  priceMin?: number,
  priceMax?: number,
): (Listing & { match_score: MatchScore })[] {
  // Fix #2: Guard against invalid radiusKm to prevent Infinity/NaN scores
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return []
  }

  const now = Date.now()
  const msPerDay = 24 * 60 * 60 * 1000
  const freshnessWindowMs = 30 * msPerDay

  const scored: (Listing & { match_score: MatchScore })[] = []

  for (const listing of listings) {
    const distanceKm = haversineDistance(userLat, userLng, listing.location_lat, listing.location_lng)

    if (distanceKm > radiusKm) continue

    if (priceMin !== undefined && listing.price_pi < priceMin) continue
    if (priceMax !== undefined && listing.price_pi > priceMax) continue

    // Geo proximity: up to 40 points
    const geoScore = 40 * (1 - distanceKm / radiusKm)

    // Fix #3: category_match is true only when the user has preferences AND the listing matches.
    // Neutral scoring (no preferences) is kept separate from a real match.
    const categoryMatch = preferredCategories.length > 0 && preferredCategories.includes(listing.category)
    let categoryScore: number
    if (preferredCategories.length === 0) {
      categoryScore = 15
    } else {
      categoryScore = categoryMatch ? 30 : 0
    }

    // Boosted bonus: 15 points
    const boostedScore = listing.is_boosted ? 15 : 0

    // Fix #4: Handle invalid dates, clamp negative ages (future dates), and clamp scores to bounds
    const createdAtMs = new Date(listing.created_at).getTime()
    const oneDayMs = msPerDay
    let freshnessScore: number
    if (!Number.isFinite(createdAtMs)) {
      // Invalid or unparsable date: treat as stale (no freshness boost)
      freshnessScore = 0
    } else {
      // Normalize negative ages (future dates) to 0 so freshness never exceeds 15
      const ageMsRaw = now - createdAtMs
      const ageMs = Math.max(0, ageMsRaw)

      if (ageMs <= oneDayMs) {
        freshnessScore = 15
      } else if (ageMs >= freshnessWindowMs) {
        freshnessScore = 0
      } else {
        freshnessScore = 15 * (1 - (ageMs - oneDayMs) / (freshnessWindowMs - oneDayMs))
      }
    }
    // Clamp freshness score to the intended [0, 15] range
    freshnessScore = Math.max(0, Math.min(15, freshnessScore))

    const unclampedTotalScore = geoScore + categoryScore + boostedScore + freshnessScore
    // Max possible score: 40 (geo) + 30 (category) + 15 (boosted) + 15 (freshness) = 100
    const totalScore = Math.max(0, Math.min(100, unclampedTotalScore))

    const matchScore: MatchScore = {
      listing_id: listing.id,
      score: Math.round(totalScore * 100) / 100,
      distance_km: Math.round(distanceKm * 100) / 100,
      category_match: categoryMatch,
      is_boosted: listing.is_boosted,
    }

    scored.push({ ...listing, match_score: matchScore })
  }

  scored.sort((a, b) => {
    const scoreDiff = b.match_score.score - a.match_score.score
    if (scoreDiff !== 0) return scoreDiff
    // Tiebreaker: boosted listings first
    if (b.is_boosted && !a.is_boosted) return 1
    if (a.is_boosted && !b.is_boosted) return -1
    return 0
  })

  return scored
}
