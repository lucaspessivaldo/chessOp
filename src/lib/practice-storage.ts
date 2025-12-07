/**
 * Practice Progress Persistence
 * Stores and retrieves practice session progress from localStorage
 */

export interface PracticeProgress {
  studyId: string
  completedLines: number[]
  skippedLines: number[]
  currentLineIndex: number
  totalAttempts: number
  wrongAttempts: number
  lastPracticedAt: number
}

const STORAGE_KEY = 'chessop-practice-progress'

/**
 * Load all practice progress from localStorage
 */
export function loadAllPracticeProgress(): Record<string, PracticeProgress> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Load practice progress for a specific study
 */
export function loadPracticeProgress(studyId: string): PracticeProgress | null {
  const all = loadAllPracticeProgress()
  return all[studyId] || null
}

/**
 * Save practice progress for a study
 */
export function savePracticeProgress(progress: PracticeProgress): void {
  const all = loadAllPracticeProgress()
  all[progress.studyId] = {
    ...progress,
    lastPracticedAt: Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

/**
 * Clear practice progress for a study
 */
export function clearPracticeProgress(studyId: string): void {
  const all = loadAllPracticeProgress()
  delete all[studyId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

/**
 * Create initial progress for a new practice session
 */
export function createInitialProgress(studyId: string): PracticeProgress {
  return {
    studyId,
    completedLines: [],
    skippedLines: [],
    currentLineIndex: 0,
    totalAttempts: 0,
    wrongAttempts: 0,
    lastPracticedAt: Date.now(),
  }
}
