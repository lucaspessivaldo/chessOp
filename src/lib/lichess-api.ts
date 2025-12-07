/**
 * Lichess Opening Explorer API Service
 * Fetches move statistics from Lichess's opening database
 */

export interface MoveStats {
  /** Move in UCI notation */
  uci: string
  /** Move in SAN notation */
  san: string
  /** Number of games where white won */
  white: number
  /** Number of games drawn */
  draws: number
  /** Number of games where black won */
  black: number
  /** Average rating of players who played this move */
  averageRating: number
}

export interface OpeningInfo {
  /** ECO code (e.g., "C65") */
  eco: string
  /** Opening name (e.g., "Ruy Lopez: Berlin Defense") */
  name: string
}

export interface OpeningStats {
  /** Total white wins in this position */
  white: number
  /** Total draws in this position */
  draws: number
  /** Total black wins in this position */
  black: number
  /** Candidate moves with statistics */
  moves: MoveStats[]
  /** Opening info if recognized */
  opening?: OpeningInfo
  /** Top games in this position */
  topGames?: Array<{
    id: string
    white: { name: string; rating: number }
    black: { name: string; rating: number }
    winner: 'white' | 'black' | null
    year: number
  }>
}

export interface FetchOpeningStatsOptions {
  /** Rating ranges to include (default: [1600, 1800, 2000, 2200]) */
  ratings?: number[]
  /** Time controls to include (default: ['blitz', 'rapid', 'classical']) */
  speeds?: ('ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence')[]
  /** Maximum number of moves to return (default: 12) */
  moves?: number
  /** Maximum number of top games to return (default: 4) */
  topGames?: number
}

// Cache for API responses
const statsCache = new Map<string, { data: OpeningStats; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Rate limiting
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second between requests

/**
 * Generate cache key from FEN and options
 */
function getCacheKey(fen: string, options?: FetchOpeningStatsOptions): string {
  const ratings = options?.ratings?.sort().join(',') || 'default'
  const speeds = options?.speeds?.sort().join(',') || 'default'
  return `${fen}:${ratings}:${speeds}`
}

/**
 * Wait for rate limit
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

/**
 * Fetch opening statistics from Lichess Explorer API
 */
export async function fetchOpeningStats(
  fen: string,
  options?: FetchOpeningStatsOptions
): Promise<OpeningStats> {
  // Check cache first
  const cacheKey = getCacheKey(fen, options)
  const cached = statsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Wait for rate limit
  await waitForRateLimit()

  // Build query parameters
  const params = new URLSearchParams()
  params.set('fen', fen)

  // Add ratings filter
  const ratings = options?.ratings || [1600, 1800, 2000, 2200]
  ratings.forEach(r => params.append('ratings[]', r.toString()))

  // Add speeds filter
  const speeds = options?.speeds || ['blitz', 'rapid', 'classical']
  speeds.forEach(s => params.append('speeds[]', s))

  // Add other options
  if (options?.moves) {
    params.set('moves', options.moves.toString())
  }
  if (options?.topGames !== undefined) {
    params.set('topGames', options.topGames.toString())
  }

  const url = `https://explorer.lichess.ovh/lichess?${params.toString()}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Lichess API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Transform response to our format
  const stats: OpeningStats = {
    white: data.white || 0,
    draws: data.draws || 0,
    black: data.black || 0,
    moves: (data.moves || []).map((m: Record<string, unknown>) => ({
      uci: m.uci as string,
      san: m.san as string,
      white: m.white as number || 0,
      draws: m.draws as number || 0,
      black: m.black as number || 0,
      averageRating: m.averageRating as number || 0,
    })),
    opening: data.opening ? {
      eco: data.opening.eco,
      name: data.opening.name,
    } : undefined,
    topGames: data.topGames?.map((g: Record<string, unknown>) => ({
      id: g.id as string,
      white: g.white as { name: string; rating: number },
      black: g.black as { name: string; rating: number },
      winner: g.winner as 'white' | 'black' | null,
      year: g.year as number,
    })),
  }

  // Cache the result
  statsCache.set(cacheKey, { data: stats, timestamp: Date.now() })

  return stats
}

/**
 * Calculate win rate for a side (as percentage 0-100)
 */
export function calculateWinRate(
  stats: { white: number; draws: number; black: number },
  side: 'white' | 'black'
): number {
  const total = stats.white + stats.draws + stats.black
  if (total === 0) return 50

  if (side === 'white') {
    // For white: wins + half of draws
    return ((stats.white + stats.draws * 0.5) / total) * 100
  } else {
    // For black: wins + half of draws
    return ((stats.black + stats.draws * 0.5) / total) * 100
  }
}

/**
 * Format large numbers for display (e.g., 1234567 -> "1.2M")
 */
export function formatGameCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearCache(): void {
  statsCache.clear()
}
