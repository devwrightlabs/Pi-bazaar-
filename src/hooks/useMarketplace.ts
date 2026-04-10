'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { useUIStore } from '@/store/useUIStore'
import type { Listing, MatchScore, RecommendationResponse } from '@/lib/types'

export type RecommendedListing = Listing & { match_score: MatchScore }

const PAGE_SIZE = 20
const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'
const DEBOUNCE_MS = 200
const LOCAL_COUNTRY = 'BS'
const MAX_CONSECUTIVE_FAILURES = 3

export function useMarketplace(initialListings: RecommendedListing[] = []) {
  const { currentUser, userLocation, mapRadius } = useStore()
  const jurisdictionMode = useUIStore((s) => s.jurisdictionMode)

  const [listings, setListings] = useState<RecommendedListing[]>(initialListings)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [activeCategory, setActiveCategoryState] = useState<string>('All')

  const offsetRef = useRef(initialListings.length)
  const categoryRef = useRef('All')
  const abortControllerRef = useRef<AbortController | null>(null)
  const isFetchingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consecutiveFailuresRef = useRef(0)

  const fetchRecommendations = useCallback(
    async (reset = false) => {
      // Prevent infinite retry loops — stop after MAX_CONSECUTIVE_FAILURES
      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        setError('Unable to load listings after multiple attempts. Please try again later.')
        setHasMore(false)
        return
      }

      if (isFetchingRef.current) {
        abortControllerRef.current?.abort()
      }

      const currentOffset = reset ? 0 : offsetRef.current

      isFetchingRef.current = true

      if (reset || currentOffset === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const userId = currentUser?.id ?? FALLBACK_USER_ID
        const [lat, lng] = userLocation ?? [0, 0]
        const categories = categoryRef.current === 'All' ? [] : [categoryRef.current]

        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            latitude: lat,
            longitude: lng,
            radius_km: mapRadius,
            preferred_categories: categories,
            limit: PAGE_SIZE,
            offset: currentOffset,
            jurisdiction: jurisdictionMode,
            origin_country: jurisdictionMode === 'local' ? LOCAL_COUNTRY : undefined,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = (await response.json()) as { error: string }
          throw new Error(errorData.error ?? 'Failed to fetch recommendations')
        }

        const data = (await response.json()) as RecommendationResponse

        if (reset) {
          offsetRef.current = data.recommendations.length
          setListings(data.recommendations)
        } else {
          offsetRef.current = currentOffset + data.recommendations.length
          setListings((prev) => [...prev, ...data.recommendations])
        }

        setHasMore(data.has_more)
        consecutiveFailuresRef.current = 0
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        consecutiveFailuresRef.current += 1
        setError(err instanceof Error ? err.message : 'Failed to load listings')
        setHasMore(false)
      } finally {
        setLoading(false)
        setLoadingMore(false)
        isFetchingRef.current = false
      }
    },
    [currentUser, userLocation, mapRadius, jurisdictionMode],
  )

  // Initial load if no SSR data provided
  useEffect(() => {
    if (initialListings.length === 0) {
      void fetchRecommendations(true)
    }
  }, [initialListings.length, fetchRecommendations])

  // Re-fetch when jurisdiction changes
  const prevJurisdiction = useRef(jurisdictionMode)
  useEffect(() => {
    if (prevJurisdiction.current !== jurisdictionMode) {
      prevJurisdiction.current = jurisdictionMode
      offsetRef.current = 0
      consecutiveFailuresRef.current = 0
      setListings([])
      setHasMore(true)
      setError(null)
      void fetchRecommendations(true)
    }
  }, [jurisdictionMode, fetchRecommendations])

  const setCategory = useCallback(
    (category: string) => {
      categoryRef.current = category
      setActiveCategoryState(category)
      offsetRef.current = 0
      consecutiveFailuresRef.current = 0
      setListings([])
      setHasMore(true)
      setError(null)
      void fetchRecommendations(true)
    },
    [fetchRecommendations],
  )

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading || isFetchingRef.current || error) return
    void fetchRecommendations(false)
  }, [hasMore, loadingMore, loading, error, fetchRecommendations])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = setTimeout(loadMore, DEBOUNCE_MS)
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [loadMore])

  const retry = useCallback(() => {
    consecutiveFailuresRef.current = 0
    setError(null)
    setHasMore(true)
    void fetchRecommendations(true)
  }, [fetchRecommendations])

  return {
    listings,
    loading,
    loadingMore,
    error,
    hasMore,
    activeCategory,
    setCategory,
    loadMore,
    sentinelRef,
    retry,
    refresh: () => {
      consecutiveFailuresRef.current = 0
      return fetchRecommendations(true)
    },
  }
}
