import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
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
import { shuffleArray, findNodeById, getPathToNode } from '@/lib/opening-utils'
import { loadPracticeProgress, savePracticeProgress, clearPracticeProgress } from '@/lib/practice-storage'
import { createNagShape } from '@/chess/nag-shapes'
import { recordMistake } from '@/hooks/use-mistakes-review'

export interface PendingPromotion {
  from: Key
  to: Key
}

export type PracticeStatus = 'playing' | 'line-complete'

export type HintLevel = 0 | 1 | 2 // 0=none, 1=piece, 2=full arrow

export interface UseOpeningPracticeOptions {
  study: OpeningStudy
  randomOrder?: boolean
  selectedLineIndices?: number[] // For practicing specific variations
  onLineComplete?: () => void
  onAllLinesComplete?: () => void
  onMistake?: () => void
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

/**
 * Extract lines with practice start marker support
 * Returns: { lines: UCI[][], nodes: Node[][], isSetupLine: boolean[], startFens: string[] }
 */
function extractLinesWithStartMarker(
  nodes: OpeningMoveNode[],
  practiceStartNodeId?: string,
  rootFen?: string
): { lines: string[][], nodes: OpeningMoveNode[][], isSetupLine: boolean[], startFens: string[] } {
  const defaultFen = rootFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  // If no start marker, use default behavior
  if (!practiceStartNodeId) {
    const lines = extractAllLines(nodes)
    const nodeLines = getLineNodes(nodes)
    return {
      lines,
      nodes: nodeLines,
      isSetupLine: lines.map(() => false),
      startFens: lines.map(() => defaultFen),
    }
  }

  // Find the start node
  const startNode = findNodeById(nodes, practiceStartNodeId)
  if (!startNode) {
    // Start node not found, fall back to default
    const lines = extractAllLines(nodes)
    const nodeLines = getLineNodes(nodes)
    return {
      lines,
      nodes: nodeLines,
      isSetupLine: lines.map(() => false),
      startFens: lines.map(() => defaultFen),
    }
  }

  // Get path to start node (the setup line)
  const pathToStart = getPathToNode(nodes, practiceStartNodeId)

  // Build the setup line
  const setupLineNodes: OpeningMoveNode[] = []
  const setupLineUci: string[] = []

  let currentNodes = nodes
  for (const nodeId of pathToStart) {
    const node = currentNodes.find(n => n.id === nodeId)
    if (node) {
      setupLineNodes.push(node)
      setupLineUci.push(node.uci)
      currentNodes = node.children
    }
  }

  // The FEN after the practice start position (for variation lines)
  const variationStartFen = startNode.fen

  // Get all lines starting FROM the start node
  const variationLines: string[][] = []
  const variationNodes: OpeningMoveNode[][] = []

  function traverseFromStart(node: OpeningMoveNode, currentLine: string[], currentNodes: OpeningMoveNode[]) {
    const newLine = [...currentLine, node.uci]
    const newNodes = [...currentNodes, node]

    if (node.children.length === 0) {
      variationLines.push(newLine)
      variationNodes.push(newNodes)
    } else {
      for (const child of node.children) {
        traverseFromStart(child, newLine, newNodes)
      }
    }
  }

  // Start from children of the start node
  if (startNode.children.length > 0) {
    for (const child of startNode.children) {
      traverseFromStart(child, [], [])
    }
  }

  // Combine: setup line first, then variation lines
  const allLines: string[][] = [setupLineUci, ...variationLines]
  const allNodes: OpeningMoveNode[][] = [setupLineNodes, ...variationNodes]
  const isSetupLine: boolean[] = [true, ...variationLines.map(() => false)]
  // Setup line starts from root, variation lines start from practice start position
  const startFens: string[] = [defaultFen, ...variationLines.map(() => variationStartFen)]

  return { lines: allLines, nodes: allNodes, isSetupLine, startFens }
}

export function useOpeningPractice(options: UseOpeningPracticeOptions) {
  const { study, randomOrder = false, selectedLineIndices, onLineComplete, onAllLinesComplete, onMistake } = options

  // Load saved progress
  const savedProgress = useMemo(() => loadPracticeProgress(study.id), [study.id])

  // Extract all lines with practice start marker support
  const extractedData = useMemo(
    () => extractLinesWithStartMarker(study.moves, study.practiceStartNodeId, study.rootFen),
    [study.moves, study.practiceStartNodeId, study.rootFen]
  )

  // Filter to selected lines if specified
  const filteredLines = useMemo(() => {
    if (!selectedLineIndices || selectedLineIndices.length === 0) {
      return extractedData
    }
    return {
      lines: selectedLineIndices.map(i => extractedData.lines[i]).filter(Boolean),
      nodes: selectedLineIndices.map(i => extractedData.nodes[i]).filter(Boolean),
      isSetupLine: selectedLineIndices.map(i => extractedData.isSetupLine[i]).filter(v => v !== undefined),
      startFens: selectedLineIndices.map(i => extractedData.startFens[i]).filter(Boolean),
    }
  }, [extractedData, selectedLineIndices])

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
  const allIsSetupLine = useMemo(() => lineOrder.map(i => filteredLines.isSetupLine[i]), [lineOrder, filteredLines.isSetupLine])
  const allStartFens = useMemo(() => lineOrder.map(i => filteredLines.startFens[i]), [lineOrder, filteredLines.startFens])

  // Current line index - restore from saved progress if available
  const [currentLineIndex, setCurrentLineIndex] = useState(() => {
    if (savedProgress && savedProgress.currentLineIndex < filteredLines.lines.length) {
      return savedProgress.currentLineIndex
    }
    return 0
  })
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

  // Practice-specific state - restore from saved progress if available
  const [completedLines, setCompletedLines] = useState<Set<number>>(() => {
    if (savedProgress) {
      return new Set(savedProgress.completedLines)
    }
    return new Set()
  })
  const [skippedLines, setSkippedLines] = useState<Set<number>>(() => {
    if (savedProgress) {
      return new Set(savedProgress.skippedLines)
    }
    return new Set()
  })
  const [totalWrongAttempts, setTotalWrongAttempts] = useState(() => savedProgress?.wrongAttempts || 0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [hintLevel, setHintLevel] = useState<HintLevel>(0) // Progressive hints
  const [showWrongMove, setShowWrongMove] = useState(false)
  const [status, setStatus] = useState<PracticeStatus>('playing')

  // Save progress whenever it changes
  useEffect(() => {
    savePracticeProgress({
      studyId: study.id,
      completedLines: Array.from(completedLines),
      skippedLines: Array.from(skippedLines),
      currentLineIndex,
      totalAttempts: 0, // Not tracking this yet
      wrongAttempts: totalWrongAttempts,
      lastPracticedAt: Date.now(),
    })
  }, [study.id, completedLines, skippedLines, currentLineIndex, totalWrongAttempts])

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
    const currentNodes = allLineNodes[currentLineIndexRef.current] || []
    const expectedUci = currentMoves[currentIndex]

    if (!expectedUci) return false

    const userUci = `${from}${to}${promotion || ''}`

    // Check if move is correct
    if (userUci !== expectedUci) {
      // Wrong move - play wrong sound
      playSound('wrong')
      setWrongAttempts(prev => prev + 1)
      setTotalWrongAttempts(prev => prev + 1)
      setShowWrongMove(true)

      // Record mistake for spaced repetition review
      const currentNode = currentNodes[currentIndex]
      if (currentNode) {
        recordMistake(study.id, currentNode.id, expectedUci)
        onMistake?.()
      }

      // Progressive hints: increase hint level after wrong attempts
      if (wrongAttempts >= 1) {
        setHintLevel(2) // Full arrow
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
    // Get the starting FEN for the current line
    const startFen = allStartFens[currentLineIndex] || study.rootFen
    chessRef.current = createChess(startFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(isCheck(chessRef.current))
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
  }, [allStartFens, currentLineIndex, study.rootFen, isUserTurn, playMachineMove])

  // Select a specific line
  const selectLine = useCallback((lineIndex: number) => {
    if (lineIndex < 0 || lineIndex >= allLines.length) return

    // Get the starting FEN for this line
    const startFen = allStartFens[lineIndex] || study.rootFen
    chessRef.current = createChess(startFen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(isCheck(chessRef.current))
    setIsComplete(false)
    setWrongAttempts(0)
    setHintLevel(0)
    setShowWrongMove(false)
    setStatus('playing')
    moveIndexRef.current = 0
    setMoveIndex(0)
    setPendingPromotion(null)

    setCurrentLineIndex(lineIndex)
  }, [allLines.length, allStartFens, study.rootFen])

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

  // Reset all progress and start from scratch
  const resetProgress = useCallback(() => {
    // Clear from storage
    clearPracticeProgress(study.id)

    // Reset all state
    setCompletedLines(new Set())
    setSkippedLines(new Set())
    setTotalWrongAttempts(0)
    setWrongAttempts(0)
    setHintLevel(0)
    setShowWrongMove(false)
    setStatus('playing')
    setIsComplete(false)

    // Go back to first line
    selectLine(0)
  }, [study.id, selectLine])

  // Increase hint level manually
  const increaseHint = useCallback(() => {
    setHintLevel(prev => Math.min(prev + 1, 2) as HintLevel)
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
      // Level 2: Full arrow
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

  // NAG shape for the last played move
  const nagShape = useMemo((): DrawShape | null => {
    if (moveIndex === 0) return null
    const lastNode = currentLineNodes[moveIndex - 1]
    if (!lastNode?.nags?.length) return null

    // Get destination square from the last move
    const lastUci = lastNode.uci
    const to = lastUci.slice(2, 4) as Key

    // Use the first NAG (primary annotation) - accepts $1, !, or 1 format
    const nag = lastNode.nags[0]
    return createNagShape(to, nag) || null
  }, [currentLineNodes, moveIndex])

  // Combined shapes (saved + hints + NAG)
  const allShapes = useMemo(() => {
    const shapes: DrawShape[] = [...savedShapes, ...hintShapes]
    if (nagShape) {
      shapes.push(nagShape)
    }
    return shapes
  }, [savedShapes, hintShapes, nagShape])

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

  // Check if current line is a setup line
  const isCurrentLineSetup = allIsSetupLine[currentLineIndex] ?? false

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
    isCurrentLineSetup,
    hasPracticeStartMarker: !!study.practiceStartNodeId,
    selectLine,
    nextLine,
    skipLine,
    resetProgress,

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
