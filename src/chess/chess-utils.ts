import { Chess } from '@jackstenglein/chess'
import type { Move, Square } from '@jackstenglein/chess'
import type { Key } from '@lichess-org/chessground/types'
import type { PromotionPiece } from '@/types/chess'

/**
 * Create a new Chess instance with optional FEN
 * Null moves (Z0) are disabled
 */
export function createChess(fen?: string): Chess {
  return new Chess({ fen, disableNullMoves: true })
}

/**
 * Parse a UCI move string into from/to/promotion components
 */
export function parseUci(uci: string): { from: Square; to: Square; promotion?: PromotionPiece } {
  const from = uci.slice(0, 2) as Square
  const to = uci.slice(2, 4) as Square
  const promotion = uci.length > 4 ? (uci[4] as PromotionPiece) : undefined
  return { from, to, promotion }
}

/**
 * Check if a move is a pawn promotion
 */
export function isPromotionMove(chess: Chess, from: Key, to: Key): boolean {
  const piece = chess.get(from as Square)
  if (!piece || piece.type !== 'p') return false
  const toRank = to[1]
  return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
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

/**
 * Check if the current position is checkmate
 */
export function isCheckmate(chess: Chess): boolean {
  return chess.isCheckmate()
}
