import { useMemo, useState } from 'react'
import { Check, ChevronDown, Minus, Shuffle } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ActionButton, ColorBadge } from '@/components/training/training-ui'
import { extractStudyLines, fenPly, formatMoves } from '@/lib/opening-utils'
import { saveTraining, type CustomTraining, type TrainingItem } from '@/lib/trainings'
import { cn } from '@/lib/utils'

interface TrainingBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studies: OpeningStudy[]
  /** Training being edited (new one when omitted) */
  training?: CustomTraining | null
  onSaved: (training: CustomTraining) => void
}

/** Selected line keys per study id */
type Selection = Record<string, Set<string>>

/**
 * Create or edit a custom training: pick openings (whole or specific lines) to practice together
 */
export function TrainingBuilder(props: TrainingBuilderProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <TrainingBuilderForm key={props.training?.id ?? 'new'} {...props} />}
    </Dialog>
  )
}

function Checkbox({ state }: { state: 'all' | 'some' | 'none' }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center border',
        state === 'none' ? 'border-border-strong bg-surface-1' : 'border-ink bg-ink text-ink-foreground'
      )}
      aria-hidden
    >
      {state === 'all' && <Check className="h-3 w-3" strokeWidth={3} />}
      {state === 'some' && <Minus className="h-3 w-3" strokeWidth={3} />}
    </span>
  )
}

function TrainingBuilderForm({ studies, training, onSaved }: TrainingBuilderProps) {
  const playable = useMemo(
    () => studies
      .map(study => ({ study, lines: extractStudyLines(study, true) }))
      .filter(entry => entry.study.moves.length > 0),
    [studies]
  )

  const [name, setName] = useState(training?.name ?? '')
  const [shuffle, setShuffle] = useState(training?.shuffle ?? true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>(() => {
    const initial: Selection = {}
    for (const item of training?.items ?? []) {
      const entry = playable.find(e => e.study.id === item.studyId)
      if (!entry) continue
      initial[item.studyId] = new Set(item.lineKeys ?? entry.lines.map(line => line.key))
    }
    return initial
  })

  const stateOf = (studyId: string, total: number): 'all' | 'some' | 'none' => {
    const count = selection[studyId]?.size ?? 0
    return count === 0 ? 'none' : count === total ? 'all' : 'some'
  }

  const toggleStudy = (studyId: string, keys: string[]) => {
    setSelection(prev => {
      const next = { ...prev }
      if ((prev[studyId]?.size ?? 0) === keys.length) delete next[studyId]
      else next[studyId] = new Set(keys)
      return next
    })
  }

  const toggleLine = (studyId: string, key: string) => {
    setSelection(prev => {
      const lines = new Set(prev[studyId] ?? [])
      if (lines.has(key)) lines.delete(key)
      else lines.add(key)
      const next = { ...prev, [studyId]: lines }
      if (lines.size === 0) delete next[studyId]
      return next
    })
  }

  const totalLines = Object.values(selection).reduce((sum, set) => sum + set.size, 0)
  const studyCount = Object.keys(selection).length

  const save = () => {
    const items: TrainingItem[] = playable
      .filter(entry => selection[entry.study.id]?.size)
      .map(entry => {
        const keys = selection[entry.study.id]
        return { studyId: entry.study.id, lineKeys: keys.size === entry.lines.length ? null : [...keys] }
      })
    const fallbackName = playable.filter(e => selection[e.study.id]?.size).map(e => e.study.name).join(' + ')
    onSaved(saveTraining({ id: training?.id, name: name || fallbackName, items, shuffle }))
  }

  return (
    <DialogContent className="flex max-h-[90vh] flex-col gap-0 border-border-subtle bg-surface-1 p-0 text-text-primary sm:max-w-lg">
      <div className="border-b border-border-subtle p-5 pr-12">
        <DialogTitle className="font-display text-3xl">{training ? 'Edit training' : 'New training'}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-text-secondary">
          Mix openings — or just the lines you want — into one practice session.
        </DialogDescription>
      </div>

      <div className="space-y-4 border-b border-border-subtle p-5">
        <div>
          <label htmlFor="training-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Name
          </label>
          <input
            id="training-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Tournament prep, Black repertoire…"
            className="w-full border border-border-strong bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-ink focus:outline-none"
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shuffle}
          onClick={() => setShuffle(!shuffle)}
          className="flex w-full items-center gap-3 text-left text-sm"
        >
          <Shuffle className="h-4 w-4 text-text-muted" />
          <span className="flex-1">Shuffle lines from all openings</span>
          <span className={cn('relative h-5 w-9 transition-colors', shuffle ? 'bg-action' : 'bg-surface-3')}>
            <span className={cn('absolute top-0.5 h-4 w-4 bg-surface-1 transition-all', shuffle ? 'left-[18px]' : 'left-0.5')} />
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 sidebar-scroll">
        {playable.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">Add moves to at least one opening to build a training.</p>
        ) : (
          <ul>
            {playable.map(({ study, lines }) => {
              const keys = lines.map(line => line.key)
              const state = stateOf(study.id, keys.length)
              const isOpen = expanded === study.id
              return (
                <li key={study.id} className="border-b border-border-subtle last:border-b-0">
                  <div className="flex items-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={state === 'all' ? true : state === 'some' ? 'mixed' : false}
                      onClick={() => toggleStudy(study.id, keys)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left hover:bg-surface-2"
                    >
                      <Checkbox state={state} />
                      <ColorBadge color={study.color} className="h-7 w-7 text-sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{study.name}</span>
                        <span className="text-xs text-text-muted">
                          {state === 'some' ? `${selection[study.id]?.size} of ${keys.length} lines` : `${keys.length} line${keys.length === 1 ? '' : 's'}`}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : study.id)}
                      aria-expanded={isOpen}
                      className="mr-1 flex items-center gap-1 px-2 py-2 text-xs text-text-secondary hover:text-text-primary"
                    >
                      Lines <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                  </div>
                  {isOpen && (
                    <ul className="mb-2 ml-10 border-l border-border-subtle">
                      {lines.map(line => {
                        const checked = selection[study.id]?.has(line.key) ?? false
                        return (
                          <li key={line.key}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => toggleLine(study.id, line.key)}
                              className="flex w-full items-start gap-2.5 px-3 py-1.5 text-left hover:bg-surface-2"
                            >
                              <span className="mt-0.5"><Checkbox state={checked ? 'all' : 'none'} /></span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm">{line.label}</span>
                                <span className="block truncate font-mono text-[11px] text-text-muted">
                                  {formatMoves(line.nodes, fenPly(line.startFen), 8)}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border-subtle p-4">
        <span className="flex-1 text-xs text-text-secondary">
          {totalLines === 0 ? 'Select at least one opening' : `${totalLines} line${totalLines === 1 ? '' : 's'} from ${studyCount} opening${studyCount === 1 ? '' : 's'}`}
        </span>
        <ActionButton tone="primary" onClick={save} disabled={totalLines === 0}>
          {training ? 'Save training' : 'Create training'}
        </ActionButton>
      </div>
    </DialogContent>
  )
}
