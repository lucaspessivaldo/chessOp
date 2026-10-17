import { useCallback, useMemo, useRef, useState } from 'react'
import type { Key } from '@lichess-org/chessground/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { HintLevel } from '@/types/chess'
import { INITIAL_FEN, shuffleArray } from '@/lib/opening-utils'
import type { PracticeLine, PracticeSource } from '@/lib/trainings'
import { loadPracticeProgress, recordLineCompletion, resetPracticeRound, type PracticeProgress } from '@/lib/practice-storage'
import { recordMistake } from '@/lib/mistakes-storage'
import { playSound } from '@/lib/sounds'
import { buildBoardConfig, useLinePlayer } from '@/hooks/use-line-player'

export type PracticeStatus = 'playing' | 'line-complete' | 'round-complete'

const EMPTY_LINE: PracticeLine = {
  key: 'empty', nodes: [], uci: [], startFen: INITIAL_FEN, isSetup: false, label: '',
  studyId: '', studyName: '', color: 'white',
}

function pickFirstLine(order: string[], completed: string[]): string | undefined {
  return order.find(key => !completed.includes(key)) ?? order[0]
}

/**
 * Practice mode: play your lines from memory. Wrong moves are recorded for spaced repetition.
 * Works on a single study or on a custom training mixing several studies (each line keeps its side).
 */
export function useOpeningPractice({ source, onMistake }: { source: PracticeSource; onMistake?: () => void }) {
  const allLines = source.lines
  const lineByKey = useMemo(() => new Map(allLines.map(line => [line.key, line])), [allLines])

  const [progress, setProgress] = useState<PracticeProgress>(() => {
    const saved = loadPracticeProgress(source.id)
    // A finished round starts over when practice is opened again (lifetime stats are kept)
    const finished = allLines.length > 0 && allLines.every(line => saved.completedLineKeys.includes(line.key))
    return finished ? resetPracticeRound(source.id) : saved
  })
  const [randomOrder, setRandomOrderState] = useState(!!source.shuffle)
  const [selectedKeys, setSelectedKeys] = useState<string[] | null>(null)
  const [order, setOrder] = useState<string[]>(() => {
    const keys = allLines.map(line => line.key)
    return source.shuffle ? shuffleArray(keys) : keys
  })
  const [currentKey, setCurrentKey] = useState<string | undefined>(() => pickFirstLine(order, progress.completedLineKeys))

  // Per-attempt state
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [hintLevel, setHintLevel] = useState<HintLevel>(0)
  const [showWrongMove, setShowWrongMove] = useState(false)
  const [lineDone, setLineDone] = useState(false)
  const attemptRef = useRef({ wrong: 0, hints: 0 })
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentLine = (currentKey && lineByKey.get(currentKey)) || EMPTY_LINE
  const activeKeys = order
  const completedInRound = activeKeys.filter(key => progress.completedLineKeys.includes(key))
  const roundComplete = activeKeys.length > 0 && completedInRound.length === activeKeys.length

  const player = useLinePlayer({
    initialLine: { uci: currentLine.uci, startFen: currentLine.startFen, userColor: currentLine.color },
    userColor: currentLine.color,
    onWrong: (index) => {
      const node = currentLine.nodes[index]
      if (node) recordMistake(currentLine.studyId, node.id, node.uci)
      onMistake?.()

      attemptRef.current.wrong++
      setWrongAttempts(attemptRef.current.wrong)
      // Progressive hints: first mistake shows the piece, the next one the full move
      setHintLevel(level => (Math.max(level, attemptRef.current.wrong >= 2 ? 2 : 1) as HintLevel))
      setShowWrongMove(true)
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current)
      wrongTimerRef.current = setTimeout(() => setShowWrongMove(false), 700)
    },
    onCorrect: () => setHintLevel(0),
    onComplete: () => {
      const perfect = attemptRef.current.wrong === 0 && attemptRef.current.hints === 0
      setProgress(recordLineCompletion(source.id, currentLine.key, perfect))
      setLineDone(true)
      playSound('correct')
    },
  })
  const { load } = player

  const startLine = useCallback((key: string | undefined) => {
    const line = key ? lineByKey.get(key) : undefined
    setCurrentKey(key)
    attemptRef.current = { wrong: 0, hints: 0 }
    setWrongAttempts(0)
    setHintLevel(0)
    setShowWrongMove(false)
    setLineDone(false)
    load({ uci: line?.uci ?? [], startFen: line?.startFen ?? INITIAL_FEN, userColor: line?.color })
  }, [lineByKey, load])

  const buildOrder = useCallback((keys: string[] | null, random: boolean) => {
    const base = allLines.map(line => line.key).filter(key => !keys || keys.includes(key))
    return random ? shuffleArray(base) : base
  }, [allLines])

  /** Restart the round with a new line order / selection */
  const applyOrder = useCallback((keys: string[] | null, random: boolean) => {
    const newOrder = buildOrder(keys, random)
    setOrder(newOrder)
    startLine(pickFirstLine(newOrder, progress.completedLineKeys))
  }, [buildOrder, startLine, progress.completedLineKeys])

  const setRandomOrder = useCallback((random: boolean) => {
    setRandomOrderState(random)
    applyOrder(selectedKeys, random)
  }, [applyOrder, selectedKeys])

  const selectLines = useCallback((keys: string[] | null) => {
    const normalized = keys && keys.length < allLines.length ? keys : null
    setSelectedKeys(normalized)
    applyOrder(normalized, randomOrder)
  }, [allLines.length, applyOrder, randomOrder])

  const nextLine = useCallback(() => {
    const start = order.indexOf(currentKey ?? '')
    const rotated = [...order.slice(start + 1), ...order.slice(0, start + 1)]
    const next = rotated.find(key => !progress.completedLineKeys.includes(key))
    if (next) startLine(next)
  }, [order, currentKey, progress.completedLineKeys, startLine])

  const retryLine = useCallback(() => startLine(currentKey), [startLine, currentKey])

  const resetRound = useCallback(() => {
    const fresh = resetPracticeRound(source.id)
    setProgress(fresh)
    const newOrder = buildOrder(selectedKeys, randomOrder)
    setOrder(newOrder)
    startLine(newOrder[0])
  }, [source.id, buildOrder, selectedKeys, randomOrder, startLine])

  const increaseHint = useCallback(() => {
    if (!player.isUserTurn) return
    attemptRef.current.hints++
    setHintLevel(level => Math.min(level + 1, 2) as HintLevel)
  }, [player.isUserTurn])

  const hintShapes = useMemo((): DrawShape[] => {
    if (hintLevel === 0 || !player.expectedUci) return []
    const from = player.expectedUci.slice(0, 2) as Key
    const to = player.expectedUci.slice(2, 4) as Key
    return hintLevel >= 2 ? [{ orig: from, dest: to, brush: 'green' }] : [{ orig: from, brush: 'yellow' }]
  }, [hintLevel, player.expectedUci])

  const chessgroundConfig = useMemo(
    () => buildBoardConfig(player.state, { orientation: currentLine.color, autoShapes: hintShapes }),
    [player.state, currentLine.color, hintShapes]
  )

  const status: PracticeStatus = lineDone ? (roundComplete ? 'round-complete' : 'line-complete') : 'playing'
  const orderedLines = order.map(key => lineByKey.get(key)).filter((line): line is PracticeLine => !!line)

  return {
    status,
    allLines,
    orderedLines,
    currentLine,
    currentLineNumber: order.indexOf(currentKey ?? '') + 1,
    moveIndex: player.moveIndex,
    isUserTurn: player.isUserTurn,
    progress,
    completedCount: completedInRound.length,
    totalCount: activeKeys.length,
    isSelectionActive: selectedKeys !== null,
    selectedKeys,
    randomOrder,
    wrongAttempts,
    hintLevel,
    showWrongMove,
    userColor: currentLine.color,
    mixed: source.mixed,
    makeMove: player.handleBoardMove,
    pendingPromotion: player.pendingPromotion,
    completePromotion: player.completePromotion,
    cancelPromotion: player.cancelPromotion,
    chessgroundConfig,
    startLine,
    nextLine,
    retryLine,
    resetRound,
    increaseHint,
    setRandomOrder,
    selectLines,
  }
}
