import { useMemo, useState } from 'react'
import { ChevronLeft, Pencil, Volume2, VolumeX } from 'lucide-react'
import { loadOpeningStudies } from '@/lib/opening-utils'
import { loadTraining, trainingPracticeSource, type CustomTraining } from '@/lib/trainings'
import { updateSettings, useSettings } from '@/lib/settings'
import { PracticeView } from '@/components/modes/practice-view'
import { ThemeToggle } from '@/components/theme-toggle'
import { TrainingBuilder } from './training-builder'

interface TrainingPageProps {
  training: CustomTraining
  onBack: () => void
}

/**
 * Runs a custom training: practice over lines mixed from several openings
 */
export function TrainingPage({ training: initial, onBack }: TrainingPageProps) {
  const { soundEnabled } = useSettings()
  const [training, setTraining] = useState(initial)
  const [studies] = useState(() => loadOpeningStudies())
  const [editing, setEditing] = useState(false)

  const source = useMemo(() => trainingPracticeSource(training, studies), [training, studies])
  const openingCount = new Set(source.lines.map(line => line.studyId)).size

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-0">
      <TrainingBuilder
        open={editing}
        onOpenChange={setEditing}
        studies={studies}
        training={training}
        onSaved={saved => {
          setEditing(false)
          setTraining(loadTraining(saved.id) ?? saved)
        }}
      />

      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-0/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-2 md:px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary"
            aria-label="Back to trainings"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Trainings</span>
          </button>
          <div className="mx-1 h-4 w-px bg-border-strong" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-none">{training.name}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {source.lines.length} lines · {openingCount} opening{openingCount === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 border border-border-strong px-2.5 py-1.5 text-xs font-medium hover:border-text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
            className="p-2 text-text-secondary hover:text-text-primary"
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <ThemeToggle className="hidden sm:block" />
        </div>
      </header>

      <div className="flex flex-1 flex-col">
        <PracticeView key={training.updatedAt} source={source} onEdit={() => setEditing(true)} />
      </div>
    </div>
  )
}
