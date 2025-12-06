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

export interface UseChessOptions {
  initialFen?: string
  orientation?: 'white' | 'black'
  onMove?: (from: string, to: string, promotion?: string) => void
  onGameOver?: () => void
}

export function useChess(options: UseChessOptions = {}) {
  const { initialFen, orientation = 'white', onMove, onGameOver } = options

  const chessRef = useRef<Chess>(createChess(initialFen))
  const [fen, setFen] = useState(() => toChessgroundFen(chessRef.current))
  const [turnColor, setTurnColor] = useState(() => getTurnColor(chessRef.current))
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [inCheck, setInCheck] = useState(() => isCheck(chessRef.current))

  const legalDests = useMemo(() => getLegalDests(chessRef.current), [fen])

  const makeMove = useCallback(
    (from: Key, to: Key) => {
      const chess = chessRef.current

      // Attempt to make the move
      const move = chess.move({ from: from as Square, to: to as Square })

      if (move) {
        // Update state
        setFen(toChessgroundFen(chess))
        setTurnColor(getTurnColor(chess))
        setLastMove([from, to])
        setInCheck(isCheck(chess))

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
  }
}
