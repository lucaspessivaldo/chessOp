/**
 * Repertoire gaps: opponent moves the repertoire doesn't answer.
 *
 * - "no-reply": a line ends right after an opponent move, so the user has nothing prepared (local check)
 * - "popular": a move that players often choose (Lichess explorer) is missing from the repertoire.
 *   Each gap is weighted by how often the user should meet it: the share of games that reach the
 *   position (product of the opponent's choices along the way) times the share of the move there.
 */
import type { OpeningMoveNode } from '@/types/opening'
import { fetchOpeningStats } from '@/lib/lichess-api'
import { fenPly } from '@/lib/opening-utils'

export type GapKind = 'no-reply' | 'popular'

export interface RepertoireGap {
  id: string
  kind: GapKind
  /**
   * Node of the position where the gap is (null = starting position): where the missing move
   * would be played (popular), or the unanswered opponent move itself (no-reply)
   */
  nodeId: string | null
  /** Node ids from the root to that position */
  path: string[]
  fen: string
  /** The missing opponent move (popular), or the opponent move left without a reply (no-reply) */
  san: string
  uci?: string
  /** Move label with its number, e.g. "5...Nf6" */
  label: string
  /** Share of the games at this position that continue with the move (popular) */
  share?: number
  /** Games with the move in the explorer database (popular) */
  games?: number
  /** Estimated share of the user's games that reach the gap */
  frequency?: number
}

export interface ScanOptions {
  moves: OpeningMoveNode[]
  rootFen: string
  color: 'white' | 'black'
  token: string
  /** Minimum share of a move at its position to count as a gap (0-1) */
  minShare: number
  signal?: AbortSignal
  onProgress?: (checked: number, gaps: RepertoireGap[]) => void
}

export interface ScanResult {
  gaps: RepertoireGap[]
  checked: number
  /** Positions left unchecked because they are too rare or the scan hit its limit */
  skipped: number
}

/** Positions reached in fewer games than this share are not checked */
const MIN_REACH = 0.002
/** Positions with fewer explorer games give unreliable shares */
const MIN_GAMES = 30
/** Explorer requests per scan (Lichess allows about one per second) */
const MAX_POSITIONS = 60

function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

/** SAN without check, mate and annotation marks */
export function normalizeSan(san: string): string {
  return san.replace(/[+#!?]/g, '')
}

export function moveLabel(fenBefore: string, san: string): string {
  const ply = fenPly(fenBefore)
  return `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '...'}${san}`
}

/**
 * Lines that end right after an opponent move: the user has no reply prepared
 */
export function findUnansweredMoves(moves: OpeningMoveNode[], rootFen: string, color: 'white' | 'black'): RepertoireGap[] {
  const gaps: RepertoireGap[] = []
  const walk = (nodes: OpeningMoveNode[], fenBefore: string, path: string[]) => {
    for (const node of nodes) {
      const nodePath = [...path, node.id]
      const opponentMove = sideToMove(fenBefore) !== color
      if (opponentMove && node.children.length === 0) {
        gaps.push({
          id: `no-reply:${node.id}`,
          kind: 'no-reply',
          nodeId: node.id,
          path: nodePath,
          fen: node.fen,
          san: node.san,
          uci: node.uci,
          label: moveLabel(fenBefore, node.san),
        })
      }
      walk(node.children, node.fen, nodePath)
    }
  }
  walk(moves, rootFen, [])
  return gaps
}

interface QueuedPosition {
  nodeId: string | null
  path: string[]
  fen: string
  children: OpeningMoveNode[]
  reach: number
}

/**
 * Check the repertoire against the Lichess explorer, most frequent positions first
 */
export async function scanRepertoire({ moves, rootFen, color, token, minShare, signal, onProgress }: ScanOptions): Promise<ScanResult> {
  const gaps: RepertoireGap[] = []
  const queue: QueuedPosition[] = [{ nodeId: null, path: [], fen: rootFen, children: moves, reach: 1 }]
  let checked = 0
  let skipped = 0

  while (queue.length > 0) {
    if (signal?.aborted) break
    queue.sort((a, b) => b.reach - a.reach)
    const position = queue.shift()!

    // The user's own moves: follow every prepared move with the same reach
    if (sideToMove(position.fen) === color) {
      for (const child of position.children) {
        queue.push({ nodeId: child.id, path: [...position.path, child.id], fen: child.fen, children: child.children, reach: position.reach })
      }
      continue
    }

    // A line that ends after the user's move is complete: nothing to check
    if (position.children.length === 0) continue
    if (position.reach < MIN_REACH || checked >= MAX_POSITIONS) {
      skipped++
      continue
    }

    const stats = await fetchOpeningStats(position.fen, { token, signal })
    checked++
    const total = stats.white + stats.draws + stats.black
    if (total < MIN_GAMES) {
      skipped++
      onProgress?.(checked, [...gaps])
      continue
    }

    for (const move of stats.moves) {
      const games = move.white + move.draws + move.black
      const share = games / total
      const child = position.children.find(c => normalizeSan(c.san) === normalizeSan(move.san))
      if (child) {
        queue.push({ nodeId: child.id, path: [...position.path, child.id], fen: child.fen, children: child.children, reach: position.reach * share })
      } else if (share >= minShare) {
        gaps.push({
          id: `popular:${position.nodeId ?? 'root'}:${move.uci}`,
          kind: 'popular',
          nodeId: position.nodeId,
          path: position.path,
          fen: position.fen,
          san: move.san,
          uci: move.uci,
          label: moveLabel(position.fen, move.san),
          share,
          games,
          frequency: position.reach * share,
        })
      }
    }
    onProgress?.(checked, [...gaps])
  }

  gaps.sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
  return { gaps, checked, skipped: skipped + queue.length }
}
