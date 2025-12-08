import type { Key } from '@lichess-org/chessground/types'

/**
 * Pending promotion state for chess moves
 */
export interface PendingPromotion {
  from: Key
  to: Key
}

/**
 * Promotion piece types
 */
export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

/**
 * Hint level for practice modes
 */
export type HintLevel = 0 | 1 | 2 | 3
