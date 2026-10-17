import { useEffect, useState } from 'react'
import { fetchOpeningStats, type OpeningStats } from '@/lib/lichess-api'

export interface UseOpeningStatsResult {
  stats: OpeningStats | null
  isLoading: boolean
  error: Error | null
  /** Manually refetch the stats */
  refetch: () => void
}

interface StatsState {
  key: string | null
  stats: OpeningStats | null
  error: Error | null
}

/**
 * Fetch Lichess explorer statistics for a FEN (debounced, cancelled when the FEN changes)
 */
export function useOpeningStats(
  fen: string | null,
  { token, enabled = true, debounceMs = 300 }: { token?: string; enabled?: boolean; debounceMs?: number } = {}
): UseOpeningStatsResult {
  const [result, setResult] = useState<StatsState>({ key: null, stats: null, error: null })
  const [attempt, setAttempt] = useState(0)

  const active = enabled && !!fen && !!token
  const requestKey = active ? `${fen}|${token}|${attempt}` : null

  useEffect(() => {
    if (!requestKey || !fen) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchOpeningStats(fen, { token, signal: controller.signal })
        .then(stats => setResult({ key: requestKey, stats, error: null }))
        .catch(err => {
          if (controller.signal.aborted) return
          setResult({ key: requestKey, stats: null, error: err instanceof Error ? err : new Error('Unknown error') })
        })
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [requestKey, fen, token, debounceMs])

  const isCurrent = result.key === requestKey && requestKey !== null
  return {
    stats: isCurrent ? result.stats : null,
    error: isCurrent ? result.error : null,
    isLoading: active && !isCurrent,
    refetch: () => setAttempt(n => n + 1),
  }
}
