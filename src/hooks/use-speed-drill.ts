import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OpeningStudy } from '@/types/opening'
import { extractStudyLines, shuffleArray, type StudyLine } from '@/lib/opening-utils'
import { recordMistake } from '@/lib/mistakes-storage'
import { loadSpeedRecord, saveSpeedRun, type SpeedRecord } from '@/lib/practice-storage'
import { playSound } from '@/lib/sounds'
import { buildBoardConfig, useLinePlayer } from '@/hooks/use-line-player'

export interface SpeedDrillStats {
  correctMoves: number
  wrongMoves: number
  timeMs: number
  averageTimePerMove: number
  accuracy: number
}

export interface SpeedDrillResult {
  stats: SpeedDrillStats
  /** Record before this run (null on the first run) */
  previousRecord: SpeedRecord | null
  isNewBest: boolean
}

export type SpeedDrillPhase = 'ready' | 'running' | 'finished'

const EMPTY_LINE: StudyLine = { key: 'empty', nodes: [], uci: [], startFen: '', isSetup: false, label: '' }

function computeStats(correct: number, wrong: number, timeMs: number): SpeedDrillStats {
  const total = correct + wrong
  return {
    correctMoves: correct,
    wrongMoves: wrong,
    timeMs,
    averageTimePerMove: correct > 0 ? timeMs / correct : 0,
    accuracy: total > 0 ? (correct / total) * 100 : 100,
  }
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

/**
 * Speed drill: play every line back to back against the clock
 */
export function useSpeedDrill({ study }: { study: OpeningStudy }) {
  const [lines, setLines] = useState<StudyLine[]>(() => shuffleArray(extractStudyLines(study)))
  const [lineIndex, setLineIndex] = useState(0)
  const [phase, setPhase] = useState<SpeedDrillPhase>('ready')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [correctMoves, setCorrectMoves] = useState(0)
  const [wrongMoves, setWrongMoves] = useState(0)
  const [result, setResult] = useState<SpeedDrillResult | null>(null)
  const [record, setRecord] = useState<SpeedRecord | null>(() => loadSpeedRecord(study.id))
  const [flashWrong, setFlashWrong] = useState(false)

  const startTimeRef = useRef<number | null>(null)
  const countsRef = useRef({ correct: 0, wrong: 0 })
  const nextLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentLine = lines[lineIndex] ?? EMPTY_LINE

  const ensureStarted = () => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
      setPhase('running')
    }
  }

  const finish = () => {
    const timeMs = startTimeRef.current === null ? 0 : Date.now() - startTimeRef.current
    startTimeRef.current = null
    const stats = computeStats(countsRef.current.correct, countsRef.current.wrong, timeMs)
    const previousRecord = saveSpeedRun(study.id, timeMs, stats.accuracy)
    const updated = loadSpeedRecord(study.id)
    setRecord(updated)
    setElapsedMs(timeMs)
    setResult({
      stats,
      previousRecord,
      isNewBest: stats.accuracy >= 80 && (!previousRecord || !previousRecord.bestTimeMs || timeMs < previousRecord.bestTimeMs),
    })
    setPhase('finished')
    playSound('correct')
  }

  const player = useLinePlayer({
    initialLine: { uci: currentLine.uci, startFen: currentLine.startFen || study.rootFen },
    userColor: study.color,
    machineDelay: 150,
    startDelay: 250,
    onCorrect: () => {
      ensureStarted()
      countsRef.current.correct++
      setCorrectMoves(countsRef.current.correct)
    },
    onWrong: (index) => {
      ensureStarted()
      countsRef.current.wrong++
      setWrongMoves(countsRef.current.wrong)
      const node = currentLine.nodes[index]
      if (node) recordMistake(study.id, node.id, node.uci)
      setFlashWrong(true)
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(() => setFlashWrong(false), 400)
    },
    onComplete: () => {
      const next = lineIndex + 1
      if (next >= lines.length) {
        finish()
        return
      }
      nextLineTimerRef.current = setTimeout(() => {
        setLineIndex(next)
        load({ uci: lines[next].uci, startFen: lines[next].startFen })
      }, 250)
    },
  })
  const { load, stop } = player

  // Live clock
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      if (startTimeRef.current !== null) setElapsedMs(Date.now() - startTimeRef.current)
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  // Cancel pending transitions on unmount
  useEffect(() => () => {
    if (nextLineTimerRef.current) clearTimeout(nextLineTimerRef.current)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
  }, [])

  const resetDrill = useCallback(() => {
    if (nextLineTimerRef.current) clearTimeout(nextLineTimerRef.current)
    stop()
    const shuffled = shuffleArray(extractStudyLines(study))
    startTimeRef.current = null
    countsRef.current = { correct: 0, wrong: 0 }
    setLines(shuffled)
    setLineIndex(0)
    setPhase('ready')
    setElapsedMs(0)
    setCorrectMoves(0)
    setWrongMoves(0)
    setResult(null)
    setFlashWrong(false)
    load({ uci: shuffled[0]?.uci ?? [], startFen: shuffled[0]?.startFen ?? study.rootFen })
  }, [study, load, stop])

  const chessgroundConfig = useMemo(
    () => buildBoardConfig(player.state, {
      orientation: study.color,
      locked: phase === 'finished',
      animationMs: 100,
    }),
    [player.state, study.color, phase]
  )

  const lineProgress = currentLine.uci.length > 0 ? player.moveIndex / currentLine.uci.length : 0

  return {
    phase,
    elapsedMs,
    stats: computeStats(correctMoves, wrongMoves, elapsedMs),
    result,
    record,
    flashWrong,
    lineNumber: Math.min(lineIndex + 1, lines.length),
    totalLines: lines.length,
    overallProgress: lines.length > 0 ? ((lineIndex + (phase === 'finished' ? 1 : lineProgress)) / lines.length) * 100 : 0,
    makeMove: player.handleBoardMove,
    pendingPromotion: player.pendingPromotion,
    completePromotion: player.completePromotion,
    cancelPromotion: player.cancelPromotion,
    chessgroundConfig,
    resetDrill,
  }
}
