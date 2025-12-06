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
import { shuffleArray } from '@/lib/opening-utils'

export interface PendingPromotion {
  from: Key
  to: Key
}

export type PracticeStatus = 'playing' | 'line-complete'

export type HintLevel = 0 | 1 | 2 | 3 // 0=none, 1=piece, 2=target square, 3=full arrow

export interface UseOpeningPracticeOptions {
  study: OpeningStudy
  randomOrder?: boolean
  selectedLineIndices?: number[] // For practicing specific variations
  onLineComplete?: () => void
  onAllLinesComplete?: () => void
}

/**
 * Extract all lines from opening tree as arrays of UCI moves
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
 * Get node info for a line
 */
function getLineNodes(nodes: OpeningMoveNode[]): OpeningMoveNode[][] {
  const lines: OpeningMoveNode[][] = []

  function traverse(node: OpeningMoveNode, currentLine: OpeningMoveNode[]) {
    const newLine = [...currentLine, node]

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

export function useOpeningPractice(options: UseOpeningPracticeOptions) {
  const { study, randomOrder = false, selectedLineIndices, onLineComplete, onAllLinesComplete } = options

  // Extract all lines as UCI move arrays (like puzzle)
  const allLinesRaw = useMemo(() => extractAllLines(study.moves), [study.moves])
  const allLineNodesRaw = useMemo(() => getLineNodes(study.moves), [study.moves])

  // Filter to selected lines if specified
  const filteredLines = useMemo(() => {
    if (!selectedLineIndices || selectedLineIndices.length === 0) {
      return { lines: allLinesRaw, nodes: allLineNodesRaw }
    }
    return {
      lines: selectedLineIndices.map(i => allLinesRaw[i]).filter(Boolean),
      nodes: selectedLineIndices.map(i => allLineNodesRaw[i]).filter(Boolean),
    }
  }, [allLinesRaw, allLineNodesRaw, selectedLineIndices])

  // Apply random order if enabled
  const [lineOrder, setLineOrder] = useState<number[]>(() => {
    const indices = Array.from({ length: filteredLines.lines.length }, (_, i) => i)
    return randomOrder ? shuffleArray(indices) : indices
  })

  // Re-shuffle when randomOrder or lines change
  useEffect(() => {
    const indices = Array.from({ length: filteredLines.lines.length }, (_, i) => i)
    setLineOrder(randomOrder ? shuffleArray(indices) : indices)
  }, [randomOrder, filteredLines.lines.length])

  const allLines = useMemo(() => lineOrder.map(i => filteredLines.lines[i]), [lineOrder, filteredLines.lines])
  const allLineNodes = useMemo(() => lineOrder.map(i => filteredLines.nodes[i]), [lineOrder, filteredLines.nodes])

  // Current line index
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const currentLineIndexRef = useRef(currentLineIndex)
  currentLineIndexRef.current = currentLineIndex // Always keep ref in sync

  // Current line (array of UCI moves)
  const moves = useMemo(() => allLines[currentLineIndex] || [], [allLines, currentLineIndex])
  const movesRef = useRef(moves)
  movesRef.current = moves // Always keep ref in sync
  const currentLineNodes = useMemo(() => allLineNodes[currentLineIndex] || [], [allLineNodes, currentLineIndex])

  // Chess state
  const chessRef = useRef<Chess>(createChess(study.rootFen))
  const [fen, setFen] = useState(() => toChessgroundFen(chessRef.current))
  const [turnColor, setTurnColor] = useState(() => getTurnColor(chessRef.current))
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [inCheck, setInCheck] = useState(() => isCheck(chessRef.current))
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [moveIndex, setMoveIndex] = useState(0)
  const moveIndexRef = useRef(0)
  const [boardKey, setBoardKey] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Practice-specific state
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [hintLevel, setHintLevel] = useState<HintLevel>(0) // Progressive hints
  const [showWrongMove, setShowWrongMove] = useState(false)
  const [completedLines, setCompletedLines] = useState<Set<number>>(new Set())
  const [skippedLines, setSkippedLines] = useState<Set<number>>(new Set())
  const [status, setStatus] = useState<PracticeStatus>('playing')

  // User color and orientation
  const userColor = study.color
  const orientation = userColor

  // Legal destinations
  const legalDests = useMemo(() => getLegalDests(chessRef.current), [fen])

  // Parse UCI move
  const parseUci = (uci: string) => {
    const from = uci.slice(0, 2) as Square
    const to = uci.slice(2, 4) as Square
    const promotion = uci.length > 4 ? (uci[4] as PromotionPiece) : undefined
    return { from, to, promotion }
  }

  // Check if it's user's turn
  const isUserTurn = useCallback(() => {
    return getTurnColor(chessRef.current) === userColor
  }, [userColor])

  // Play machine move at given index
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

      if (nextIndex >= currentMoves.length) {
        setIsComplete(true)
        return
      }

      // If still not user's turn, play next machine move
      if (getTurnColor(chess) !== userColor) {
        setTimeout(() => playMachineMove(nextIndex), 400)
      }
    }
  }, [userColor])

  // Play first machine move if opponent starts
  useEffect(() => {
    if (moveIndexRef.current === 0 && moves.length > 0 && status === 'playing') {
      const timeout = setTimeout(() => {
        if (!isUserTurn()) {
          playMachineMove(0)
        }
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [currentLineIndex, moves, status, isUserTurn, playMachineMove])

  // Check if move is promotion
  const isPromotionMove = useCallback((from: Key, to: Key): boolean => {
    const piece = chessRef.current.get(from as Square)
    if (!piece || piece.type !== 'p') return false
    const toRank = to[1]
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
  }, [])

  // Execute user move
  const executeMove = useCallback((from: Key, to: Key, promotion?: PromotionPiece) => {
    const chess = chessRef.current
    const currentIndex = moveIndexRef.current
    const currentMoves = movesRef.current
    const expectedUci = currentMoves[currentIndex]

    if (!expectedUci) return false

    const userUci = `${from}${to}${promotion || ''}`

    // Check if move is correct
    if (userUci !== expectedUci) {
      // Wrong move - play wrong sound
      playSound('wrong')
      setWrongAttempts(prev => prev + 1)
      setShowWrongMove(true)

      // Progressive hints: increase hint level after wrong attempts
      if (wrongAttempts >= 2) {
        setHintLevel(3) // Full arrow
      } else if (wrongAttempts >= 1) {
        setHintLevel(2) // Target square
      } else {
        setHintLevel(1) // Piece to move
      }

      // Reset wrong move indicator after delay
      setTimeout(() => setShowWrongMove(false), 500)

      // Shake the board or give visual feedback
      setBoardKey(k => k + 1)
      return false
    }

    // Correct move
    const move = chess.move({ from: from as Square, to: to as Square, promotion })

    if (move) {
      setFen(toChessgroundFen(chess))
      setTurnColor(getTurnColor(chess))
      setLastMove([from, to])
      setShowWrongMove(false)
      setHintLevel(0) // Reset hint level

      const checkAfterMove = isCheck(chess)
      setInCheck(checkAfterMove)

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

      if (nextIndex >= currentMoves.length) {
        setIsComplete(true)
        setStatus('line-complete')
        setCompletedLines(prev => new Set([...prev, currentLineIndexRef.current]))
        onLineComplete?.()

        // Check if all lines are complete
        const newCompletedCount = completedLines.size + 1
        if (newCompletedCount >= allLines.length) {
          onAllLinesComplete?.()
        }
        return true
      }

      // Play machine's next move
      setTimeout(() => playMachineMove(nextIndex), 400)

      return true
    }

    return false
  }, [playMachineMove, wrongAttempts, currentLineIndex, completedLines.size, allLines.length, onLineComplete, onAllLinesComplete])

  // Handle move from chessground
  const makeMove = useCallback((from: Key, to: Key) => {
    if (isComplete) return false

    if (isPromotionMove(from, to)) {
      setPendingPromotion({ from, to })
      setBoardKey(k => k + 1)
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
    setFen(toChessgroundFen(chessRef.current))
  }, [])

  // Reset / Go to start (resetLine)
  const resetLine = useCallback(() => {
    chessRef.current = createChess(study.rootFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setIsComplete(false)
    setWrongAttempts(0)
    setHintLevel(0)
    setShowWrongMove(false)
    setStatus('playing')
    moveIndexRef.current = 0
    setMoveIndex(0)
    setPendingPromotion(null)

    setTimeout(() => {
      if (!isUserTurn()) {
        playMachineMove(0)
      }
    }, 500)
  }, [study.rootFen, isUserTurn, playMachineMove])

  // Select a specific line
  const selectLine = useCallback((lineIndex: number) => {
    if (lineIndex < 0 || lineIndex >= allLines.length) return

    chessRef.current = createChess(study.rootFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(false)
    setIsComplete(false)
    setWrongAttempts(0)
    setHintLevel(0)
    setShowWrongMove(false)
    setStatus('playing')
    moveIndexRef.current = 0
    setMoveIndex(0)
    setPendingPromotion(null)

    setCurrentLineIndex(lineIndex)
  }, [allLines.length, study.rootFen])

  // Go to next line
  const nextLine = useCallback(() => {
    if (currentLineIndex < allLines.length - 1) {
      selectLine(currentLineIndex + 1)
    }
  }, [currentLineIndex, allLines.length, selectLine])

  // Skip current line
  const skipLine = useCallback(() => {
    setSkippedLines(prev => new Set([...prev, currentLineIndex]))
    if (currentLineIndex < allLines.length - 1) {
      selectLine(currentLineIndex + 1)
    }
  }, [currentLineIndex, allLines.length, selectLine])

  // Increase hint level manually
  const increaseHint = useCallback(() => {
    setHintLevel(prev => Math.min(prev + 1, 3) as HintLevel)
  }, [])

  // Reset hint level
  const resetHint = useCallback(() => {
    setHintLevel(0)
  }, [])

  // Progressive hint shapes based on hint level
  const hintShapes = useMemo(() => {
    if (hintLevel === 0 || isComplete || !isUserTurn()) return []

    const expectedUci = moves[moveIndexRef.current]
    if (!expectedUci) return []

    const from = expectedUci.slice(0, 2) as Key
    const to = expectedUci.slice(2, 4) as Key

    const shapes: Array<{ orig: Key; dest?: Key; brush: string }> = []

    if (hintLevel >= 1) {
      // Level 1: Highlight piece to move (circle)
      shapes.push({ orig: from, brush: 'yellow' })
    }
    if (hintLevel >= 2) {
      // Level 2: Highlight target square
      shapes.push({ orig: to, brush: 'blue' })
    }
    if (hintLevel >= 3) {
      // Level 3: Full arrow
      shapes.push({ orig: from, dest: to, brush: 'green' })
    }

    return shapes
  }, [hintLevel, moves, moveIndex, isComplete, isUserTurn])

  // Saved shapes from the current position's node (the last played move)
  const savedShapes = useMemo(() => {
    // Current position is after move (moveIndex - 1)
    // So we want the shapes from that node
    if (moveIndex === 0) return []
    const lastPlayedNode = currentLineNodes[moveIndex - 1]
    if (!lastPlayedNode?.shapes) return []
    return lastPlayedNode.shapes.map(s => ({
      orig: s.orig as Key,
      dest: s.dest as Key | undefined,
      brush: s.brush,
    }))
  }, [moveIndex, currentLineNodes])

  // Combined shapes (saved + hints)
  const allShapes = useMemo(() => {
    return [...savedShapes, ...hintShapes]
  }, [savedShapes, hintShapes])

  // Progress info
  const progressInfo = useMemo(() => ({
    completedLines: completedLines.size,
    totalLines: allLines.length,
    currentMove: moveIndex,
    totalMoves: moves.length,
  }), [completedLines.size, allLines.length, moveIndex, moves.length])

  // Chessground config - allow all legal moves in practice mode
  const chessgroundConfig: Config = useMemo(() => ({
    fen,
    orientation,
    turnColor,
    lastMove,
    check: inCheck,
    movable: {
      free: false,
      color: status === 'playing' && isUserTurn() ? userColor : undefined,
      dests: status === 'playing' && isUserTurn() ? legalDests : new Map(),
      showDests: true,
    },
    premovable: { enabled: false },
    drawable: {
      enabled: true,
      autoShapes: allShapes,
    },
    highlight: {
      lastMove: true,
      check: true,
    },
    animation: { enabled: true, duration: 200 },
  }), [fen, orientation, turnColor, lastMove, inCheck, legalDests, allShapes, status, isUserTurn, userColor])

  return {
    // Status
    status,

    // State
    fen,
    turnColor,
    lastMove,
    inCheck,
    isComplete,
    orientation,

    // User info
    userColor,

    // Progress
    progressInfo,
    completedLines,
    skippedLines,

    // Line info
    currentLine: currentLineNodes,
    currentLineIndex,
    allLines: allLineNodes,
    totalLinesCount: filteredLines.lines.length,
    selectLine,
    nextLine,
    skipLine,

    // Practice state
    wrongAttempts,
    hintLevel,
    increaseHint,
    resetHint,
    showWrongMove,

    // Actions
    makeMove,
    resetLine,

    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,

    // Config
    chessgroundConfig,
    boardKey,

    // UI helpers
    isUserTurn: isUserTurn(),
  }
}
