import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import { STUDY_MODES, type StudyMode } from '@/components/modes/study-modes'

const TABS = ['mine', 'trainings', 'library'] as const

type OpeningsSearch = {
  studyId?: string
  mode?: StudyMode
  trainingId?: string
  tab?: (typeof TABS)[number]
}

export const Route = createFileRoute('/openings')({
  // The page (chess logic, board, editor) is loaded on demand to keep the landing page light
  component: lazyRouteComponent(() => import('@/components/pages/openings-page'), 'OpeningsPage'),
  validateSearch: (search: Record<string, unknown>): OpeningsSearch => {
    const result: OpeningsSearch = {}
    if (typeof search.studyId === 'string' && search.studyId) result.studyId = search.studyId
    if (typeof search.mode === 'string' && STUDY_MODES.includes(search.mode as StudyMode)) result.mode = search.mode as StudyMode
    if (typeof search.trainingId === 'string' && search.trainingId) result.trainingId = search.trainingId
    if (typeof search.tab === 'string' && (TABS as readonly string[]).includes(search.tab)) result.tab = search.tab as OpeningsSearch['tab']
    return result
  },
})
