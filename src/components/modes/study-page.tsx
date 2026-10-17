import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Edit, Play, Zap, type LucideIcon } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { getMistakesDue } from '@/lib/mistakes-storage'
import { studyPracticeSource } from '@/lib/trainings'
import { WorkspaceHeader, WorkspaceTabs } from '@/components/navbar'
import { ColorBadge } from '@/components/training/training-ui'
import type { StudyMode } from './study-modes'
import { StudyView } from './study-view'
import { PracticeView } from './practice-view'
import { SpeedDrillView } from './speed-drill-view'
import { MistakesReviewView } from './mistakes-view'

const OpeningEditor = lazy(() => import('@/components/opening/opening-editor').then(m => ({ default: m.OpeningEditor })))

interface StudyPageProps {
  study: OpeningStudy
  mode: StudyMode
  onModeChange: (mode: StudyMode) => void
  onBack: () => void
  onStudyUpdate: (study: OpeningStudy) => void
}

const tabs: { id: StudyMode; label: string; icon: LucideIcon }[] = [
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'practice', label: 'Practice', icon: Play },
  { id: 'speed', label: 'Speed', icon: Zap },
  { id: 'mistakes', label: 'Mistakes', icon: AlertTriangle },
  { id: 'edit', label: 'Edit', icon: Edit },
]

export function StudyPage({ study, mode, onModeChange, onBack, onStudyUpdate }: StudyPageProps) {
  const [mistakesDue, setMistakesDue] = useState(() => getMistakesDue(study).length)
  const [editorDirty, setEditorDirty] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  const refreshMistakes = useCallback(() => setMistakesDue(getMistakesDue(study).length), [study])
  const practiceSource = useMemo(() => studyPracticeSource(study), [study])

  // Leaving the editor with unsaved changes asks for confirmation
  const guarded = (action: () => void) => {
    if (mode === 'edit' && editorDirty) {
      setPendingNavigation(() => action)
    } else {
      action()
    }
  }

  const goToMode = (next: StudyMode) => {
    if (next === mode) return
    guarded(() => {
      setEditorDirty(false)
      refreshMistakes()
      onModeChange(next)
    })
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-0">
      <ConfirmDialog
        isOpen={pendingNavigation !== null}
        title="Discard unsaved changes?"
        message="You have edits that haven't been saved. Leaving the editor will discard them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={() => {
          const action = pendingNavigation
          setPendingNavigation(null)
          action?.()
        }}
        onCancel={() => setPendingNavigation(null)}
      />

      <WorkspaceHeader
        backLabel="Openings"
        onBack={() => guarded(onBack)}
        title={study.name}
        titleIcon={<ColorBadge color={study.color} className="h-6 w-6 shrink-0 text-xs" />}
        subtitle={`Playing ${study.color}`}
      >
        <WorkspaceTabs
          label="Training modes"
          tabs={tabs.map(tab => ({ ...tab, badge: tab.id === 'mistakes' ? mistakesDue : undefined }))}
          active={mode}
          onChange={goToMode}
        />
      </WorkspaceHeader>

      <div className="flex flex-1 flex-col">
        {mode === 'study' && (
          <StudyView study={study} onEdit={() => goToMode('edit')} onPractice={() => goToMode('practice')} />
        )}
        {mode === 'practice' && (
          <PracticeView
            source={practiceSource}
            onMistakeMade={refreshMistakes}
            onEdit={() => goToMode('edit')}
            onReviewMistakes={() => goToMode('mistakes')}
          />
        )}
        {mode === 'speed' && <SpeedDrillView study={study} onEdit={() => goToMode('edit')} />}
        {mode === 'mistakes' && (
          <MistakesReviewView study={study} onChanged={refreshMistakes} onPractice={() => goToMode('practice')} />
        )}
        {mode === 'edit' && (
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-text-muted">Loading editor…</div>}>
          <OpeningEditor
            initialStudy={study}
            onDirtyChange={setEditorDirty}
            onSave={updated => {
              setEditorDirty(false)
              onStudyUpdate(updated)
            }}
            onCancel={() => goToMode('study')}
          />
          </Suspense>
        )}
      </div>
    </div>
  )
}
