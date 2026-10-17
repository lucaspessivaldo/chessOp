import { lazy, Suspense, useCallback, useState } from 'react'
import { AlertTriangle, BookOpen, ChevronLeft, Edit, Play, Volume2, VolumeX, Zap, type LucideIcon } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { getMistakesDue } from '@/lib/mistakes-storage'
import { updateSettings, useSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'
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

const tabs: { mode: StudyMode; label: string; icon: LucideIcon; active: string }[] = [
  { mode: 'study', label: 'Study', icon: BookOpen, active: 'border-accent-blue text-accent-blue' },
  { mode: 'practice', label: 'Practice', icon: Play, active: 'border-accent-success text-accent-success' },
  { mode: 'speed', label: 'Speed', icon: Zap, active: 'border-accent-warning text-accent-warning' },
  { mode: 'mistakes', label: 'Mistakes', icon: AlertTriangle, active: 'border-accent-danger text-accent-danger' },
  { mode: 'edit', label: 'Edit', icon: Edit, active: 'border-text-primary text-text-primary' },
]

export function StudyPage({ study, mode, onModeChange, onBack, onStudyUpdate }: StudyPageProps) {
  const { soundEnabled } = useSettings()
  const [mistakesDue, setMistakesDue] = useState(() => getMistakesDue(study).length)
  const [editorDirty, setEditorDirty] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  const refreshMistakes = useCallback(() => setMistakesDue(getMistakesDue(study).length), [study])

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

      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-0/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-2 md:px-6">
          <button
            type="button"
            onClick={() => guarded(onBack)}
            className="my-1.5 flex min-w-0 shrink items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary md:max-w-[240px]"
            aria-label="Back to all studies"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                'hidden h-4 w-4 shrink-0 items-center justify-center rounded text-[11px] sm:flex',
                study.color === 'white' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-100 ring-1 ring-border-strong'
              )}
              aria-hidden
            >
              {study.color === 'white' ? '♔' : '♚'}
            </span>
            <span className="hidden truncate sm:inline">{study.name}</span>
          </button>
          <div className="mx-1 hidden h-5 w-px bg-border-subtle sm:block" />

          <nav className="scroll-tabs flex flex-1 gap-0.5" aria-label="Training modes">
            {tabs.map(({ mode: tabMode, label, icon: Icon, active }) => (
              <button
                key={tabMode}
                type="button"
                onClick={() => goToMode(tabMode)}
                aria-current={mode === tabMode ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium transition-colors md:px-4 md:text-sm',
                  mode === tabMode ? active : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {tabMode === 'mistakes' && mistakesDue > 0 && (
                  <span className="rounded-full bg-accent-danger px-1.5 py-px text-[10px] font-bold text-white tabular-nums">
                    {mistakesDue}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
            className="shrink-0 rounded-lg p-2.5 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col">
        {mode === 'study' && (
          <StudyView study={study} onEdit={() => goToMode('edit')} onPractice={() => goToMode('practice')} />
        )}
        {mode === 'practice' && (
          <PracticeView
            study={study}
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
