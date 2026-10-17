import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { SearchX } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { loadOpeningStudyById } from '@/lib/opening-utils'
import { Navbar } from '@/components/navbar'
import { OpeningSelector } from '@/components/opening/opening-selector'
import { StudyPage } from '@/components/modes/study-page'
import type { StudyMode } from '@/components/modes/study-modes'
import { ActionButton } from '@/components/training/training-ui'

const route = getRouteApi('/openings')

export function OpeningsPage() {
  const { studyId, mode } = route.useSearch()
  // Re-load the study whenever the id changes (keyed remount keeps state in sync with the URL)
  return studyId ? <StudyRoute key={studyId} studyId={studyId} mode={mode ?? 'study'} /> : <SelectorRoute />
}

function SelectorRoute() {
  const navigate = useNavigate({ from: '/openings' })

  const openStudy = useCallback((study: OpeningStudy, studyMode: StudyMode = 'study') => {
    navigate({ search: { studyId: study.id, mode: studyMode } })
  }, [navigate])

  return (
    <div className="min-h-full bg-surface-0 px-3 pb-10 pt-[4.5rem] md:px-6 md:pt-24">
      <Navbar />
      <div className="mx-auto max-w-4xl">
        <OpeningSelector onOpen={openStudy} />
      </div>
    </div>
  )
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
          <h1 className="mb-2 text-xl font-semibold text-text-primary">Study not found</h1>
          <p className="mb-6 text-sm text-text-secondary">
            It may have been deleted, or it was created in another browser — studies are stored locally.
          </p>
          <ActionButton tone="primary" onClick={back}>Back to studies</ActionButton>
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
