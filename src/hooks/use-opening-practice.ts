import { useState, useCallback, useMemo, useRef, useEffect, type RefObject } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { ChessgroundRef } from '@/components/chessground'
import type { OpeningStudy, OpeningMoveNode, PracticeStatus } from '@/types/opening'
import type { PromotionPiece } from '@/components/promotion-dialog'
import { getAllLines } from '@/lib/opening-utils'
import {
  createChess,
  getLegalDests,
  getTurnColor,
  toChessgroundFen,
  isCheck,
} from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'

export interface PendingPromotion {
  from: Key
  to: Key
}

export interface UseOpeningPracticeOptions {
  study: OpeningStudy
  chessgroundRef?: RefObject<ChessgroundRef | null>
  onLineComplete?: () => void
  onAllLinesComplete?: () => void
}

export function useOpeningPractice(options: UseOpeningPracticeOptions) {
  const { study, onLineComplete, onAllLinesComplete } = options

  // Get all possible lines from the study
  const allLines = useMemo(() => getAllLines(study.moves), [study.moves])

  // Current line being practiced (index in allLines)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)

  // Current move index within the line
  const [moveIndex, setMoveIndex] = useState(0)
  const moveIndexRef = useRef(0)

  // Current line
  const currentLine = useMemo(() => allLines[currentLineIndex] || [], [allLines, currentLineIndex])

  // Chess instance
  const chessRef = useRef<Chess>(createChess(study.rootFen))

  // State
  const [fen, setFen] = useState(() => toChessgroundFen(chessRef.current))
  const [turnColor, setTurnColor] = useState(() => getTurnColor(chessRef.current))
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [inCheck, setInCheck] = useState(() => isCheck(chessRef.current))
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [status, setStatus] = useState<PracticeStatus>('playing')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [showWrongMove, setShowWrongMove] = useState(false)
  const [boardKey, setBoardKey] = useState(0)
  const [completedLines, setCompletedLines] = useState<Set<number>>(new Set())

  // User color from study
  const userColor = study.color
  const orientation = userColor

  // Legal destinations
  const legalDests = useMemo(() => getLegalDests(chessRef.current), [fen])

  // Ref to store executeMove for use in playMachineMove
  const executeMoveRef = useRef<(from: Key, to: Key, promotion?: PromotionPiece) => boolean>(() => false)

  // Check if it's the user's turn
  const isUserTurn = useCallback(() => {
    const currentTurn = getTurnColor(chessRef.current)
    return currentTurn === userColor
  }, [userColor])

  // Get the expected move at current index
  const getExpectedMove = useCallback((): OpeningMoveNode | null => {
    return currentLine[moveIndexRef.current] || null
  }, [currentLine])

  // Play machine move at given index
  const playMachineMove = useCallback(() => {
    const expectedMove = currentLine[moveIndexRef.current]
    if (!expectedMove) return

    const chess = chessRef.current
    const move = chess.move(expectedMove.san)

    if (move) {
      setFen(toChessgroundFen(chess))
      setTurnColor(getTurnColor(chess))
      setLastMove([move.from as Key, move.to as Key])

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

      const nextIndex = moveIndexRef.current + 1
      moveIndexRef.current = nextIndex
      setMoveIndex(nextIndex)

      // Check if line is complete
      if (nextIndex >= currentLine.length) {
        setStatus('line-complete')
        onLineComplete?.()
        return
      }

      // If it's still not user's turn, play next machine move
      if (!isUserTurn()) {
        setTimeout(() => {
          playMachineMove()
        }, 500)
      }
    }
  }, [currentLine, isUserTurn, onLineComplete])

  // Initialize: play opponent moves until it's user's turn
  useEffect(() => {
    if (moveIndexRef.current === 0 && currentLine.length > 0 && status === 'playing') {
      // Small delay for better UX
      const timeout = setTimeout(() => {
        if (!isUserTurn()) {
          playMachineMove()
        }
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [currentLineIndex]) // Reset when line changes

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

  // Execute user move
  const executeMove = useCallback(
    (from: Key, to: Key, promotion?: PromotionPiece) => {
      const chess = chessRef.current
      const expectedMove = getExpectedMove()

      if (!expectedMove) return false

      // Build user's UCI string
      const userUci = `${from}${to}${promotion || ''}`

      // Check if move matches expected
      const expectedUci = expectedMove.uci

      // Validate the move is legal
      const validatedMove = chess.validateMove({ from: from as Square, to: to as Square, promotion })

      if (!validatedMove) {
        // Illegal move
        setWrongAttempts(prev => prev + 1)
        setShowWrongMove(true)
        setBoardKey(k => k + 1)
        setTimeout(() => setShowWrongMove(false), 500)
        return false
      }

      // Check if it matches expected move
      if (userUci !== expectedUci) {
        // Wrong move - show feedback and reset position
        setWrongAttempts(prev => prev + 1)
        setShowWrongMove(true)
        setBoardKey(k => k + 1)
        setTimeout(() => setShowWrongMove(false), 500)
        return false
      }

      // Correct move!
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

        const nextIndex = moveIndexRef.current + 1
        moveIndexRef.current = nextIndex
        setMoveIndex(nextIndex)

        // Check if line is complete
        if (nextIndex >= currentLine.length) {
          setStatus('line-complete')
          onLineComplete?.()
          return true
        }

        // Play machine's next move after a delay
        setTimeout(() => {
          playMachineMove()
        }, 500)

        return true
      }

      return false
    },
    [getExpectedMove, currentLine, playMachineMove, onLineComplete]
  )

  // Keep executeMoveRef in sync
  useEffect(() => {
    executeMoveRef.current = executeMove
  }, [executeMove])

  // Handle move from chessground
  const makeMove = useCallback(
    (from: Key, to: Key) => {
      if (status !== 'playing') return false

      if (isPromotionMove(from, to)) {
        setPendingPromotion({ from, to })
        setBoardKey(k => k + 1)
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

  // Reset current line
  const resetLine = useCallback(() => {
    chessRef.current = createChess(study.rootFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setStatus('playing')
    moveIndexRef.current = 0
    setMoveIndex(0)
    setWrongAttempts(0)
    setShowWrongMove(false)
    setPendingPromotion(null)

    // Play first machine move if needed
    setTimeout(() => {
      if (!isUserTurn()) {
        playMachineMove()
      }
    }, 500)
  }, [study.rootFen, isUserTurn, playMachineMove])

  // Go to next line
  const nextLine = useCallback(() => {
    // Mark current line as completed
    setCompletedLines(prev => new Set(prev).add(currentLineIndex))

    if (currentLineIndex < allLines.length - 1) {
      // Reset state for new line
      chessRef.current = createChess(study.rootFen)
      setFen(toChessgroundFen(chessRef.current))
      setTurnColor(getTurnColor(chessRef.current))
      setLastMove(undefined)
      setInCheck(false)
      setStatus('playing')
      moveIndexRef.current = 0
      setMoveIndex(0)
      setWrongAttempts(0)
      setShowWrongMove(false)
      setPendingPromotion(null)

      setCurrentLineIndex(prev => prev + 1)
    } else {
      // All lines completed
      onAllLinesComplete?.()
    }
  }, [currentLineIndex, allLines.length, study.rootFen, onAllLinesComplete])

  // Select a specific line to practice
  const selectLine = useCallback((lineIndex: number) => {
    if (lineIndex < 0 || lineIndex >= allLines.length) return

    // Reset state for new line
    chessRef.current = createChess(study.rootFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setStatus('playing')
    moveIndexRef.current = 0
    setMoveIndex(0)
    setWrongAttempts(0)
    setShowWrongMove(false)
    setPendingPromotion(null)

    setCurrentLineIndex(lineIndex)
  }, [allLines.length, study.rootFen])

  // Progress info
  const progressInfo = useMemo(() => ({
    currentLine: currentLineIndex + 1,
    totalLines: allLines.length,
    currentMove: moveIndex,
    totalMoves: currentLine.length,
    completedLines: completedLines.size,
  }), [currentLineIndex, allLines.length, moveIndex, currentLine.length, completedLines])

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
        enabled: false,
      },
      drawable: {
        enabled: true,
        autoShapes: [], // No hints in practice mode
      },
      animation: {
        enabled: true,
        duration: 200,
      },
    }),
    [fen, orientation, turnColor, lastMove, inCheck, legalDests, status, userColor]
  )

  return {
    // State
    fen,
    turnColor,
    lastMove,
    inCheck,
    status,
    wrongAttempts,
    showWrongMove,
    boardKey,

    // Line info
    currentLine,
    currentLineIndex,
    allLines,
    progressInfo,
    completedLines,

    // User info
    userColor,
    orientation,

    // Actions
    makeMove,
    resetLine,
    nextLine,
    selectLine,

    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,

    // Config
    chessgroundConfig,
  }
}
