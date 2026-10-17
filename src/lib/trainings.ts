/**
 * Custom trainings: practice sessions that mix lines from several of the user's studies
 */
import type { OpeningStudy } from '@/types/opening'
import { extractStudyLines, generateNodeId, type StudyLine } from '@/lib/opening-utils'
import { readJson, writeJson } from '@/lib/storage'

const STORAGE_KEY = 'chessop-trainings'

export interface TrainingItem {
  studyId: string
  /** Selected line keys of the study, or null for every line */
  lineKeys: string[] | null
}

export interface CustomTraining {
  id: string
  name: string
  items: TrainingItem[]
  /** Practice lines in random order */
  shuffle: boolean
  createdAt: number
  updatedAt: number
}

/** A line ready to practice, with the study it belongs to */
export interface PracticeLine extends StudyLine {
  studyId: string
  studyName: string
  color: 'white' | 'black'
}

/** What a practice session runs on: one study or a custom training */
export interface PracticeSource {
  /** Key under which practice progress is stored */
  id: string
  lines: PracticeLine[]
  /** Show which study each line comes from */
  mixed: boolean
  shuffle?: boolean
}

export function studyPracticeLines(study: OpeningStudy): PracticeLine[] {
  return extractStudyLines(study, true).map(line => ({
    ...line,
    studyId: study.id,
    studyName: study.name,
    color: study.color,
  }))
}

export function studyPracticeSource(study: OpeningStudy): PracticeSource {
  return { id: study.id, lines: studyPracticeLines(study), mixed: false }
}

/**
 * Build the lines of a training. Lines whose study (or line) no longer exists are skipped.
 * Keys are prefixed with the study id so they stay unique across studies.
 */
export function trainingPracticeSource(training: CustomTraining, studies: OpeningStudy[]): PracticeSource {
  const lines: PracticeLine[] = []
  for (const item of training.items) {
    const study = studies.find(s => s.id === item.studyId)
    if (!study) continue
    for (const line of studyPracticeLines(study)) {
      if (item.lineKeys && !item.lineKeys.includes(line.key)) continue
      lines.push({ ...line, key: `${study.id}:${line.key}` })
    }
  }
  return { id: `training:${training.id}`, lines, mixed: true, shuffle: training.shuffle }
}

export function loadTrainings(): CustomTraining[] {
  const trainings = readJson<CustomTraining[]>(STORAGE_KEY, [])
  return Array.isArray(trainings) ? trainings : []
}

export function loadTraining(id: string): CustomTraining | null {
  return loadTrainings().find(t => t.id === id) ?? null
}

export function saveTraining(data: Omit<CustomTraining, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): CustomTraining {
  const trainings = loadTrainings()
  const now = Date.now()
  const existing = data.id ? trainings.find(t => t.id === data.id) : undefined
  const training: CustomTraining = {
    id: existing?.id ?? generateNodeId(),
    name: data.name.trim() || 'Custom training',
    items: data.items,
    shuffle: data.shuffle,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  writeJson(STORAGE_KEY, existing ? trainings.map(t => (t.id === training.id ? training : t)) : [...trainings, training])
  return training
}

export function deleteTraining(id: string): void {
  writeJson(STORAGE_KEY, loadTrainings().filter(t => t.id !== id))
}

/** Remove a deleted study from every training */
export function removeStudyFromTrainings(studyId: string): void {
  writeJson(
    STORAGE_KEY,
    loadTrainings().map(t => ({ ...t, items: t.items.filter(item => item.studyId !== studyId) }))
  )
}
