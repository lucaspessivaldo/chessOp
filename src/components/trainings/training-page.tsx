import { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { loadOpeningStudies } from '@/lib/opening-utils'
import { loadTraining, trainingPracticeSource, type CustomTraining } from '@/lib/trainings'
import { PracticeView } from '@/components/modes/practice-view'
import { WorkspaceHeader } from '@/components/navbar'
import { TrainingBuilder } from './training-builder'

interface TrainingPageProps {
  training: CustomTraining
  onBack: () => void
}

/**
 * Runs a custom training: practice over lines mixed from several openings
 */
export function TrainingPage({ training: initial, onBack }: TrainingPageProps) {
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

      <WorkspaceHeader
        backLabel="Trainings"
        onBack={onBack}
        title={training.name}
        subtitle={`${source.lines.length} lines · ${openingCount} opening${openingCount === 1 ? '' : 's'}`}
        actions={
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mr-1 flex h-8 items-center gap-1.5 border border-border-strong px-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors hover:border-text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        }
      >
        {/* Narrow screens hide the breadcrumb title, so show it here */}
        <div className="flex min-w-0 flex-col justify-center sm:hidden">
          <p className="truncate text-sm font-semibold leading-tight">{training.name}</p>
          <p className="truncate text-[11px] leading-tight text-text-muted">{source.lines.length} lines</p>
        </div>
      </WorkspaceHeader>

      <div className="flex flex-1 flex-col">
        <PracticeView key={training.updatedAt} source={source} onEdit={() => setEditing(true)} />
      </div>
    </div>
  )
}
