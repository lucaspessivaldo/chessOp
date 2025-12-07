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
  getTurnColor,
  toChessgroundFen,
  isCheck,
} from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'
import { createNagShape } from '@/chess/nag-shapes'

export interface PendingPromotion {
  from: Key
  to: Key
}

export interface UseOpeningStudyOptions {
  study: OpeningStudy
}

/**
 * Get current path in tree format for MoveList component
 */
function getCurrentPathIds(moveIndex: number, line: OpeningMoveNode[]): string[] {
  // Return node IDs up to current move index
  return line.slice(0, moveIndex).map(node => node.id)
}

/**
 * Extract all lines from opening tree as arrays of UCI moves
 * Each line is a complete path from root to leaf
 */
function extractAllLines(nodes: OpeningMoveNode[]): string[][] {
  const lines: string[][] = []

  function traverse(node: OpeningMoveNode, currentLine: string[]) {
    const newLine = [...currentLine, node.uci]

    if (node.children.length === 0) {
      // Leaf node - complete line
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
 * Get node info for a line (for display purposes)
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

export function useOpeningStudy(options: UseOpeningStudyOptions) {
  const { study } = options

  // Extract all lines as UCI move arrays (like puzzle moves)
  const allLines = useMemo(() => extractAllLines(study.moves), [study.moves])
  const allLineNodes = useMemo(() => getLineNodes(study.moves), [study.moves])

  // Current line index
  const [currentLineIndex, setCurrentLineIndex] = useState(0)

  // Current line (array of UCI moves, just like puzzle)
  const moves = useMemo(() => allLines[currentLineIndex] || [], [allLines, currentLineIndex])
  const movesRef = useRef(moves)
  movesRef.current = moves // Always keep ref in sync
  const currentLineNodes = useMemo(() => allLineNodes[currentLineIndex] || [], [allLineNodes, currentLineIndex])

  // Chess state (same as puzzle)
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

  // User color and orientation
  const userColor = study.color
  const orientation = userColor

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

  // Ref to store executeMove
  const executeMoveRef = useRef<(from: Key, to: Key, promotion?: PromotionPiece) => boolean>(() => false)

  // Play machine move at given index (same as puzzle)
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

      // Check if line is complete
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
    if (moveIndexRef.current === 0 && moves.length > 0 && !isComplete) {
      const timeout = setTimeout(() => {
        if (!isUserTurn()) {
          playMachineMove(0)
        }
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [currentLineIndex, moves, isComplete, isUserTurn, playMachineMove])

  // Check if move is promotion
  const isPromotionMove = useCallback((from: Key, to: Key): boolean => {
    const piece = chessRef.current.get(from as Square)
    if (!piece || piece.type !== 'p') return false
    const toRank = to[1]
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
  }, [])

  // Execute user move (same logic as puzzle - validate against expected)
  const executeMove = useCallback((from: Key, to: Key, promotion?: PromotionPiece) => {
    const chess = chessRef.current
    const currentIndex = moveIndexRef.current
    const expectedUci = moves[currentIndex]

    if (!expectedUci) return false

    // Build user's UCI string
    const userUci = `${from}${to}${promotion || ''}`

    // In study mode, only allow the expected move
    if (userUci !== expectedUci) {
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

      const nextIndex = currentIndex + 1
      moveIndexRef.current = nextIndex
      setMoveIndex(nextIndex)

      // Check if line is complete
      if (nextIndex >= moves.length) {
        setIsComplete(true)
        return true
      }

      // Play machine's next move
      setTimeout(() => playMachineMove(nextIndex), 400)

      return true
    }

    return false
  }, [moves, playMachineMove])

  // Keep ref in sync
  useEffect(() => {
    executeMoveRef.current = executeMove
  }, [executeMove])

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

  // Go to previous line
  const previousLine = useCallback(() => {
    if (currentLineIndex > 0) {
      selectLine(currentLineIndex - 1)
    }
  }, [currentLineIndex, selectLine])

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

  // Arrow showing expected move (like puzzle hint)
  const moveArrows = useMemo((): DrawShape[] => {
    const shapes: DrawShape[] = []

    // Add NAG shape if present
    if (nagShape) {
      shapes.push(nagShape)
    }

    // Add move hint arrow
    if (!isComplete && isUserTurn()) {
      const expectedUci = moves[moveIndexRef.current]
      if (expectedUci) {
        const from = expectedUci.slice(0, 2) as Key
        const to = expectedUci.slice(2, 4) as Key
        shapes.push({
          orig: from,
          dest: to,
          brush: 'green',
        })
      }
    }

    return shapes
  }, [moves, moveIndex, isComplete, isUserTurn, nagShape])

  // Study destinations - only allow the expected move
  const studyDests = useMemo(() => {
    if (isComplete || !isUserTurn()) return new Map<Key, Key[]>()

    const expectedUci = moves[moveIndexRef.current]
    if (!expectedUci) return new Map<Key, Key[]>()

    const from = expectedUci.slice(0, 2) as Key
    const to = expectedUci.slice(2, 4) as Key

    return new Map<Key, Key[]>([[from, [to]]])
  }, [moves, moveIndex, isComplete, isUserTurn])

  // Current comment
  const currentComment = useMemo(() => {
    if (moveIndex === 0) return null
    const prevNode = currentLineNodes[moveIndex - 1]
    return prevNode?.comment || null
  }, [currentLineNodes, moveIndex])

  // Available moves at current position (for determining if complete)
  const availableMoves = useMemo(() => {
    if (moveIndex >= moves.length) return []
    return [moves[moveIndex]] // Just one expected move
  }, [moves, moveIndex])

  // Current path (for MoveList highlighting)
  const currentPath = useMemo(() => {
    return getCurrentPathIds(moveIndex, currentLineNodes)
  }, [moveIndex, currentLineNodes])

  // Chessground config
  const chessgroundConfig: Config = useMemo(() => ({
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
    premovable: { enabled: false },
    drawable: {
      enabled: true,
      autoShapes: moveArrows,
    },
    animation: { enabled: true, duration: 200 },
  }), [fen, orientation, turnColor, lastMove, inCheck, studyDests, moveArrows, isComplete, isUserTurn, userColor])

  return {
    // State
    fen,
    turnColor,
    lastMove,
    inCheck,
    isComplete,
    orientation,

    // Navigation
    goToStart,
    goToEnd: goToStart, // Not implemented, just restart
    goToPreviousMove: goToStart, // Just restart for simplicity
    goToNode: () => { }, // Not used
    goToMainLine: goToStart,

    // Move info
    moveInfo: {
      current: moveIndex,
      total: moves.length,
      isMainLine: currentLineIndex === 0,
    },
    currentComment,
    availableMoves,
    currentPath,

    // Line info
    currentLine: currentLineNodes,
    currentLineIndex,
    allLines,
    selectLine,
    nextLine,
    previousLine,

    // Actions
    makeMove,

    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,

    // Config
    chessgroundConfig,
    moveArrows,
    boardKey,

    // UI helpers
    isUserTurn: isUserTurn(),
  }
}
