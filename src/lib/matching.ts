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

    // Category match: 30 if matched, 15 if no preferences set (neutral), 0 if preferences set but no match
    let categoryScore: number
    const categoryMatch = preferredCategories.length === 0 || preferredCategories.includes(listing.category)
    if (preferredCategories.length === 0) {
      categoryScore = 15
    } else {
      categoryScore = categoryMatch ? 30 : 0
    }

    // Boosted bonus: 15 points
    const boostedScore = listing.is_boosted ? 15 : 0

    // Freshness: up to 15 points — full 15 in last 24h, linear decay to 0 over 30 days
    const ageMs = now - new Date(listing.created_at).getTime()
    const ageMs24h = msPerDay
    let freshnessScore: number
    if (ageMs <= ageMs24h) {
      freshnessScore = 15
    } else if (ageMs >= freshnessWindowMs) {
      freshnessScore = 0
    } else {
      freshnessScore = 15 * (1 - (ageMs - ageMs24h) / (freshnessWindowMs - ageMs24h))
    }

    const totalScore = geoScore + categoryScore + boostedScore + freshnessScore

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
