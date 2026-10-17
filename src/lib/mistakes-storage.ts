/**
 * Mistakes persistence with spaced repetition scheduling
 */
import type { OpeningStudy } from '@/types/opening'
import { findNodeById } from '@/lib/opening-utils'
import { readJson, writeJson } from '@/lib/storage'

const STORAGE_KEY = 'chessop-mistakes'

export interface MistakeRecord {
  studyId: string
  /** The node holding the move the user should have played */
  nodeId: string
  expectedUci: string
  wrongAttempts: number
  /** Timestamp of the last attempt */
  lastAttempt: number
  /** Timestamp when the mistake is due for review */
  nextReview: number
  /** Consecutive clean answers */
  streak: number
}

/** Spaced repetition intervals in hours, indexed by streak */
const INTERVALS_HOURS = [1, 4, 12, 24, 48, 96, 192, 384]

/** A mistake with this streak is considered learned and is removed */
export const MASTERED_STREAK = INTERVALS_HOURS.length

function nextReviewTime(streak: number): number {
  const hours = INTERVALS_HOURS[Math.min(streak, INTERVALS_HOURS.length - 1)]
  return Date.now() + hours * 60 * 60 * 1000
}

function loadMistakes(): MistakeRecord[] {
  const mistakes = readJson<MistakeRecord[]>(STORAGE_KEY, [])
  return Array.isArray(mistakes) ? mistakes : []
}

function saveMistakes(mistakes: MistakeRecord[]): void {
  writeJson(STORAGE_KEY, mistakes)
}

/**
 * Record a wrong move at `nodeId` (the expected move's node). It becomes due immediately.
 */
export function recordMistake(studyId: string, nodeId: string, expectedUci: string): void {
  const mistakes = loadMistakes()
  const existing = mistakes.find(m => m.studyId === studyId && m.nodeId === nodeId)
  const now = Date.now()

  if (existing) {
    existing.wrongAttempts++
    existing.lastAttempt = now
    existing.nextReview = now
    existing.streak = 0
  } else {
    mistakes.push({ studyId, nodeId, expectedUci, wrongAttempts: 1, lastAttempt: now, nextReview: now, streak: 0 })
  }

  saveMistakes(mistakes)
}

/**
 * Record the result of reviewing a mistake.
 * A clean answer grows the interval; an answer after wrong attempts resets it.
 * Returns true when the mistake was mastered (and removed).
 */
export function recordReviewResult(studyId: string, nodeId: string, clean: boolean): boolean {
  const mistakes = loadMistakes()
  const existing = mistakes.find(m => m.studyId === studyId && m.nodeId === nodeId)
  if (!existing) return false

  existing.lastAttempt = Date.now()
  if (clean) {
    existing.streak++
  } else {
    existing.streak = 0
    existing.wrongAttempts++
  }

  if (existing.streak >= MASTERED_STREAK) {
    saveMistakes(mistakes.filter(m => m !== existing))
    return true
  }

  existing.nextReview = nextReviewTime(existing.streak)
  saveMistakes(mistakes)
  return false
}

/**
 * All mistakes of a study whose node still exists in the tree
 */
export function getStudyMistakes(study: OpeningStudy): MistakeRecord[] {
  return loadMistakes().filter(m => m.studyId === study.id && findNodeById(study.moves, m.nodeId) !== null)
}

/**
 * Mistakes due for review now, most overdue first
 */
export function getMistakesDue(study: OpeningStudy): MistakeRecord[] {
  const now = Date.now()
  return getStudyMistakes(study)
    .filter(m => m.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview)
}

/**
 * Timestamp of the next scheduled review in the future, or null
 */
export function getNextReviewAt(study: OpeningStudy): number | null {
  const now = Date.now()
  const upcoming = getStudyMistakes(study).filter(m => m.nextReview > now).map(m => m.nextReview)
  return upcoming.length > 0 ? Math.min(...upcoming) : null
}

/**
 * Remove every mistake of a study
 */
export function clearMistakes(studyId: string): void {
  saveMistakes(loadMistakes().filter(m => m.studyId !== studyId))
}
