import { useState, useCallback, useMemo, useRef } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import {
  createChess,
  getLegalDests,
  getTurnColor,
  toChessgroundFen,
  isGameOver,
  isCheck,
} from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'
import type { PromotionPiece } from '@/components/promotion-dialog'

export interface UseChessOptions {
  initialFen?: string
  orientation?: 'white' | 'black'
  onMove?: (from: string, to: string, promotion?: string) => void
  onGameOver?: () => void
}

export interface PendingPromotion {
  from: Key
  to: Key
}

export function useChess(options: UseChessOptions = {}) {
  const { initialFen, orientation = 'white', onMove, onGameOver } = options

  const chessRef = useRef<Chess>(createChess(initialFen))
  const [fen, setFen] = useState(() => toChessgroundFen(chessRef.current))
  const [turnColor, setTurnColor] = useState(() => getTurnColor(chessRef.current))
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [inCheck, setInCheck] = useState(() => isCheck(chessRef.current))
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  const legalDests = useMemo(() => getLegalDests(chessRef.current), [fen])

  // Check if a move is a promotion
  const isPromotionMove = useCallback((from: Key, to: Key): boolean => {
    const chess = chessRef.current
    const piece = chess.get(from as Square)

    if (!piece || piece.type !== 'p') return false

    const toRank = to[1]
    const isWhitePromotion = piece.color === 'w' && toRank === '8'
    const isBlackPromotion = piece.color === 'b' && toRank === '1'

    return isWhitePromotion || isBlackPromotion
  }, [])

  // Execute the actual move (with optional promotion)
  const executeMove = useCallback(
    (from: Key, to: Key, promotion?: PromotionPiece) => {
      const chess = chessRef.current

      // Attempt to make the move
      const move = chess.move({ from: from as Square, to: to as Square, promotion })

      if (move) {
        // Update state
        setFen(toChessgroundFen(chess))
        setTurnColor(getTurnColor(chess))
        setLastMove([from, to])

        const checkAfterMove = isCheck(chess)
        setInCheck(checkAfterMove)

        // Play the appropriate sound
        const soundType = getMoveSound({
          isCapture: !!move.captured,
          isCastle: move.san === 'O-O' || move.san === 'O-O-O',
          isCheck: checkAfterMove,
          isPromotion: !!move.promotion,
        })
        playSound(soundType)

        onMove?.(from, to, move.promotion)

        if (isGameOver(chess)) {
          onGameOver?.()
        }

        return true
      }

      return false
    },
    [onMove, onGameOver]
  )

  // Handle move from chessground - may trigger promotion dialog
  const makeMove = useCallback(
    (from: Key, to: Key) => {
      if (isPromotionMove(from, to)) {
        // Store pending promotion and wait for user selection
        setPendingPromotion({ from, to })
        return false
      }

      return executeMove(from, to)
    },
    [isPromotionMove, executeMove]
  )

  // Complete a pending promotion
  const completePromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) return

      const { from, to } = pendingPromotion
      executeMove(from, to, piece)
      setPendingPromotion(null)
    },
    [pendingPromotion, executeMove]
  )

  // Cancel a pending promotion
  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
    // Reset the board to current state (undo the visual move from chessground)
    setFen(toChessgroundFen(chessRef.current))
  }, [])

  const reset = useCallback(() => {
    chessRef.current = createChess(initialFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
  }, [initialFen])

  const undo = useCallback(() => {
    const chess = chessRef.current
    const previousMove = chess.previousMove()
    chess.seek(previousMove)
    setFen(toChessgroundFen(chess))
    setTurnColor(getTurnColor(chess))
    setInCheck(isCheck(chess))
    setLastMove(undefined)
  }, [])

  // Build Chessground config with legal move validation
  const chessgroundConfig: Config = useMemo(
    () => ({
      fen,
      orientation,
      turnColor,
      lastMove,
      check: inCheck,
      movable: {
        free: false,
        color: turnColor,
        dests: legalDests,
        showDests: true,
      },
      premovable: {
        enabled: false,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
    }),
    [fen, orientation, turnColor, lastMove, inCheck, legalDests]
  )

  return {
    chess: chessRef.current,
    fen,
    turnColor,
    lastMove,
    inCheck,
    legalDests,
    chessgroundConfig,
    makeMove,
    reset,
    undo,
    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,
  }
}
