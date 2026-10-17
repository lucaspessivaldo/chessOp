import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import { STUDY_MODES, type StudyMode } from '@/components/modes/study-modes'

type OpeningsSearch = {
  studyId?: string
  mode?: StudyMode
}

export const Route = createFileRoute('/openings')({
  // The page (chess logic, board, editor) is loaded on demand to keep the landing page light
  component: lazyRouteComponent(() => import('@/components/pages/openings-page'), 'OpeningsPage'),
  validateSearch: (search: Record<string, unknown>): OpeningsSearch => {
    const result: OpeningsSearch = {}
    if (typeof search.studyId === 'string' && search.studyId) result.studyId = search.studyId
    if (typeof search.mode === 'string' && STUDY_MODES.includes(search.mode as StudyMode)) result.mode = search.mode as StudyMode
    return result
  },
})
