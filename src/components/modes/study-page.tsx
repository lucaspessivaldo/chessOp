import { lazy, Suspense, useCallback, useState } from 'react'
import { AlertTriangle, BookOpen, ChevronLeft, Edit, Play, Volume2, VolumeX, Zap, type LucideIcon } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { getMistakesDue } from '@/lib/mistakes-storage'
import { updateSettings, useSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
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

const tabs: { mode: StudyMode; label: string; icon: LucideIcon }[] = [
  { mode: 'study', label: 'Study', icon: BookOpen },
  { mode: 'practice', label: 'Practice', icon: Play },
  { mode: 'speed', label: 'Speed', icon: Zap },
  { mode: 'mistakes', label: 'Mistakes', icon: AlertTriangle },
  { mode: 'edit', label: 'Edit', icon: Edit },
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

      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-0/85 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-2 md:px-6">
          <button
            type="button"
            onClick={() => guarded(onBack)}
            className="flex min-w-0 shrink items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2 md:max-w-[260px]"
            aria-label="Back to all studies"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 text-text-muted" />
            <ColorBadge color={study.color} className="hidden h-5 w-5 text-xs sm:flex" />
            <span className="hidden truncate sm:inline">{study.name}</span>
          </button>
          <div className="mx-2 hidden h-4 w-px bg-border-strong sm:block" />

          <nav className="scroll-tabs flex h-full flex-1 gap-1" aria-label="Training modes">
            {tabs.map(({ mode: tabMode, label, icon: Icon }) => (
              <button
                key={tabMode}
                type="button"
                onClick={() => goToMode(tabMode)}
                aria-current={mode === tabMode ? 'page' : undefined}
                className={cn(
                  '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] transition-colors md:px-3',
                  mode === tabMode
                    ? 'border-text-primary font-medium text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {tabMode === 'mistakes' && mistakesDue > 0 && (
                  <span className="min-w-4 rounded-full bg-accent-danger/12 px-1.5 text-center text-[10px] font-semibold leading-4 text-accent-danger tabular-nums">
                    {mistakesDue}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
            className="shrink-0 rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <ThemeToggle className="hidden shrink-0 sm:block" />
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
