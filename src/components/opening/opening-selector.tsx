import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Dumbbell,
  Layers,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { createStudy, deleteOpeningStudy, extractStudyLines, loadOpeningStudies, parsePgn } from '@/lib/opening-utils'
import { clearMistakes, getMistakesDue } from '@/lib/mistakes-storage'
import { clearPracticeProgress, getStudyMastery, loadPracticeProgress } from '@/lib/practice-storage'
import {
  deleteTraining,
  loadTrainings,
  removeStudyFromTrainings,
  trainingPracticeSource,
  type CustomTraining,
} from '@/lib/trainings'
import { OPENING_TEMPLATES, type OpeningTemplate } from '@/data/openings/templates'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { useToast } from '@/components/ui/toast'
import { ActionButton, ColorBadge, ProgressBar } from '@/components/training/training-ui'
import { TrainingBuilder } from '@/components/trainings/training-builder'
import { cn } from '@/lib/utils'
import { CreateChoices, NewStudyDialog } from './new-study-dialog'

type StudyMode = 'study' | 'practice' | 'mistakes' | 'edit'
export type HubTab = 'mine' | 'trainings' | 'library'

interface OpeningSelectorProps {
  tab: HubTab
  onTabChange: (tab: HubTab) => void
  onOpen: (study: OpeningStudy, mode?: StudyMode) => void
  onOpenTraining: (training: CustomTraining) => void
}

interface StudySummary {
  study: OpeningStudy
  lines: number
  mastery: number
  mistakesDue: number
  lastPracticedAt: number
}

function summarize(study: OpeningStudy): StudySummary {
  const keys = extractStudyLines(study, true).map(line => line.key)
  return {
    study,
    lines: study.moves.length === 0 ? 0 : keys.length,
    mastery: getStudyMastery(study.id, keys),
    mistakesDue: getMistakesDue(study).length,
    lastPracticedAt: loadPracticeProgress(study.id).lastPracticedAt,
  }
}

function formatAgo(timestamp: number): string {
  if (!timestamp) return 'Never practiced'
  const minutes = Math.round((Date.now() - timestamp) / 60000)
  if (minutes < 1) return 'Practiced just now'
  if (minutes < 60) return `Practiced ${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Practiced ${hours} h ago`
  const days = Math.round(hours / 24)
  return `Practiced ${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Repertoire hub: the user's openings, custom trainings and the starter library
 */
export function OpeningSelector({ tab, onTabChange, onOpen, onOpenTraining }: OpeningSelectorProps) {
  const { addToast } = useToast()
  const [studies, setStudies] = useState<OpeningStudy[]>(() => loadOpeningStudies())
  const [trainings, setTrainings] = useState<CustomTraining[]>(() => loadTrainings())
  const [newDialog, setNewDialog] = useState<'choose' | 'empty' | 'pgn' | null>(null)
  const [deleteStudyId, setDeleteStudyId] = useState<string | null>(null)
  const [deleteTrainingId, setDeleteTrainingId] = useState<string | null>(null)
  const [builder, setBuilder] = useState<{ training: CustomTraining | null } | null>(null)

  const summaries = useMemo(
    () => studies.map(summarize).sort((a, b) => b.study.updatedAt - a.study.updatedAt),
    [studies]
  )
  const totalLines = summaries.reduce((sum, s) => sum + s.lines, 0)
  const totalDue = summaries.reduce((sum, s) => sum + s.mistakesDue, 0)
  const masteredLines = summaries.reduce((sum, s) => sum + Math.round(s.mastery * s.lines), 0)

  const addTemplate = (template: OpeningTemplate) => {
    try {
      const { moves } = parsePgn(template.pgn)
      const study = createStudy({ name: template.name, color: template.color, description: template.description, moves })
      addToast(`${template.name} added to your openings`, 'success')
      onOpen(study, 'study')
    } catch {
      addToast('Could not load this opening', 'error')
    }
  }

  const tabs: { id: HubTab; label: string; count?: number }[] = [
    { id: 'mine', label: 'My openings', count: studies.length },
    { id: 'trainings', label: 'Trainings', count: trainings.length },
    { id: 'library', label: 'Library', count: OPENING_TEMPLATES.length },
  ]

  return (
    <div className="w-full">
      <NewStudyDialog
        open={newDialog !== null}
        initialStep={newDialog ?? 'choose'}
        onOpenChange={open => !open && setNewDialog(null)}
        onPickLibrary={() => {
          setNewDialog(null)
          onTabChange('library')
        }}
        onCreated={(study, source) => {
          setNewDialog(null)
          onOpen(study, source === 'empty' ? 'edit' : 'study')
        }}
      />

      <TrainingBuilder
        open={builder !== null}
        onOpenChange={open => !open && setBuilder(null)}
        studies={studies}
        training={builder?.training}
        onSaved={training => {
          setBuilder(null)
          setTrainings(loadTrainings())
          addToast(`Training “${training.name}” saved`, 'success')
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteStudyId}
        title="Delete opening?"
        message={`“${studies.find(s => s.id === deleteStudyId)?.name ?? ''}” will be deleted with its practice progress and mistakes. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteStudyId) {
            deleteOpeningStudy(deleteStudyId)
            clearPracticeProgress(deleteStudyId)
            clearMistakes(deleteStudyId)
            removeStudyFromTrainings(deleteStudyId)
            setStudies(loadOpeningStudies())
            setTrainings(loadTrainings())
          }
          setDeleteStudyId(null)
        }}
        onCancel={() => setDeleteStudyId(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteTrainingId}
        title="Delete training?"
        message="The training is removed. Your openings are not affected."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTrainingId) {
            deleteTraining(deleteTrainingId)
            clearPracticeProgress(`training:${deleteTrainingId}`)
            setTrainings(loadTrainings())
          }
          setDeleteTrainingId(null)
        }}
        onCancel={() => setDeleteTrainingId(null)}
      />

      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-text-muted">Repertoire</p>
          <h1 className="font-display text-5xl md:text-6xl">Your openings</h1>
        </div>
        {studies.length > 0 && (
          <dl className="grid grid-cols-3 border border-text-primary">
            {[
              { label: 'Lines', value: totalLines },
              { label: 'Mastered', value: totalLines ? `${Math.round((masteredLines / totalLines) * 100)}%` : '0%' },
              { label: 'To review', value: totalDue },
            ].map((stat, i) => (
              <div key={stat.label} className={cn('px-4 py-2.5', i > 0 && 'border-l border-text-primary', i === 2 && totalDue > 0 && 'bg-ink text-ink-foreground')}>
                <dt className="text-[10px] font-medium uppercase tracking-wider opacity-70">{stat.label}</dt>
                <dd className="font-display text-2xl tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-6 border-b border-border-strong" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors',
              tab === t.id ? 'border-text-primary text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="font-mono text-[11px] font-normal opacity-60">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'mine' && (
        <MyOpenings
          summaries={summaries}
          onNew={() => setNewDialog('choose')}
          onImport={() => setNewDialog('pgn')}
          onBrowseLibrary={() => onTabChange('library')}
          onOpen={onOpen}
          onDelete={setDeleteStudyId}
        />
      )}

      {tab === 'trainings' && (
        <TrainingsTab
          trainings={trainings}
          studies={studies}
          onNew={() => setBuilder({ training: null })}
          onEdit={training => setBuilder({ training })}
          onDelete={setDeleteTrainingId}
          onOpen={onOpenTraining}
          onGoToOpenings={() => onTabChange('mine')}
        />
      )}

      {tab === 'library' && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OPENING_TEMPLATES.map(template => {
            const added = studies.some(s => s.name === template.name)
            return (
              <li key={template.id} className="flex flex-col border border-border-strong bg-surface-1 p-5 transition-colors hover:border-text-primary">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <ColorBadge color={template.color} className="h-9 w-9 text-lg" />
                  <span className="font-mono text-[11px] text-text-muted">{template.eco}</span>
                </div>
                <h3 className="font-display text-2xl">{template.name}</h3>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  As {template.color} · {template.level}
                </p>
                <p className="mb-5 mt-3 flex-1 text-sm leading-relaxed text-text-secondary">{template.description}</p>
                <ActionButton size="sm" tone={added ? 'neutral' : 'ink'} trailingIcon={added ? undefined : ArrowRight} icon={added ? Plus : undefined} onClick={() => addTemplate(template)}>
                  {added ? 'Add another copy' : 'Add to my openings'}
                </ActionButton>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ===== My openings =====

function MyOpenings({
  summaries,
  onNew,
  onImport,
  onBrowseLibrary,
  onOpen,
  onDelete,
}: {
  summaries: StudySummary[]
  onNew: () => void
  onImport: () => void
  onBrowseLibrary: () => void
  onOpen: (study: OpeningStudy, mode?: StudyMode) => void
  onDelete: (id: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all')

  if (summaries.length === 0) {
    return (
      <div className="max-w-2xl">
        <p className="mb-4 text-sm text-text-secondary">You don't have any openings yet. How do you want to start?</p>
        <CreateChoices onScratch={onNew} onPgn={onImport} onLibrary={onBrowseLibrary} />
      </div>
    )
  }

  const filtered = summaries.filter(({ study }) => {
    if (colorFilter !== 'all' && study.color !== colorFilter) return false
    if (searchQuery && !study.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            placeholder="Search openings…"
            aria-label="Search openings"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 w-full border border-border-strong bg-surface-1 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-text-primary focus:outline-none"
          />
        </div>
        <div className="flex border border-border-strong" role="group" aria-label="Filter by color">
          {(['all', 'white', 'black'] as const).map(value => (
            <button
              type="button"
              key={value}
              onClick={() => setColorFilter(value)}
              aria-pressed={colorFilter === value}
              className={cn(
                'flex-1 px-4 text-xs font-semibold uppercase tracking-wider transition-colors sm:flex-none',
                colorFilter === value ? 'bg-ink text-ink-foreground' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <ActionButton tone="primary" icon={Plus} onClick={onNew}>
          New opening
        </ActionButton>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border-strong py-12 text-center">
          <p className="text-sm text-text-secondary">No openings match your filters</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filtered.map(summary => (
            <StudyCard
              key={summary.study.id}
              summary={summary}
              onOpen={mode => onOpen(summary.study, mode)}
              onDelete={() => onDelete(summary.study.id)}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function StudyCard({
  summary,
  onOpen,
  onDelete,
}: {
  summary: StudySummary
  onOpen: (mode?: StudyMode) => void
  onDelete: () => void
}) {
  const { study, lines, mastery, mistakesDue, lastPracticedAt } = summary
  const masteryPercent = Math.round(mastery * 100)

  return (
    <li className="group relative flex flex-col border border-border-strong bg-surface-1 transition-colors hover:border-text-primary">
      <button
        type="button"
        onClick={() => onOpen(lines === 0 ? 'edit' : 'study')}
        className="flex flex-1 items-start gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action"
      >
        <ColorBadge color={study.color} className="h-11 w-11 text-2xl" />
        <div className="min-w-0 flex-1 pr-6">
          <h3 className="truncate font-display text-2xl">{study.name}</h3>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">
            {lines === 0 ? 'No lines yet' : `${lines} line${lines === 1 ? '' : 's'}`} · {formatAgo(lastPracticedAt)}
          </p>
          {study.description && <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{study.description}</p>}
          {lines > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar value={masteryPercent} tone="success" size="sm" label="Mastery" />
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-secondary">{masteryPercent}%</span>
            </div>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="absolute right-2 top-2 p-2 text-text-muted opacity-60 transition hover:text-accent-danger group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Delete ${study.name}`}
        title="Delete opening"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="grid auto-cols-fr grid-flow-col border-t border-border-strong">
        {lines === 0 ? (
          <QuickAction icon={Pencil} label="Add moves" onClick={() => onOpen('edit')} primary />
        ) : (
          <>
            <QuickAction icon={BookOpen} label="Study" onClick={() => onOpen('study')} />
            <QuickAction icon={Play} label="Practice" onClick={() => onOpen('practice')} primary />
            {mistakesDue > 0 && (
              <QuickAction icon={AlertTriangle} label={`Review ${mistakesDue}`} onClick={() => onOpen('mistakes')} danger />
            )}
          </>
        )}
      </div>
    </li>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  primary,
  danger,
}: {
  icon: typeof Play
  label: string
  onClick: () => void
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 border-l border-border-strong px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors first:border-l-0',
        primary
          ? 'text-action hover:bg-action hover:text-action-foreground'
          : danger
            ? 'text-accent-danger hover:bg-accent-danger/10'
            : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

// ===== Trainings =====

function TrainingsTab({
  trainings,
  studies,
  onNew,
  onEdit,
  onDelete,
  onOpen,
  onGoToOpenings,
}: {
  trainings: CustomTraining[]
  studies: OpeningStudy[]
  onNew: () => void
  onEdit: (training: CustomTraining) => void
  onDelete: (id: string) => void
  onOpen: (training: CustomTraining) => void
  onGoToOpenings: () => void
}) {
  const playableStudies = studies.filter(s => s.moves.length > 0)

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 border border-ink bg-ink p-5 text-ink-foreground sm:flex-row sm:items-center">
        <Layers className="h-8 w-8 shrink-0" />
        <div className="flex-1">
          <p className="font-display text-2xl">Custom trainings</p>
          <p className="mt-1 text-sm opacity-75">
            Mix whole openings or hand-picked lines — White and Black together — into one practice session.
          </p>
        </div>
        {playableStudies.length > 0 ? (
          <ActionButton tone="primary" icon={Plus} onClick={onNew}>
            New training
          </ActionButton>
        ) : (
          <ActionButton tone="neutral" onClick={onGoToOpenings} className="border-ink-foreground/30 bg-transparent text-ink-foreground">
            Add openings first
          </ActionButton>
        )}
      </div>

      {trainings.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">No trainings yet.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {trainings.map(training => {
            const source = trainingPracticeSource(training, studies)
            const included = training.items
              .map(item => studies.find(s => s.id === item.studyId))
              .filter((s): s is OpeningStudy => !!s)
            return (
              <li key={training.id} className="group relative flex flex-col border border-border-strong bg-surface-1 transition-colors hover:border-text-primary">
                <button type="button" onClick={() => onOpen(training)} className="flex-1 p-5 text-left">
                  <div className="mb-3 flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4 text-text-muted" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                      {source.lines.length} lines · {included.length} opening{included.length === 1 ? '' : 's'}
                      {training.shuffle && ' · shuffled'}
                    </span>
                  </div>
                  <h3 className="pr-16 font-display text-2xl">{training.name}</h3>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {included.map(study => (
                      <li key={study.id} className="flex items-center gap-1.5 border border-border-subtle px-2 py-1 text-xs text-text-secondary">
                        <span aria-hidden>{study.color === 'white' ? '♔' : '♚'}</span>
                        {study.name}
                      </li>
                    ))}
                  </ul>
                </button>
                <div className="absolute right-2 top-2 flex opacity-60 transition group-hover:opacity-100">
                  <button type="button" onClick={() => onEdit(training)} className="p-2 text-text-muted hover:text-text-primary" aria-label={`Edit ${training.name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onDelete(training.id)} className="p-2 text-text-muted hover:text-accent-danger" aria-label={`Delete ${training.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid border-t border-border-strong">
                  <QuickAction icon={Play} label="Start training" onClick={() => onOpen(training)} primary />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
