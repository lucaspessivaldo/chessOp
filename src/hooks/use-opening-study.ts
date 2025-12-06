import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { OpeningStudy, OpeningMoveNode } from '@/types/opening'
import type { PromotionPiece } from '@/components/promotion-dialog'
import { getAllLines } from '@/lib/opening-utils'
import {
  createChess,
  getTurnColor,
  toChessgroundFen,
  isCheck,
} from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'

export interface PendingPromotion {
  from: Key
  to: Key
}

export interface UseOpeningStudyOptions {
  study: OpeningStudy
}

export function useOpeningStudy(options: UseOpeningStudyOptions) {
  const { study } = options

  // Get all possible lines from the study (use first line for study mode)
  const allLines = useMemo(() => getAllLines(study.moves), [study.moves])

  // Current line being studied (index in allLines)
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
  const [isComplete, setIsComplete] = useState(false)

  // User color from study
  const userColor = study.color
  const orientation = userColor

  // Check if it's the user's turn
  const isUserTurn = useCallback(() => {
    const currentTurn = getTurnColor(chessRef.current)
    return currentTurn === userColor
  }, [userColor])

  // Get the expected move at current index
  const getExpectedMove = useCallback((): OpeningMoveNode | null => {
    return currentLine[moveIndexRef.current] || null
  }, [currentLine])

  // Get available moves (for arrows) - all moves that could be played from current position
  const getAvailableMoves = useCallback((): OpeningMoveNode[] => {
    // In study mode, we show arrows for expected moves
    const expected = getExpectedMove()
    return expected ? [expected] : []
  }, [getExpectedMove])

  // Generate arrows for available moves (study mode feature)
  const moveArrows = useMemo((): DrawShape[] => {
    // Only show arrows when it's user's turn
    if (!isUserTurn()) return []

    const availableMoves = getAvailableMoves()
    return availableMoves.map((move) => {
      const from = move.uci.slice(0, 2) as Key
      const to = move.uci.slice(2, 4) as Key

      return {
        orig: from,
        dest: to,
        brush: 'green',
      }
    })
  }, [fen, getAvailableMoves, isUserTurn]) // fen dependency to recalculate when position changes

  // Play machine move
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
        setIsComplete(true)
        return
      }

      // If it's still not user's turn, play next machine move
      if (!isUserTurn()) {
        setTimeout(() => {
          playMachineMove()
        }, 400)
      }
    }
  }, [currentLine, isUserTurn])

  // Initialize: play opponent moves until it's user's turn
  useEffect(() => {
    if (moveIndexRef.current === 0 && currentLine.length > 0 && !isComplete) {
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
      const expectedUci = expectedMove.uci

      // Check if move matches expected
      if (userUci !== expectedUci) {
        // In study mode, we don't allow wrong moves
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
          setIsComplete(true)
          return true
        }

        // Play machine's next move after a delay
        setTimeout(() => {
          playMachineMove()
        }, 400)

        return true
      }

      return false
    },
    [getExpectedMove, currentLine, playMachineMove]
  )

  // Handle move from chessground
  const makeMove = useCallback(
    (from: Key, to: Key) => {
      if (isComplete) return false

      if (isPromotionMove(from, to)) {
        setPendingPromotion({ from, to })
        return false
      }

      return executeMove(from, to)
    },
    [isComplete, isPromotionMove, executeMove]
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

  // Reset / Go to start
  const goToStart = useCallback(() => {
    chessRef.current = createChess(study.rootFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setIsComplete(false)
    moveIndexRef.current = 0
    setMoveIndex(0)
    setPendingPromotion(null)

    // Play first machine move if needed
    setTimeout(() => {
      if (!isUserTurn()) {
        playMachineMove()
      }
    }, 500)
  }, [study.rootFen, isUserTurn, playMachineMove])

  // Go to end (play all moves)
  const goToEnd = useCallback(() => {
    chessRef.current = createChess(study.rootFen)

    // Play all moves in the line
    for (const moveNode of currentLine) {
      chessRef.current.move(moveNode.san)
    }

    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setInCheck(isCheck(chessRef.current))
    setIsComplete(true)
    moveIndexRef.current = currentLine.length
    setMoveIndex(currentLine.length)

    // Set last move highlight
    if (currentLine.length > 0) {
      const lastMoveNode = currentLine[currentLine.length - 1]
      const from = lastMoveNode.uci.slice(0, 2) as Key
      const to = lastMoveNode.uci.slice(2, 4) as Key
      setLastMove([from, to])
    }
  }, [study.rootFen, currentLine])

  // Select a specific line
  const selectLine = useCallback((lineIndex: number) => {
    if (lineIndex < 0 || lineIndex >= allLines.length) return

    chessRef.current = createChess(study.rootFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setIsComplete(false)
    moveIndexRef.current = 0
    setMoveIndex(0)
    setPendingPromotion(null)

    setCurrentLineIndex(lineIndex)
  }, [allLines.length, study.rootFen])

  // Move info for UI
  const moveInfo = useMemo(() => ({
    current: moveIndex,
    total: currentLine.length,
    isMainLine: true,
  }), [moveIndex, currentLine.length])

  // Study destinations - only allow the expected move
  const studyDests = useMemo(() => {
    const expectedMove = getExpectedMove()
    if (!expectedMove || !isUserTurn()) return new Map<Key, Key[]>()

    const from = expectedMove.uci.slice(0, 2) as Key
    const to = expectedMove.uci.slice(2, 4) as Key

    return new Map<Key, Key[]>([[from, [to]]])
  }, [fen, getExpectedMove, isUserTurn])

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
        color: !isComplete && isUserTurn() ? userColor : undefined,
        dests: !isComplete && isUserTurn() ? studyDests : new Map(),
        showDests: true,
      },
      premovable: {
        enabled: false,
      },
      drawable: {
        enabled: true,
        autoShapes: moveArrows,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
    }),
    [fen, orientation, turnColor, lastMove, inCheck, studyDests, moveArrows, isComplete, isUserTurn, userColor]
  )

  // Current comment (from expected move)
  const currentComment = useMemo(() => {
    if (moveIndex === 0) return null
    const prevMove = currentLine[moveIndex - 1]
    return prevMove?.comment || null
  }, [currentLine, moveIndex])

  return {
    // Position state
    fen,
    turnColor,
    lastMove,
    inCheck,
    isComplete,
    orientation,

    // Navigation
    goToStart,
    goToEnd,
    selectLine,
    goToMainLine: goToStart, // Alias for compatibility

    // Move info
    moveInfo,
    currentComment,
    availableMoves: getAvailableMoves(),
    currentPath: [], // For compatibility

    // Line info
    currentLine,
    currentLineIndex,
    allLines,

    // Actions
    makeMove,

    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,

    // Config
    chessgroundConfig,
    moveArrows,

    // For UI compatibility
    isUserTurn: isUserTurn(),
    goToPreviousMove: goToStart, // Simplified - just restart
    goToNode: () => { }, // Not used in this simplified version
  }
}
