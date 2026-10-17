/**
 * Practice progress persistence (per study, keyed by stable line keys)
 */
import { readJson, writeJson } from '@/lib/storage'

export interface LineStats {
  attempts: number
  /** Completions without any wrong move */
  perfect: number
  lastPracticedAt: number
  /** Whether the last completion had no wrong move */
  lastPerfect: boolean
}

export interface PracticeProgress {
  studyId: string
  /** Lines completed in the current practice round */
  completedLineKeys: string[]
  /** Lifetime stats per line */
  lineStats: Record<string, LineStats>
  lastPracticedAt: number
}

export interface SpeedRecord {
  bestTimeMs: number
  bestAccuracy: number
  runs: number
  lastRunAt: number
}

const PROGRESS_KEY = 'chessop-practice-progress'
const SPEED_KEY = 'chessop-speed-records'

function loadAll(): Record<string, PracticeProgress> {
  const data = readJson<Record<string, Partial<PracticeProgress>>>(PROGRESS_KEY, {})
  const result: Record<string, PracticeProgress> = {}
  for (const [studyId, value] of Object.entries(data ?? {})) {
    // Older versions stored line indices instead of keys; those cannot be mapped and are dropped
    result[studyId] = {
      studyId,
      completedLineKeys: Array.isArray(value.completedLineKeys) ? value.completedLineKeys : [],
      lineStats: value.lineStats ?? {},
      lastPracticedAt: value.lastPracticedAt ?? 0,
    }
  }
  return result
}

export function loadPracticeProgress(studyId: string): PracticeProgress {
  return loadAll()[studyId] ?? { studyId, completedLineKeys: [], lineStats: {}, lastPracticedAt: 0 }
}

export function savePracticeProgress(progress: PracticeProgress): void {
  const all = loadAll()
  all[progress.studyId] = progress
  writeJson(PROGRESS_KEY, all)
}

/**
 * Record the completion of a line and return the updated progress
 */
export function recordLineCompletion(studyId: string, lineKey: string, perfect: boolean): PracticeProgress {
  const progress = loadPracticeProgress(studyId)
  const now = Date.now()
  const stats = progress.lineStats[lineKey] ?? { attempts: 0, perfect: 0, lastPracticedAt: 0, lastPerfect: false }

  progress.lineStats[lineKey] = {
    attempts: stats.attempts + 1,
    perfect: stats.perfect + (perfect ? 1 : 0),
    lastPracticedAt: now,
    lastPerfect: perfect,
  }
  if (!progress.completedLineKeys.includes(lineKey)) {
    progress.completedLineKeys = [...progress.completedLineKeys, lineKey]
  }
  progress.lastPracticedAt = now
  savePracticeProgress(progress)
  return progress
}

/**
 * Start a new practice round (keeps lifetime stats)
 */
export function resetPracticeRound(studyId: string): PracticeProgress {
  const progress = { ...loadPracticeProgress(studyId), completedLineKeys: [] }
  savePracticeProgress(progress)
  return progress
}

export function clearPracticeProgress(studyId: string): void {
  const all = loadAll()
  delete all[studyId]
  writeJson(PROGRESS_KEY, all)

  const records = readJson<Record<string, SpeedRecord>>(SPEED_KEY, {})
  delete records[studyId]
  writeJson(SPEED_KEY, records)
}

/**
 * Mastery of a study in [0, 1]: share of lines whose last completion was perfect
 */
export function getStudyMastery(studyId: string, lineKeys: string[]): number {
  if (lineKeys.length === 0) return 0
  const { lineStats } = loadPracticeProgress(studyId)
  const mastered = lineKeys.filter(key => lineStats[key]?.lastPerfect).length
  return mastered / lineKeys.length
}

export function loadSpeedRecord(studyId: string): SpeedRecord | null {
  return readJson<Record<string, SpeedRecord>>(SPEED_KEY, {})[studyId] ?? null
}

/**
 * Save a speed drill run. Returns the previous record (null if first run).
 * Only runs with at least 80% accuracy can set a new best time.
 */
export function saveSpeedRun(studyId: string, timeMs: number, accuracy: number): SpeedRecord | null {
  const records = readJson<Record<string, SpeedRecord>>(SPEED_KEY, {})
  const previous = records[studyId] ?? null
  const qualifies = accuracy >= 80
  records[studyId] = {
    bestTimeMs: qualifies && (!previous || previous.bestTimeMs === 0 || timeMs < previous.bestTimeMs)
      ? timeMs
      : previous?.bestTimeMs ?? 0,
    bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
    runs: (previous?.runs ?? 0) + 1,
    lastRunAt: Date.now(),
  }
  writeJson(SPEED_KEY, records)
  return previous
}
