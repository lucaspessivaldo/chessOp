import { Chess } from '@jackstenglein/chess'
import type { Move } from '@jackstenglein/chess'
import type { Key } from '@lichess-org/chessground/types'

/**
 * Create a new Chess instance with optional FEN or PGN
 */
export function createChess(fenOrPgn?: string): Chess {
  return new Chess({ pgn: fenOrPgn })
}

/**
 * Get all legal moves as a Map for Chessground's movable.dests
 */
export function getLegalDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  const moves = chess.moves() as Move[]

  for (const move of moves) {
    const from = move.from as Key
    const to = move.to as Key
    const existing = dests.get(from)
    if (existing) {
      existing.push(to)
    } else {
      dests.set(from, [to])
    }
  }

  return dests
}

/**
 * Get the current turn color for Chessground
 */
export function getTurnColor(chess: Chess): 'white' | 'black' {
  return chess.turn() === 'w' ? 'white' : 'black'
}

/**
 * Convert Chess.js FEN to Chessground-compatible format
 */
export function toChessgroundFen(chess: Chess): string {
  return chess.fen()
}

/**
 * Check if the game is over
 */
export function isGameOver(chess: Chess): boolean {
  return chess.isGameOver()
}

/**
 * Check if the current position is check
 */
export function isCheck(chess: Chess): boolean {
  return chess.isCheck()
}
