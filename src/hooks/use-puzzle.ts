import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import {
  createChess,
  getLegalDests,
  getTurnColor,
  toChessgroundFen,
  isCheck,
} from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'
import { parseMoves, getUserColor } from '@/lib/puzzle-utils'
import type { Puzzle, PuzzleStatus } from '@/types/puzzle'
import type { PromotionPiece } from '@/components/promotion-dialog'

export interface PendingPromotion {
  from: Key
  to: Key
}

export interface UsePuzzleOptions {
  puzzle: Puzzle
  onComplete?: () => void
  onFail?: () => void
}

export function usePuzzle(options: UsePuzzleOptions) {
  const { puzzle, onComplete, onFail } = options

  const chessRef = useRef<Chess>(createChess(puzzle.FEN))
  const [fen, setFen] = useState(() => toChessgroundFen(chessRef.current))
  const [turnColor, setTurnColor] = useState(() => getTurnColor(chessRef.current))
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [inCheck, setInCheck] = useState(() => isCheck(chessRef.current))
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [status, setStatus] = useState<PuzzleStatus>('playing')
  const [moveIndex, setMoveIndex] = useState(0)
  const moveIndexRef = useRef(0)
  const [premove, setPremove] = useState<[Key, Key] | null>(null)
  const premoveRef = useRef<[Key, Key] | null>(null)

  const moves = useMemo(() => parseMoves(puzzle.Moves), [puzzle.Moves])
  const userColor = useMemo(() => getUserColor(puzzle.FEN), [puzzle.FEN])
  const orientation = userColor

  const legalDests = useMemo(() => getLegalDests(chessRef.current), [fen])

  // Parse UCI move string into from, to, and optional promotion
  const parseUci = (uci: string) => {
    const from = uci.slice(0, 2) as Square
    const to = uci.slice(2, 4) as Square
    const promotion = uci.length > 4 ? (uci[4] as PromotionPiece) : undefined
    return { from, to, promotion }
  }

  // Ref to store executeMove for use in playMachineMove (avoids circular dependency)
  const executeMoveRef = useRef<(from: Key, to: Key, promotion?: PromotionPiece) => boolean>(() => false)

  // Play machine move at given index
  const playMachineMove = useCallback(
    (index: number) => {
      const chess = chessRef.current
      const uciMove = moves[index]
      if (!uciMove) return

      // Parse UCI and make the move
      const { from, to, promotion } = parseUci(uciMove)
      const move = chess.move({ from, to, promotion })

      if (move) {
        setFen(toChessgroundFen(chess))
        setTurnColor(getTurnColor(chess))
        setLastMove([from as Key, to as Key])

        const checkAfterMove = isCheck(chess)
        setInCheck(checkAfterMove)

        // Play sound
        const soundType = getMoveSound({
          isCapture: !!move.captured,
          isCastle: move.san === 'O-O' || move.san === 'O-O-O',
          isCheck: checkAfterMove,
          isPromotion: !!move.promotion,
        })
        playSound(soundType)

        const nextIndex = index + 1
        moveIndexRef.current = nextIndex
        setMoveIndex(nextIndex)

        // Check for premove and execute it after a short delay
        const storedPremove = premoveRef.current
        if (storedPremove) {
          premoveRef.current = null
          setPremove(null)
          // Execute premove after a brief delay for visual feedback
          setTimeout(() => {
            executeMoveRef.current(storedPremove[0], storedPremove[1])
          }, 100)
        }
      }
    },
    [moves]
  )

  // Play first move (machine's move) after mount
  useEffect(() => {
    if (moveIndexRef.current === 0 && moves.length > 0) {
      // Small delay for better UX
      const timeout = setTimeout(() => {
        playMachineMove(0)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, []) // Only on mount

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

  // Validate and execute user move
  const executeMove = useCallback(
    (from: Key, to: Key, promotion?: PromotionPiece) => {
      const chess = chessRef.current
      const currentIndex = moveIndexRef.current
      const expectedUci = moves[currentIndex]

      // Build user's UCI string
      const userUci = `${from}${to}${promotion || ''}`

      console.log('User move:', userUci, 'Expected:', expectedUci, 'Index:', currentIndex)

      // Clear any premove
      premoveRef.current = null
      setPremove(null)

      // Check if move matches expected
      if (userUci !== expectedUci) {
        setStatus('failed')
        onFail?.()
        return false
      }

      // Execute the move
      const move = chess.move({ from: from as Square, to: to as Square, promotion })

      if (move) {
        setFen(toChessgroundFen(chess))
        setTurnColor(getTurnColor(chess))
        setLastMove([from, to])

        const checkAfterMove = isCheck(chess)
        setInCheck(checkAfterMove)

        // Play sound
        const soundType = getMoveSound({
          isCapture: !!move.captured,
          isCastle: move.san === 'O-O' || move.san === 'O-O-O',
          isCheck: checkAfterMove,
          isPromotion: !!move.promotion,
        })
        playSound(soundType)

        const nextMoveIndex = currentIndex + 1

        // Check if puzzle is complete
        if (nextMoveIndex >= moves.length) {
          setStatus('completed')
          moveIndexRef.current = nextMoveIndex
          setMoveIndex(nextMoveIndex)
          onComplete?.()
          return true
        }

        moveIndexRef.current = nextMoveIndex
        setMoveIndex(nextMoveIndex)

        // Play machine's next move after a delay
        setTimeout(() => {
          playMachineMove(nextMoveIndex)
        }, 500)

        return true
      }

      return false
    },
    [moves, onComplete, onFail, playMachineMove]
  )

  // Keep executeMoveRef in sync
  useEffect(() => {
    executeMoveRef.current = executeMove
  }, [executeMove])

  // Handle premove set
  const handlePremove = useCallback((orig: Key, dest: Key) => {
    premoveRef.current = [orig, dest]
    setPremove([orig, dest])
  }, [])

  // Handle premove unset
  const handlePremoveUnset = useCallback(() => {
    premoveRef.current = null
    setPremove(null)
  }, [])

  // Handle move from chessground
  const makeMove = useCallback(
    (from: Key, to: Key) => {
      if (status !== 'playing') return false

      if (isPromotionMove(from, to)) {
        setPendingPromotion({ from, to })
        return false
      }

      return executeMove(from, to)
    },
    [status, isPromotionMove, executeMove]
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
    setFen(toChessgroundFen(chessRef.current))
  }, [])

  // Reset puzzle
  const reset = useCallback(() => {
    chessRef.current = createChess(puzzle.FEN)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setStatus('playing')
    moveIndexRef.current = 0
    setMoveIndex(0)
    premoveRef.current = null
    setPremove(null)

    // Play first move again after reset
    setTimeout(() => {
      playMachineMove(0)
    }, 500)
  }, [puzzle.FEN, playMachineMove])

  // Build Chessground config
  const chessgroundConfig: Config = useMemo(
    () => ({
      fen,
      orientation,
      turnColor,
      lastMove,
      check: inCheck,
      movable: {
        free: false,
        color: status === 'playing' ? userColor : undefined,
        dests: status === 'playing' ? legalDests : new Map(),
        showDests: true,
      },
      premovable: {
        enabled: status === 'playing',
        showDests: true,
        castle: true,
        events: {
          set: handlePremove,
          unset: handlePremoveUnset,
        },
      },
      animation: {
        enabled: true,
        duration: 200,
      },
    }),
    [fen, orientation, turnColor, lastMove, inCheck, legalDests, status, userColor, handlePremove, handlePremoveUnset]
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
    // Puzzle specific
    status,
    moveIndex,
    totalMoves: moves.length,
    userColor,
    orientation,
    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,
    // Premove
    premove,
  }
}
