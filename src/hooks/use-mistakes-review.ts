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
import { INITIAL_FEN, findNodeById, getPathToNode, getNodeAtPath } from '@/lib/opening-utils'

// Storage key for mistakes
const MISTAKES_STORAGE_KEY = 'chessop-mistakes'

export interface MistakeRecord {
  studyId: string
  nodeId: string // The node where the mistake was made
  expectedUci: string
  wrongAttempts: number
  lastAttempt: number // timestamp
  nextReview: number // timestamp for spaced repetition
  streak: number // consecutive correct answers
}

export interface PendingPromotion {
  from: Key
  to: Key
}

export type HintLevel = 0 | 1 | 2 // 0=none, 1=piece, 2=arrow

export interface UseMistakesReviewOptions {
  study: OpeningStudy
  onComplete?: () => void
  onMistakeCompleted?: () => void
}

// Spaced repetition intervals (in hours)
const INTERVALS = [1, 4, 12, 24, 48, 96, 192, 384]

function getNextReviewTime(streak: number): number {
  const hours = INTERVALS[Math.min(streak, INTERVALS.length - 1)]
  return Date.now() + hours * 60 * 60 * 1000
}

// Load mistakes from localStorage
function loadMistakes(): MistakeRecord[] {
  try {
    const stored = localStorage.getItem(MISTAKES_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save mistakes to localStorage
function saveMistakes(mistakes: MistakeRecord[]): void {
  try {
    localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(mistakes))
  } catch (e) {
    console.error('Failed to save mistakes:', e)
  }
}

// Record a new mistake
export function recordMistake(studyId: string, nodeId: string, expectedUci: string): void {
  const mistakes = loadMistakes()
  const existing = mistakes.find(m => m.studyId === studyId && m.nodeId === nodeId)

  if (existing) {
    existing.wrongAttempts++
    existing.lastAttempt = Date.now()
    existing.nextReview = Date.now() // Review immediately
    existing.streak = 0
  } else {
    mistakes.push({
      studyId,
      nodeId,
      expectedUci,
      wrongAttempts: 1,
      lastAttempt: Date.now(),
      nextReview: Date.now(),
      streak: 0,
    })
  }

  saveMistakes(mistakes)
}

// Mark a mistake as correctly answered
export function markCorrect(studyId: string, nodeId: string): void {
  const mistakes = loadMistakes()
  const existing = mistakes.find(m => m.studyId === studyId && m.nodeId === nodeId)

  if (existing) {
    existing.streak++
    existing.nextReview = getNextReviewTime(existing.streak)
    existing.lastAttempt = Date.now()
    saveMistakes(mistakes)
  }
}

// Get mistakes due for review
export function getMistakesDueForReview(studyId: string): MistakeRecord[] {
  const mistakes = loadMistakes()
  const now = Date.now()
  return mistakes
    .filter(m => m.studyId === studyId && m.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview)
}

// Get all mistakes for a study
export function getAllMistakes(studyId: string): MistakeRecord[] {
  return loadMistakes().filter(m => m.studyId === studyId)
}

// Clear all mistakes for a study
export function clearMistakes(studyId: string): void {
  const mistakes = loadMistakes()
  const filtered = mistakes.filter(m => m.studyId !== studyId)
  saveMistakes(filtered)
}

/**
 * Build the path of moves leading to a node
 */
function buildPathToNode(
  nodes: OpeningMoveNode[],
  targetNodeId: string
): { path: string[], fen: string } | null {
  const path = getPathToNode(nodes, targetNodeId)
  if (path.length === 0) return null

  // Get the FEN of the position BEFORE the target node
  if (path.length === 1) {
    return { path: [], fen: INITIAL_FEN }
  }

  const parentPath = path.slice(0, -1)
  const parentNode = getNodeAtPath(nodes, parentPath)
  return parentNode ? { path: parentPath, fen: parentNode.fen } : null
}

/**
 * Mistakes Review Mode Hook
 * Practice positions where you've made mistakes using spaced repetition
 */
export function useMistakesReview({
  study,
  onComplete,
  onMistakeCompleted,
}: UseMistakesReviewOptions) {
  const chessRef = useRef<Chess>(createChess(study.rootFen || INITIAL_FEN))

  // Get mistakes due for review
  const [mistakesToReview, setMistakesToReview] = useState<MistakeRecord[]>(() =>
    getMistakesDueForReview(study.id)
  )

  // Current mistake index
  const [currentIndex, setCurrentIndex] = useState(0)

  // State
  const [fen, setFen] = useState(() => toChessgroundFen(chessRef.current))
  const [turnColor, setTurnColor] = useState(() => getTurnColor(chessRef.current))
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [inCheck, setInCheck] = useState(false)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const [boardKey, setBoardKey] = useState(0)

  // Attempt tracking
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [showWrongMove, setShowWrongMove] = useState(false)
  const [hintLevel, setHintLevel] = useState<HintLevel>(0)
  const [isCorrect, setIsCorrect] = useState(false)

  // Stats
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  // Current mistake
  const currentMistake = mistakesToReview[currentIndex]

  // Find the node and setup position
  const setupPosition = useCallback((mistake: MistakeRecord | undefined) => {
    if (!mistake) return

    const result = buildPathToNode(study.moves, mistake.nodeId)
    if (!result) return

    // Set up the position before the mistake
    chessRef.current = createChess(result.fen)
    setFen(toChessgroundFen(chessRef.current))
    setTurnColor(getTurnColor(chessRef.current))
    setLastMove(undefined)
    setInCheck(isCheck(chessRef.current))
    setWrongAttempts(0)
    setHintLevel(0)
    setIsCorrect(false)
    setShowWrongMove(false)
  }, [study.moves])

  // Setup initial position
  useEffect(() => {
    setupPosition(currentMistake)
  }, [currentMistake, setupPosition])

  // User color
  const userColor = study.color

  // Check if it's user's turn
  const isUserTurn = useCallback(() => {
    return getTurnColor(chessRef.current) === userColor
  }, [userColor])

  // Check if move is promotion
  const isPromotionMove = useCallback((from: Key, to: Key): boolean => {
    const piece = chessRef.current.get(from as Square)
    if (!piece || piece.type !== 'p') return false
    const toRank = to[1]
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
  }, [])

  // Execute move
  const executeMove = useCallback((from: Key, to: Key, promotion?: PromotionPiece) => {
    if (!currentMistake || isCorrect) return false

    const userUci = `${from}${to}${promotion || ''}`
    const expectedUci = currentMistake.expectedUci

    // Check if correct
    if (userUci !== expectedUci) {
      playSound('wrong')
      setWrongAttempts(prev => prev + 1)
      setWrongCount(prev => prev + 1)
      setShowWrongMove(true)

      // Progressive hints
      if (wrongAttempts >= 1) {
        setHintLevel(2)
      } else {
        setHintLevel(1)
      }

      setTimeout(() => setShowWrongMove(false), 500)
      setBoardKey(k => k + 1)
      return false
    }

    // Correct!
    const chess = chessRef.current
    const move = chess.move({ from: from as Square, to: to as Square, promotion })

    if (move) {
      setFen(toChessgroundFen(chess))
      setTurnColor(getTurnColor(chess))
      setLastMove([from, to])
      setInCheck(isCheck(chess))
      setIsCorrect(true)
      setCorrectCount(prev => prev + 1)

      const soundType = getMoveSound({
        isCapture: !!move.captured,
        isCastle: move.san === 'O-O' || move.san === 'O-O-O',
        isCheck: isCheck(chess),
        isPromotion: !!move.promotion,
      })
      playSound(soundType)

      // Mark as correct in storage (only if no wrong attempts)
      if (wrongAttempts === 0) {
        markCorrect(study.id, currentMistake.nodeId)
      } else {
        // Re-record mistake to reset streak
        recordMistake(study.id, currentMistake.nodeId, expectedUci)
      }

      // Notify parent that a mistake was completed (for badge update)
      onMistakeCompleted?.()

      return true
    }

    return false
  }, [currentMistake, isCorrect, wrongAttempts, study.id, onMistakeCompleted])

  // Handle move from chessground
  const makeMove = useCallback((from: Key, to: Key) => {
    if (isPromotionMove(from, to)) {
      setPendingPromotion({ from, to })
      return false
    }
    return executeMove(from, to)
  }, [isPromotionMove, executeMove])

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

  // Go to next mistake
  const nextMistake = useCallback(() => {
    if (currentIndex < mistakesToReview.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      // All done - increment index to trigger isComplete
      setCurrentIndex(prev => prev + 1)
      onComplete?.()
    }
  }, [currentIndex, mistakesToReview.length, onComplete])

  // Skip current mistake
  const skipMistake = useCallback(() => {
    nextMistake()
  }, [nextMistake])

  // Retry current mistake
  const retryMistake = useCallback(() => {
    setupPosition(currentMistake)
  }, [currentMistake, setupPosition])

  // Refresh mistakes list
  const refreshMistakes = useCallback(() => {
    const fresh = getMistakesDueForReview(study.id)
    setMistakesToReview(fresh)
    setCurrentIndex(0)
    setCorrectCount(0)
    setWrongCount(0)
    if (fresh.length > 0) {
      setupPosition(fresh[0])
    }
  }, [study.id, setupPosition])

  // Show hint
  const showHint = useCallback(() => {
    setHintLevel(prev => Math.min(prev + 1, 2) as HintLevel)
  }, [])

  // Legal dests
  const legalDests = useMemo(() => {
    if (isCorrect || !isUserTurn()) return new Map<Key, Key[]>()
    return getLegalDests(chessRef.current)
  }, [fen, isCorrect, isUserTurn])

  // Hint shapes
  const hintShapes = useMemo((): DrawShape[] => {
    if (hintLevel === 0 || isCorrect || !currentMistake) return []

    const from = currentMistake.expectedUci.slice(0, 2) as Key
    const to = currentMistake.expectedUci.slice(2, 4) as Key

    const shapes: DrawShape[] = []

    if (hintLevel >= 1) {
      shapes.push({ orig: from, brush: 'yellow' })
    }
    if (hintLevel >= 2) {
      shapes.push({ orig: from, dest: to, brush: 'green' })
    }

    return shapes
  }, [hintLevel, isCorrect, currentMistake])

  // Get context node (the node where mistake was made)
  const contextNode = useMemo(() => {
    if (!currentMistake) return null
    return findNodeById(study.moves, currentMistake.nodeId)
  }, [currentMistake, study.moves])

  // Chessground config
  const config: Config = useMemo(() => ({
    fen,
    orientation: study.color,
    turnColor,
    lastMove,
    check: inCheck,
    movable: {
      free: false,
      color: !isCorrect && isUserTurn() ? userColor : undefined,
      dests: legalDests,
      showDests: true,
    },
    premovable: { enabled: false },
    animation: { enabled: true, duration: 200 },
    drawable: {
      enabled: true,
      autoShapes: hintShapes,
    },
  }), [fen, study.color, turnColor, lastMove, inCheck, legalDests, isCorrect, isUserTurn, userColor, hintShapes])

  // Is complete (no more mistakes)
  const isComplete = mistakesToReview.length === 0 || currentIndex >= mistakesToReview.length

  // All mistakes for study (not just due)
  const allMistakes = useMemo(() => getAllMistakes(study.id), [study.id])

  return {
    // State
    config,
    fen,
    boardKey,
    isCorrect,
    showWrongMove,
    wrongAttempts,
    hintLevel,

    // Current mistake info
    currentMistake,
    contextNode,
    currentIndex,
    totalMistakes: mistakesToReview.length,
    isComplete,

    // All mistakes (for display)
    allMistakes,
    mistakesDue: mistakesToReview.length,

    // Stats
    correctCount,
    wrongCount,

    // Actions
    makeMove,
    nextMistake,
    skipMistake,
    retryMistake,
    showHint,
    refreshMistakes,

    // Promotion
    pendingPromotion,
    completePromotion,
    cancelPromotion,

    // Utils
    clearAllMistakes: () => {
      clearMistakes(study.id)
      setMistakesToReview([])
    },
  }
}
