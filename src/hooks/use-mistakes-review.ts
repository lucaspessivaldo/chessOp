import { useCallback, useMemo, useRef, useState } from 'react'
import type { Key } from '@lichess-org/chessground/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { OpeningMoveNode, OpeningStudy } from '@/types/opening'
import type { HintLevel } from '@/types/chess'
import { fenPly, findNodeById, getPathToNode, INITIAL_FEN } from '@/lib/opening-utils'
import {
  getMistakesDue,
  getStudyMistakes,
  recordReviewResult,
  type MistakeRecord,
} from '@/lib/mistakes-storage'
import { playSound } from '@/lib/sounds'
import { buildBoardConfig, useLinePlayer, type LineSource } from '@/hooks/use-line-player'

export interface ReviewItem {
  mistake: MistakeRecord
  /** The move the user must find */
  target: OpeningMoveNode
  /** The opponent's move leading to the position, if any */
  previous: OpeningMoveNode | null
  /** Line replayed for this item: the opponent's move (animated), then the target */
  line: LineSource
}

/**
 * Resolve a stored mistake into a playable position.
 * Mistakes recorded on an opponent move (older versions) are mapped to the user's reply.
 */
function resolveItem(study: OpeningStudy, mistake: MistakeRecord): ReviewItem | null {
  const rootFen = study.rootFen || INITIAL_FEN
  let path = getPathToNode(study.moves, mistake.nodeId)
  if (path.length === 0) return null

  const isUserPly = (ply: number) => (ply % 2 === 0) === (study.color === 'white')
  let target = findNodeById(study.moves, mistake.nodeId)
  if (!target) return null

  if (!isUserPly(fenPly(rootFen) + path.length - 1)) {
    const reply = target.children[0]
    if (!reply) return null
    target = reply
    path = [...path, reply.id]
  }

  const previous = path.length >= 2 ? findNodeById(study.moves, path[path.length - 2]) : null
  const beforePrevious = path.length >= 3 ? findNodeById(study.moves, path[path.length - 3]) : null

  const line: LineSource = previous
    ? { startFen: beforePrevious?.fen ?? rootFen, uci: [previous.uci, target.uci] }
    : { startFen: rootFen, uci: [target.uci] }

  return { mistake, target, previous, line }
}

function buildQueue(study: OpeningStudy, all: boolean): ReviewItem[] {
  const mistakes = all ? getStudyMistakes(study) : getMistakesDue(study)
  return mistakes.map(m => resolveItem(study, m)).filter((item): item is ReviewItem => item !== null)
}

const EMPTY_SOURCE: LineSource = { uci: [], startFen: INITIAL_FEN }

/**
 * Mistakes review: replay the positions where you went wrong, scheduled with spaced repetition
 */
export function useMistakesReview({ study, onReviewed }: { study: OpeningStudy; onReviewed?: () => void }) {
  const [queue, setQueue] = useState<ReviewItem[]>(() => buildQueue(study, false))
  const [index, setIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [hintLevel, setHintLevel] = useState<HintLevel>(0)
  const [showWrongMove, setShowWrongMove] = useState(false)
  const [results, setResults] = useState({ clean: 0, withErrors: 0, skipped: 0, mastered: 0 })
  const attemptRef = useRef({ wrong: 0, hints: 0 })
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = queue[index] ?? null
  const isComplete = index >= queue.length

  const player = useLinePlayer({
    initialLine: current?.line ?? EMPTY_SOURCE,
    userColor: study.color,
    startDelay: 400,
    onWrong: () => {
      attemptRef.current.wrong++
      setWrongAttempts(attemptRef.current.wrong)
      setHintLevel(level => Math.max(level, attemptRef.current.wrong >= 2 ? 2 : 1) as HintLevel)
      setShowWrongMove(true)
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current)
      wrongTimerRef.current = setTimeout(() => setShowWrongMove(false), 700)
    },
    onCorrect: () => setHintLevel(0),
    onComplete: () => {
      if (!current) return
      const clean = attemptRef.current.wrong === 0 && attemptRef.current.hints === 0
      const mastered = recordReviewResult(study.id, current.mistake.nodeId, clean)
      setResults(r => ({
        ...r,
        clean: r.clean + (clean ? 1 : 0),
        withErrors: r.withErrors + (clean ? 0 : 1),
        mastered: r.mastered + (mastered ? 1 : 0),
      }))
      setSolved(true)
      playSound('correct')
      onReviewed?.()
    },
  })
  const { load } = player

  const goTo = useCallback((nextIndex: number, items: ReviewItem[]) => {
    attemptRef.current = { wrong: 0, hints: 0 }
    setIndex(nextIndex)
    setSolved(false)
    setWrongAttempts(0)
    setHintLevel(0)
    setShowWrongMove(false)
    load(items[nextIndex]?.line ?? EMPTY_SOURCE)
  }, [load])

  const next = useCallback(() => goTo(index + 1, queue), [goTo, index, queue])

  const skip = useCallback(() => {
    setResults(r => ({ ...r, skipped: r.skipped + 1 }))
    goTo(index + 1, queue)
  }, [goTo, index, queue])

  const retry = useCallback(() => goTo(index, queue), [goTo, index, queue])

  /** Start a new session with the due mistakes, or with every mistake */
  const startSession = useCallback((all: boolean) => {
    const fresh = buildQueue(study, all)
    setQueue(fresh)
    setResults({ clean: 0, withErrors: 0, skipped: 0, mastered: 0 })
    goTo(0, fresh)
  }, [study, goTo])

  const showHint = useCallback(() => {
    attemptRef.current.hints++
    setHintLevel(level => Math.min(level + 1, 2) as HintLevel)
  }, [])

  const hintShapes = useMemo((): DrawShape[] => {
    if (hintLevel === 0 || !player.expectedUci) return []
    const from = player.expectedUci.slice(0, 2) as Key
    const to = player.expectedUci.slice(2, 4) as Key
    return hintLevel >= 2 ? [{ orig: from, dest: to, brush: 'green' }] : [{ orig: from, brush: 'yellow' }]
  }, [hintLevel, player.expectedUci])

  const chessgroundConfig = useMemo(
    () => buildBoardConfig(player.state, { orientation: study.color, autoShapes: hintShapes, locked: solved }),
    [player.state, study.color, hintShapes, solved]
  )

  return {
    queue,
    index,
    current,
    isComplete,
    solved,
    wrongAttempts,
    hintLevel,
    showWrongMove,
    results,
    isUserTurn: player.isUserTurn,
    makeMove: player.handleBoardMove,
    pendingPromotion: player.pendingPromotion,
    completePromotion: player.completePromotion,
    cancelPromotion: player.cancelPromotion,
    chessgroundConfig,
    next,
    skip,
    retry,
    showHint,
    startSession,
  }
}
