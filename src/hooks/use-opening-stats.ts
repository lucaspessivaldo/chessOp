import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchOpeningStats,
  type OpeningStats,
  type FetchOpeningStatsOptions,
} from '@/lib/lichess-api'

export interface UseOpeningStatsOptions extends FetchOpeningStatsOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Whether to fetch stats (can disable to save API calls) */
  enabled?: boolean
}

export interface UseOpeningStatsResult {
  /** The fetched stats */
  stats: OpeningStats | null
  /** Whether a request is in progress */
  isLoading: boolean
  /** Error if the request failed */
  error: Error | null
  /** Manually refetch the stats */
  refetch: () => void
}

/**
 * Hook to fetch opening statistics from Lichess
 * Automatically debounces FEN changes and caches results
 */
export function useOpeningStats(
  fen: string | null,
  options?: UseOpeningStatsOptions
): UseOpeningStatsResult {
  const { debounceMs = 300, enabled = true, ...fetchOptions } = options || {}

  const [stats, setStats] = useState<OpeningStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track the latest FEN to handle race conditions
  const latestFenRef = useRef(fen)
  latestFenRef.current = fen

  // Abort controller for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchStats = useCallback(async (fenToFetch: string) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchOpeningStats(fenToFetch, fetchOptions)

      // Only update if this is still the current FEN
      if (latestFenRef.current === fenToFetch && !abortController.signal.aborted) {
        setStats(result)
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      // Only update error if this is still the current FEN
      if (latestFenRef.current === fenToFetch && !abortController.signal.aborted) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setStats(null)
      }
    } finally {
      // Only clear loading if this is still the current request
      if (latestFenRef.current === fenToFetch && !abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [fetchOptions])

  // Debounced effect to fetch stats when FEN changes
  useEffect(() => {
    if (!enabled || !fen) {
      setStats(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const timeoutId = setTimeout(() => {
      fetchStats(fen)
    }, debounceMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [fen, enabled, debounceMs, fetchStats])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const refetch = useCallback(() => {
    if (fen) {
      fetchStats(fen)
    }
  }, [fen, fetchStats])

  return {
    stats,
    isLoading,
    error,
    refetch,
  }
}
