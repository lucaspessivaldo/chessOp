export const STUDY_MODES = ['study', 'practice', 'speed', 'mistakes', 'edit'] as const

export type StudyMode = (typeof STUDY_MODES)[number]
