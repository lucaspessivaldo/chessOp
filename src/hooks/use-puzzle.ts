import { useState, useCallback, useMemo, useRef, useEffect, type RefObject } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { ChessgroundRef } from '@/components/chessground'
import {
  createChess,
  getLegalDests,
  getTurnColor,
  toChessgroundFen,
  isCheck,
  isCheckmate,
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
  chessgroundRef?: RefObject<ChessgroundRef | null>
}

export function usePuzzle(options: UsePuzzleOptions) {
  const { puzzle, onComplete, onFail, chessgroundRef } = options

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
  // Store the move index for which hint was requested (null = no hint)
  const [hintForMoveIndex, setHintForMoveIndex] = useState<number | null>(null)
  // Key to force chessground re-render when needed
  const [boardKey, setBoardKey] = useState(0)
  // Track wrong attempts count
  const [wrongAttempts, setWrongAttempts] = useState(0)
  // Flag to show wrong move feedback
  const [showWrongMove, setShowWrongMove] = useState(false)

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

  // Cancel premove when status changes to failed or completed
  useEffect(() => {
    if (status === 'failed' || status === 'completed') {
      premoveRef.current = null
      setPremove(null)
      // Clear the visual premove highlight via chessground API
      chessgroundRef?.current?.api?.cancelPremove()
    }
  }, [status, chessgroundRef])

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

      // First validate the move is legal
      const validatedMove = chess.validateMove({ from: from as Square, to: to as Square, promotion })

      if (!validatedMove) {
        // Illegal move - show feedback but allow retry
        setWrongAttempts((prev) => prev + 1)
        setShowWrongMove(true)
        setBoardKey((k) => k + 1)
        setTimeout(() => setShowWrongMove(false), 500)
        onFail?.()
        return false
      }

      // Save the current position before making the move
      const moveBeforeAttempt = chess.currentMove()

      // Check if move matches expected OR if it results in checkmate
      // We need to temporarily make the move to check for checkmate
      const tempMove = chess.move({ from: from as Square, to: to as Square, promotion })
      if (!tempMove) {
        // Should not happen since we validated, but handle it
        setWrongAttempts((prev) => prev + 1)
        setShowWrongMove(true)
        setBoardKey((k) => k + 1)
        setTimeout(() => setShowWrongMove(false), 500)
        onFail?.()
        return false
      }

      const isMate = isCheckmate(chess)

      // If not correct move and not checkmate, undo and show error
      if (!isMate && userUci !== expectedUci) {
        // Undo: seek back to position before the wrong move, then delete the wrong move
        chess.seek(moveBeforeAttempt)
        chess.delete(tempMove)
        // Show feedback but allow retry
        setWrongAttempts((prev) => prev + 1)
        setShowWrongMove(true)
        setBoardKey((k) => k + 1)
        setTimeout(() => setShowWrongMove(false), 500)
        onFail?.()
        return false
      }

      // Move is correct (either matches expected or is checkmate)
      setFen(toChessgroundFen(chess))
      setTurnColor(getTurnColor(chess))
      setLastMove([from, to])

      const checkAfterMove = isCheck(chess)
      setInCheck(checkAfterMove)

      // Play sound
      const soundType = getMoveSound({
        isCapture: !!tempMove.captured,
        isCastle: tempMove.san === 'O-O' || tempMove.san === 'O-O-O',
        isCheck: checkAfterMove,
        isPromotion: !!tempMove.promotion,
      })
      playSound(soundType)

      // If checkmate, puzzle is complete immediately
      if (isMate) {
        setStatus('completed')
        moveIndexRef.current = moves.length
        setMoveIndex(moves.length)
        onComplete?.()
        return true
      }

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
        // Force chessground to re-mount with correct state by changing the key
        setBoardKey((k) => k + 1)
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
    setHintForMoveIndex(null)
    setWrongAttempts(0)
    setShowWrongMove(false)

    // Play first move again after reset
    setTimeout(() => {
      playMachineMove(0)
    }, 500)
  }, [puzzle.FEN, playMachineMove])

  // Get the hint arrow shape - only shows if hint was requested for current position
  const hintArrow: DrawShape[] = useMemo(() => {
    // Only show hint if it was requested for this exact move index
    if (hintForMoveIndex === null || hintForMoveIndex !== moveIndexRef.current || status !== 'playing') {
      return []
    }

    const expectedUci = moves[hintForMoveIndex]
    if (!expectedUci) return []

    const from = expectedUci.slice(0, 2) as Key
    const to = expectedUci.slice(2, 4) as Key

    return [{
      orig: from,
      dest: to,
      brush: 'green',
    }]
  }, [hintForMoveIndex, status, moves, moveIndex]) // moveIndex dependency to clear when position changes

  // Request hint for current position
  const requestHint = useCallback(() => {
    setHintForMoveIndex(moveIndexRef.current)
  }, [])

  // Computed value to check if hint is currently showing
  const showHint = hintForMoveIndex !== null && hintForMoveIndex === moveIndexRef.current && status === 'playing'

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
      drawable: {
        enabled: true,
        autoShapes: hintArrow,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
    }),
    [fen, orientation, turnColor, lastMove, inCheck, legalDests, status, userColor, handlePremove, handlePremoveUnset, hintArrow]
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
    // Hint
    showHint,
    requestHint,
    // Board key for forcing re-render
    boardKey,
    // Wrong move tracking
    wrongAttempts,
    showWrongMove,
  }
}
