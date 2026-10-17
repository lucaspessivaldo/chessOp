import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { SearchX } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { loadOpeningStudyById } from '@/lib/opening-utils'
import { Navbar } from '@/components/navbar'
import { OpeningSelector, type HubTab } from '@/components/opening/opening-selector'
import { TrainingPage } from '@/components/trainings/training-page'
import { loadTraining } from '@/lib/trainings'
import { StudyPage } from '@/components/modes/study-page'
import type { StudyMode } from '@/components/modes/study-modes'
import { ActionButton } from '@/components/training/training-ui'

const route = getRouteApi('/openings')

export function OpeningsPage() {
  const { studyId, mode, trainingId, tab } = route.useSearch()
  // Keyed remounts keep each page's state in sync with the URL
  if (trainingId) return <TrainingRoute key={trainingId} trainingId={trainingId} />
  if (studyId) return <StudyRoute key={studyId} studyId={studyId} mode={mode ?? 'study'} />
  return <SelectorRoute tab={tab ?? 'mine'} />
}

function SelectorRoute({ tab }: { tab: HubTab }) {
  const navigate = useNavigate({ from: '/openings' })

  const openStudy = useCallback((study: OpeningStudy, studyMode: StudyMode = 'study') => {
    navigate({ search: { studyId: study.id, mode: studyMode } })
  }, [navigate])

  return (
    <div className="min-h-full bg-surface-0 px-4 pb-16 pt-20 md:px-6 md:pt-28">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        <OpeningSelector
          tab={tab}
          onTabChange={next => navigate({ search: next === 'mine' ? {} : { tab: next }, replace: true })}
          onOpen={openStudy}
          onOpenTraining={training => navigate({ search: { trainingId: training.id } })}
        />
      </div>
    </div>
  )
}

function TrainingRoute({ trainingId }: { trainingId: string }) {
  const navigate = useNavigate({ from: '/openings' })
  const [training] = useState(() => loadTraining(trainingId))
  const back = () => navigate({ search: { tab: 'trainings' } })

  if (!training) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 pt-24">
        <Navbar />
        <div className="max-w-sm text-center">
          <SearchX className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <h1 className="mb-6 font-display text-3xl">Training not found</h1>
          <ActionButton tone="ink" onClick={back}>Back to trainings</ActionButton>
        </div>
      </div>
    )
  }
  return <TrainingPage training={training} onBack={back} />
}

function StudyRoute({ studyId, mode }: { studyId: string; mode: StudyMode }) {
  const navigate = useNavigate({ from: '/openings' })
  const [study, setStudy] = useState<OpeningStudy | null>(() => loadOpeningStudyById(studyId))

  const back = useCallback(() => navigate({ search: {} }), [navigate])

  if (!study) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 pt-24">
        <Navbar />
        <div className="max-w-sm text-center">
          <SearchX className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <h1 className="mb-2 font-display text-3xl">Opening not found</h1>
          <p className="mb-6 text-sm text-text-secondary">
            It may have been deleted, or it was created in another browser — studies are stored locally.
          </p>
          <ActionButton tone="ink" onClick={back}>Back to openings</ActionButton>
        </div>
      </div>
    )
  }

  return (
    <StudyPage
      study={study}
      mode={mode}
      onBack={back}
      onModeChange={next => navigate({ search: { studyId, mode: next } })}
      onStudyUpdate={updated => {
        setStudy(updated)
        navigate({ search: { studyId, mode: 'study' } })
      }}
    />
  )
}
