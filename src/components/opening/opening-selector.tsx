import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  FileUp,
  Library,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { createStudy, deleteOpeningStudy, extractStudyLines, loadOpeningStudies, parsePgn } from '@/lib/opening-utils'
import { clearMistakes, getMistakesDue } from '@/lib/mistakes-storage'
import { clearPracticeProgress, getStudyMastery, loadPracticeProgress } from '@/lib/practice-storage'
import { OPENING_TEMPLATES, type OpeningTemplate } from '@/data/openings/templates'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { useToast } from '@/components/ui/toast'
import { ActionButton, ColorBadge, ProgressBar } from '@/components/training/training-ui'
import { cn } from '@/lib/utils'
import { NewStudyDialog } from './new-study-dialog'

type StudyMode = 'study' | 'practice' | 'mistakes' | 'edit'

interface OpeningSelectorProps {
  onOpen: (study: OpeningStudy, mode?: StudyMode) => void
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

export function OpeningSelector({ onOpen }: OpeningSelectorProps) {
  const { addToast } = useToast()
  const [studies, setStudies] = useState<OpeningStudy[]>(() => loadOpeningStudies())
  const [searchQuery, setSearchQuery] = useState('')
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all')
  const [newDialog, setNewDialog] = useState<'empty' | 'pgn' | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const summaries = useMemo(
    () => studies.map(summarize).sort((a, b) => b.study.updatedAt - a.study.updatedAt),
    [studies]
  )
  const filtered = summaries.filter(({ study }) => {
    if (colorFilter !== 'all' && study.color !== colorFilter) return false
    if (searchQuery && !study.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
  const totalDue = summaries.reduce((sum, s) => sum + s.mistakesDue, 0)
  const studyToDelete = studies.find(s => s.id === deleteId)
  const templatesOpen = studies.length === 0 || showTemplates

  const addTemplate = (template: OpeningTemplate) => {
    try {
      const { moves } = parsePgn(template.pgn)
      const study = createStudy({ name: template.name, color: template.color, description: template.description, moves })
      addToast(`${template.name} added to your studies`, 'success')
      onOpen(study, 'study')
    } catch {
      addToast('Could not load this template', 'error')
    }
  }

  return (
    <div className="w-full">
      <NewStudyDialog
        open={newDialog !== null}
        initialMode={newDialog ?? 'empty'}
        onOpenChange={open => !open && setNewDialog(null)}
        onCreated={(study, source) => {
          setNewDialog(null)
          onOpen(study, source === 'empty' ? 'edit' : 'study')
        }}
      />

      <ConfirmDialog
        isOpen={!!studyToDelete}
        title="Delete study?"
        message={`“${studyToDelete?.name ?? ''}” will be deleted together with its practice progress and mistakes. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteId) {
            deleteOpeningStudy(deleteId)
            clearPracticeProgress(deleteId)
            clearMistakes(deleteId)
            setStudies(loadOpeningStudies())
          }
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Your repertoire</h1>
          <p className="mt-1 text-sm text-text-secondary md:text-base">
            {studies.length === 0
              ? 'Start with a ready-made repertoire or build your own.'
              : `${studies.length} stud${studies.length === 1 ? 'y' : 'ies'}${totalDue > 0 ? ` · ${totalDue} position${totalDue === 1 ? '' : 's'} due for review` : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <ActionButton icon={FileUp} onClick={() => setNewDialog('pgn')} className="flex-1 sm:flex-none">
            Import PGN
          </ActionButton>
          <ActionButton tone="primary" icon={Plus} onClick={() => setNewDialog('empty')} className="flex-1 sm:flex-none">
            New study
          </ActionButton>
        </div>
      </div>

      {/* Studies */}
      {studies.length > 0 && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                placeholder="Search studies…"
                aria-label="Search studies"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-surface-1 py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
              />
            </div>
            <div className="flex rounded-lg border border-border-subtle bg-surface-1 p-1" role="group" aria-label="Filter by color">
              {(['all', 'white', 'black'] as const).map(value => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setColorFilter(value)}
                  aria-pressed={colorFilter === value}
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors sm:flex-none',
                    colorFilter === value ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle py-12 text-center">
              <Search className="mx-auto mb-3 h-7 w-7 text-text-muted" />
              <p className="font-medium text-text-secondary">No studies match your filters</p>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {filtered.map(summary => (
                <StudyCard
                  key={summary.study.id}
                  summary={summary}
                  onOpen={mode => onOpen(summary.study, mode)}
                  onDelete={() => setDeleteId(summary.study.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {/* Starter repertoires */}
      <section className={cn(studies.length > 0 && 'mt-10')}>
        {studies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            aria-expanded={templatesOpen}
            className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary"
          >
            <Library className="h-4 w-4" />
            Starter repertoires
            <ChevronDown className={cn('h-4 w-4 transition-transform', templatesOpen && 'rotate-180')} />
          </button>
        ) : (
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
            <Sparkles className="h-4 w-4 text-accent-warning" /> Starter repertoires
          </h2>
        )}

        {templatesOpen && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OPENING_TEMPLATES.map(template => {
              const added = studies.some(s => s.name === template.name)
              return (
                <li key={template.id} className="flex flex-col rounded-lg border border-border-subtle bg-surface-1 p-4">
                  <div className="mb-2 flex items-start gap-3">
                    <ColorBadge color={template.color} className="h-9 w-9" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary">{template.name}</h3>
                      <p className="text-xs text-text-muted">{template.eco} · as {template.color}</p>
                    </div>
                  </div>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">{template.description}</p>
                  <ActionButton size="sm" tone={added ? 'neutral' : 'primary'} icon={Plus} onClick={() => addTemplate(template)}>
                    {added ? 'Add another copy' : 'Add to my studies'}
                  </ActionButton>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
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
    <li className="group relative flex flex-col rounded-lg border border-border-subtle bg-surface-1 transition-colors hover:border-border-strong">
      <button
        type="button"
        onClick={() => onOpen('study')}
        className="flex flex-1 items-start gap-3 rounded-t-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-blue"
      >
        <ColorBadge color={study.color} className="mt-0.5 h-10 w-10" />
        <div className="min-w-0 flex-1 pr-6">
          <h3 className="truncate font-semibold text-text-primary group-hover:underline underline-offset-2">{study.name}</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {lines === 0 ? 'No lines yet' : `${lines} line${lines === 1 ? '' : 's'}`} · {formatAgo(lastPracticedAt)}
          </p>
          {study.description && <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{study.description}</p>}
          {lines > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <ProgressBar value={masteryPercent} tone="success" size="sm" label="Mastery" />
              <span className="w-24 shrink-0 text-right text-[11px] tabular-nums text-text-secondary">{masteryPercent}% mastered</span>
            </div>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="absolute right-2 top-2 rounded-lg p-2 text-text-muted opacity-60 transition hover:bg-accent-danger/15 hover:text-accent-danger group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Delete ${study.name}`}
        title="Delete study"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="flex gap-1 border-t border-border-subtle p-2">
        {lines === 0 ? (
          <QuickAction icon={Plus} label="Add moves" onClick={() => onOpen('edit')} />
        ) : (
          <>
            <QuickAction icon={BookOpen} label="Study" onClick={() => onOpen('study')} />
            <QuickAction icon={Play} label="Practice" onClick={() => onOpen('practice')} />
            {mistakesDue > 0 && (
              <QuickAction
                icon={AlertTriangle}
                label={`Review ${mistakesDue}`}
                onClick={() => onOpen('mistakes')}
                className="text-accent-danger"
              />
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
  className,
}: {
  icon: typeof Play
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
