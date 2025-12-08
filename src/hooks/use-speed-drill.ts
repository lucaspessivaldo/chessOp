import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { OpeningStudy, OpeningMoveNode } from '@/types/opening'
import type { PromotionPiece } from '@/components/promotion-dialog'
import {
  createChess,
  getLegalDests,
  getTurnColor,
  toChessgroundFen,
  isCheck,
} from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'
import { shuffleArray, INITIAL_FEN } from '@/lib/opening-utils'

export interface PendingPromotion {
  from: Key
  to: Key
}

export interface SpeedDrillStats {
  totalMoves: number
  correctMoves: number
  wrongMoves: number
  timeMs: number
  averageTimePerMove: number
  accuracy: number
}

export interface UseSpeedDrillOptions {
  study: OpeningStudy
  timeLimit?: number // Time limit in seconds (0 = no limit)
  onComplete?: (stats: SpeedDrillStats) => void
}

/**
 * Extract all lines from opening tree
 */
function extractAllLines(nodes: OpeningMoveNode[]): string[][] {
  const lines: string[][] = []

  function traverse(node: OpeningMoveNode, currentLine: string[]) {
    const newLine = [...currentLine, node.uci]
    if (node.children.length === 0) {
      lines.push(newLine)
    } else {
      for (const child of node.children) {
        traverse(child, newLine)
      }
    }
  }

  for (const root of nodes) {
    traverse(root, [])
  }

  return lines
}

/**
 * Speed Drill Mode Hook
 * Rapid-fire practice through positions with timing
 */
export function useSpeedDrill({
  study,
  timeLimit = 0,
  onComplete,
}: UseSpeedDrillOptions) {
  const chessRef = useRef<Chess>(createChess(study.rootFen || INITIAL_FEN))

  // Extract and shuffle lines
  const allLines = useMemo(() => {
    const lines = extractAllLines(study.moves)
    return shuffleArray([...lines])
  }, [study.moves])

  // State
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const currentLineIndexRef = useRef(0)
  const [moveIndex, setMoveIndex] = useState(0)
  const moveIndexRef = useRef(0)
  const [fen, setFen] = useState(() => toChessgroundFen(chessRef.current))
  const [turnColor, setTurnColor] = useState(() => getTurnColor(chessRef.current))
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [inCheck, setInCheck] = useState(false)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [boardKey, setBoardKey] = useState(0)

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const isRunningRef = useRef(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stats
  const [correctMoves, setCorrectMoves] = useState(0)
  const [wrongMoves, setWrongMoves] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Refs to track stats for completion (avoid stale closures)
  const correctMovesRef = useRef(0)
  const wrongMovesRef = useRef(0)
  const elapsedMsRef = useRef(0)

  // Current line
  const moves = useMemo(() => allLines[currentLineIndex] || [], [allLines, currentLineIndex])
  const movesRef = useRef(moves)
  movesRef.current = moves

  // Total moves across all lines
  const totalMovesInDrill = useMemo(() => {
    return allLines.reduce((sum, line) => {
      // Count only user moves
      const userMoves = line.filter((_, i) => {
        const isWhiteMove = i % 2 === 0
        return (study.color === 'white' && isWhiteMove) || (study.color === 'black' && !isWhiteMove)
      })
      return sum + userMoves.length
    }, 0)
  }, [allLines, study.color])

  // User color
  const userColor = study.color

  // Check if it's user's turn
  const isUserTurn = useCallback(() => {
    return getTurnColor(chessRef.current) === userColor
  }, [userColor])

  // Start timer
  const startTimer = useCallback(() => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    setIsRunning(true)
    setStartTime(Date.now())
  }, [])

  // Stop timer
  const stopTimer = useCallback(() => {
    isRunningRef.current = false
    setIsRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Timer effect
  useEffect(() => {
    if (isRunning && startTime) {
      timerRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = now - startTime
        setElapsedMs(elapsed)
        elapsedMsRef.current = elapsed

        // Check time limit
        if (timeLimit > 0 && elapsed >= timeLimit * 1000) {
          stopTimer()
          setIsComplete(true)
        }
      }, 100)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, startTime, timeLimit, stopTimer])

  // Parse UCI move
  const parseUci = (uci: string) => {
    const from = uci.slice(0, 2) as Square
    const to = uci.slice(2, 4) as Square
    const promotion = uci.length > 4 ? (uci[4] as PromotionPiece) : undefined
    return { from, to, promotion }
  }

  // Play machine move
  const playMachineMove = useCallback((index: number) => {
    const chess = chessRef.current
    const currentMoves = movesRef.current
    const uciMove = currentMoves[index]
    if (!uciMove) return

    const { from, to, promotion } = parseUci(uciMove)
    const move = chess.move({ from, to, promotion })

    if (move) {
      setFen(toChessgroundFen(chess))
      setTurnColor(getTurnColor(chess))
      setLastMove([from as Key, to as Key])

      const checkAfterMove = isCheck(chess)
      setInCheck(checkAfterMove)

      // Play appropriate sound based on move type
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

      // Check if line complete
      if (nextIndex >= currentMoves.length) {
        // Move to next line (use ref to avoid stale closure)
        const lineIdx = currentLineIndexRef.current
        if (lineIdx < allLines.length - 1) {
          setTimeout(() => startNextLine(), 200)
        } else {
          // All lines complete!
          completeSession()
        }
        return
      }

      // If still not user's turn, play next machine move
      if (getTurnColor(chess) !== userColor) {
        setTimeout(() => playMachineMove(nextIndex), 150) // Faster for speed drill
      }
    }
  }, [userColor, allLines.length])

  // Complete the session
  const completeSession = useCallback(() => {
    stopTimer()
    setIsComplete(true)

    // Use refs to get current values (avoid stale closures)
    const correct = correctMovesRef.current
    const wrong = wrongMovesRef.current
    const time = elapsedMsRef.current

    const stats: SpeedDrillStats = {
      totalMoves: correct + wrong,
      correctMoves: correct,
      wrongMoves: wrong,
      timeMs: time,
      averageTimePerMove: correct > 0 ? time / correct : 0,
      accuracy: correct + wrong > 0 ? (correct / (correct + wrong)) * 100 : 0,
    }

    onComplete?.(stats)
  }, [stopTimer, onComplete])

  // Start next line
  const startNextLine = useCallback(() => {
    const nextLineIdx = currentLineIndexRef.current + 1
    if (nextLineIdx >= allLines.length) {
      completeSession()
      return
    }

    chessRef.current = createChess(study.rootFen || INITIAL_FEN)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    moveIndexRef.current = 0
    setMoveIndex(0)
    currentLineIndexRef.current = nextLineIdx
    setCurrentLineIndex(nextLineIdx)

    // If user is black, play the first machine move (white's move)
    if (userColor === 'black') {
      setTimeout(() => {
        const nextLineMoves = allLines[nextLineIdx]
        if (nextLineMoves && nextLineMoves.length > 0) {
          const uciMove = nextLineMoves[0]
          const { from, to, promotion } = parseUci(uciMove)
          const move = chessRef.current.move({ from, to, promotion })
          if (move) {
            setFen(toChessgroundFen(chessRef.current))
            setTurnColor(getTurnColor(chessRef.current))
            setLastMove([from as Key, to as Key])
            const checkAfterMove = isCheck(chessRef.current)
            setInCheck(checkAfterMove)
            const soundType = getMoveSound({
              isCapture: !!move.captured,
              isCastle: move.san === 'O-O' || move.san === 'O-O-O',
              isCheck: checkAfterMove,
              isPromotion: !!move.promotion,
            })
            playSound(soundType)
            moveIndexRef.current = 1
            setMoveIndex(1)
          }
        }
      }, 200)
    }
  }, [allLines, study.rootFen, userColor, completeSession])

  // Start first machine move if user is black (on initial load)
  useEffect(() => {
    // Only run once on mount for black players
    if (userColor === 'black' && moveIndexRef.current === 0 && moves.length > 0 && !isComplete) {
      const timeout = setTimeout(() => {
        const uciMove = moves[0]
        if (uciMove) {
          const { from, to, promotion } = parseUci(uciMove)
          const move = chessRef.current.move({ from, to, promotion })
          if (move) {
            setFen(toChessgroundFen(chessRef.current))
            setTurnColor(getTurnColor(chessRef.current))
            setLastMove([from as Key, to as Key])
            const checkAfterMove = isCheck(chessRef.current)
            setInCheck(checkAfterMove)
            const soundType = getMoveSound({
              isCapture: !!move.captured,
              isCastle: move.san === 'O-O' || move.san === 'O-O-O',
              isCheck: checkAfterMove,
              isPromotion: !!move.promotion,
            })
            playSound(soundType)
            moveIndexRef.current = 1
            setMoveIndex(1)
          }
        }
      }, 500)
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Start first machine move if needed (for subsequent lines when running)
  useEffect(() => {
    if (moveIndexRef.current === 0 && moves.length > 0 && !isComplete && isRunning) {
      const timeout = setTimeout(() => {
        if (!isUserTurn()) {
          playMachineMove(0)
        }
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [currentLineIndex, moves, isComplete, isUserTurn, playMachineMove, isRunning])

  // Check if move is promotion
  const isPromotionMove = useCallback((from: Key, to: Key): boolean => {
    const piece = chessRef.current.get(from as Square)
    if (!piece || piece.type !== 'p') return false
    const toRank = to[1]
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
  }, [])

  // Execute move
  const executeMove = useCallback((from: Key, to: Key, promotion?: PromotionPiece) => {
    if (!isRunningRef.current) {
      startTimer()
    }

    const chess = chessRef.current
    const currentIndex = moveIndexRef.current
    const currentMoves = movesRef.current
    const expectedUci = currentMoves[currentIndex]

    if (!expectedUci) return false

    const userUci = `${from}${to}${promotion || ''}`

    // Check if correct
    if (userUci !== expectedUci) {
      playSound('wrong')
      setWrongMoves(prev => {
        wrongMovesRef.current = prev + 1
        return prev + 1
      })
      setBoardKey(k => k + 1)
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
      setCorrectMoves(prev => {
        correctMovesRef.current = prev + 1
        return prev + 1
      })

      // Play appropriate sound based on move type
      const soundType = getMoveSound({
        isCapture: !!move.captured,
        isCastle: move.san === 'O-O' || move.san === 'O-O-O',
        isCheck: checkAfterMove,
        isPromotion: !!move.promotion,
      })
      playSound(soundType)

      const nextIndex = currentIndex + 1
      moveIndexRef.current = nextIndex
      setMoveIndex(nextIndex)

      // Check if line complete (use ref to avoid stale closure)
      if (nextIndex >= currentMoves.length) {
        const lineIdx = currentLineIndexRef.current
        if (lineIdx < allLines.length - 1) {
          setTimeout(() => startNextLine(), 200)
        } else {
          completeSession()
        }
        return true
      }

      // Play machine's next move
      setTimeout(() => playMachineMove(nextIndex), 150)
      return true
    }

    return false
  }, [startTimer, allLines.length, startNextLine, completeSession, playMachineMove])

  // Handle move from chessground
  const makeMove = useCallback((from: Key, to: Key) => {
    if (isComplete) return false

    if (isPromotionMove(from, to)) {
      setPendingPromotion({ from, to })
      return false
    }

    return executeMove(from, to)
  }, [isComplete, isPromotionMove, executeMove])

  // Complete promotion
  const completePromotion = useCallback((piece: PromotionPiece) => {
    if (!pendingPromotion) return
    executeMove(pendingPromotion.from, pendingPromotion.to, piece)
    setPendingPromotion(null)
  }, [pendingPromotion, executeMove])

  // Cancel promotion
  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
  }, [])

  // Reset drill
  const resetDrill = useCallback(() => {
    stopTimer()
    chessRef.current = createChess(study.rootFen || INITIAL_FEN)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setIsComplete(false)
    currentLineIndexRef.current = 0
    setCurrentLineIndex(0)
    moveIndexRef.current = 0
    setMoveIndex(0)
    setCorrectMoves(0)
    correctMovesRef.current = 0
    setWrongMoves(0)
    wrongMovesRef.current = 0
    setElapsedMs(0)
    elapsedMsRef.current = 0
    setStartTime(null)
    isRunningRef.current = false
    setIsRunning(false)
    setPendingPromotion(null)
  }, [study.rootFen, stopTimer])

  // Start drill
  const startDrill = useCallback(() => {
    resetDrill()
    // Will start timer on first move
  }, [resetDrill])

  // Legal dests for current position
  const legalDests = useMemo(() => {
    if (isComplete || !isUserTurn()) return new Map<Key, Key[]>()
    return getLegalDests(chessRef.current)
  }, [fen, isComplete, isUserTurn])

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const tenths = Math.floor((ms % 1000) / 100)
    return `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`
  }

  // Progress
  const progress = {
    currentLine: currentLineIndex + 1,
    totalLines: allLines.length,
    currentMove: moveIndex,
    totalMoves: moves.length,
    overallProgress: allLines.length > 0
      ? ((currentLineIndex + (moveIndex / Math.max(moves.length, 1))) / allLines.length) * 100
      : 0,
  }

  // Stats
  const stats: SpeedDrillStats = {
    totalMoves: correctMoves + wrongMoves,
    correctMoves,
    wrongMoves,
    timeMs: elapsedMs,
    averageTimePerMove: correctMoves > 0 ? elapsedMs / correctMoves : 0,
    accuracy: correctMoves + wrongMoves > 0 ? (correctMoves / (correctMoves + wrongMoves)) * 100 : 0,
  }

  // Chessground config
  const config: Config = useMemo(() => ({
    fen,
    orientation: study.color,
    turnColor,
    lastMove,
    check: inCheck,
    movable: {
      free: false,
      color: !isComplete && isUserTurn() ? userColor : undefined,
      dests: legalDests,
      showDests: true,
    },
    premovable: { enabled: false },
    animation: { enabled: true, duration: 100 }, // Faster animations
    drawable: {
      enabled: false, // No drawing in speed mode
    },
  }), [fen, study.color, turnColor, lastMove, inCheck, legalDests, isComplete, isUserTurn, userColor])

  return {
    // State
    config,
    fen,
    isComplete,
    isRunning,
    boardKey,

    // Timer
    elapsedMs,
    formatTime,
    timeLimit,
    remainingTime: timeLimit > 0 ? Math.max(0, timeLimit * 1000 - elapsedMs) : null,

    // Progress
    progress,
    stats,
    totalMovesInDrill,

    // Actions
    makeMove,
    startDrill,
    resetDrill,

    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,
  }
}
