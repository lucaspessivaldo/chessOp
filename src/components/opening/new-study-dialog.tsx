import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ActionButton, ColorBadge } from '@/components/training/training-ui'
import { createStudy, getTreeSummary, parsePgn } from '@/lib/opening-utils'
import { cn } from '@/lib/utils'

type Step = 'choose' | 'empty' | 'pgn'

interface NewStudyDialogProps {
  open: boolean
  initialStep?: Step
  onOpenChange: (open: boolean) => void
  /** "Start from the library" was picked */
  onPickLibrary: () => void
  onCreated: (study: OpeningStudy, source: 'empty' | 'pgn') => void
}

/**
 * The three ways to create an opening, as big choice rows
 */
export function CreateChoices({ onScratch, onPgn, onLibrary }: { onScratch: () => void; onPgn: () => void; onLibrary: () => void }) {
  const choices = [
    { title: 'Build from scratch', text: 'Play the moves on the board, helped by Stockfish and the Lichess explorer.', onClick: onScratch, icon: '♞' },
    { title: 'Import a PGN', text: 'Paste lines from a Lichess study, ChessBase or a book — variations included.', onClick: onPgn, icon: '♟' },
    { title: 'Start from the library', text: 'Pick a ready-made repertoire and adapt it to your style.', onClick: onLibrary, icon: '♚' },
  ]
  return (
    <ul className="space-y-3">
      {choices.map((choice, i) => (
        <li key={choice.title}>
          <button
            type="button"
            onClick={choice.onClick}
            className={cn(
              'group flex w-full items-center gap-5 border p-5 text-left transition-colors',
              i === 0 ? 'border-ink bg-ink text-ink-foreground' : 'border-border-strong hover:border-text-primary'
            )}
          >
            <span className="w-8 text-center text-4xl leading-none" aria-hidden>{choice.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl">{choice.title}</span>
              <span className={cn('mt-1 block text-sm', i === 0 ? 'opacity-75' : 'text-text-secondary')}>{choice.text}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Create an opening: choose how, then name it and pick a side
 */
export function NewStudyDialog(props: NewStudyDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <NewStudyForm key={props.initialStep} {...props} />}
    </Dialog>
  )
}

function NewStudyForm({ initialStep = 'choose', onCreated, onPickLibrary }: NewStudyDialogProps) {
  const [step, setStep] = useState<Step>(initialStep)
  const [name, setName] = useState('')
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Live PGN check
  let pgnInfo: { lines: number; moves: number; name: string } | null = null
  let pgnError: string | null = null
  if (step === 'pgn' && pgn.trim()) {
    try {
      const parsed = parsePgn(pgn)
      const summary = getTreeSummary(parsed.moves)
      const headerName = parsed.headers.Opening || (parsed.headers.Event && parsed.headers.Event !== '?' ? parsed.headers.Event : '')
      pgnInfo = { lines: summary.lines, moves: summary.moves, name: headerName }
    } catch (e) {
      pgnError = e instanceof Error ? e.message : 'Invalid PGN'
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (step === 'empty') {
      if (!name.trim()) {
        setError('Give your opening a name.')
        return
      }
      onCreated(createStudy({ name, color }), 'empty')
      return
    }
    try {
      const parsed = parsePgn(pgn)
      onCreated(createStudy({ name: name || pgnInfo?.name || 'Imported opening', color, moves: parsed.moves }), 'pgn')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid PGN')
    }
  }

  const inputClass =
    'w-full border border-border-strong bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-text-primary focus:outline-none'

  if (step === 'choose') {
    return (
      <DialogContent className="gap-0 border-border-subtle bg-surface-1 p-0 text-text-primary sm:max-w-xl">
        <div className="p-6 pr-12">
          <DialogTitle className="font-display text-4xl">New opening</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-text-secondary">How do you want to start?</DialogDescription>
        </div>
        <div className="px-6 pb-6">
          <CreateChoices onScratch={() => setStep('empty')} onPgn={() => setStep('pgn')} onLibrary={onPickLibrary} />
        </div>
      </DialogContent>
    )
  }

  return (
    <DialogContent className="gap-0 border-border-subtle bg-surface-1 p-0 text-text-primary sm:max-w-lg">
      <form onSubmit={submit}>
        <div className="border-b border-border-subtle p-6 pr-12">
          <button
            type="button"
            onClick={() => setStep('choose')}
            className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <DialogTitle className="font-display text-4xl">{step === 'pgn' ? 'Import a PGN' : 'Build from scratch'}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-text-secondary">
            {step === 'pgn'
              ? 'Variations, comments {…} and annotations ($1, !?) are kept.'
              : 'You will add the moves in the editor, on the board.'}
          </DialogDescription>
        </div>

        <div className="space-y-5 p-6">
          {step === 'pgn' && (
            <div>
              <label htmlFor="new-study-pgn" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">PGN</label>
              <textarea
                id="new-study-pgn"
                value={pgn}
                onChange={e => setPgn(e.target.value)}
                rows={6}
                spellCheck={false}
                autoFocus
                placeholder={'1. e4 c6 2. d4 d5 3. Nc3 (3. e5 Bf5) dxe4 *'}
                className={cn(inputClass, 'resize-y font-mono text-xs')}
              />
              <p className={cn('mt-1.5 text-xs', pgnError ? 'text-accent-danger' : 'text-text-muted')}>
                {pgnError ?? (pgnInfo ? `✓ ${pgnInfo.lines} line${pgnInfo.lines === 1 ? '' : 's'}, ${pgnInfo.moves} moves` : 'Paste a PGN to see a preview.')}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="new-study-name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Name {step === 'empty' && <span className="text-accent-danger">*</span>}
            </label>
            <input
              id="new-study-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={step === 'pgn' ? pgnInfo?.name || 'Taken from the PGN if empty' : 'e.g. My Sicilian Najdorf'}
              autoFocus={step === 'empty'}
              className={inputClass}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">I play as</span>
            <div className="grid grid-cols-2 gap-2">
              {(['white', 'black'] as const).map(side => (
                <button
                  type="button"
                  key={side}
                  onClick={() => setColor(side)}
                  aria-pressed={color === side}
                  className={cn(
                    'flex items-center justify-center gap-2.5 border py-3 text-sm font-semibold uppercase tracking-wider transition-colors',
                    color === side ? 'border-ink bg-ink text-ink-foreground' : 'border-border-strong text-text-secondary hover:border-text-primary'
                  )}
                >
                  <ColorBadge color={side} className="h-6 w-6 text-sm" />
                  {side}
                </button>
              ))}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-accent-danger">{error}</p>}
        </div>

        <div className="flex justify-end border-t border-border-subtle p-4">
          <ActionButton
            type="submit"
            tone="primary"
            trailingIcon={ArrowRight}
            disabled={step === 'pgn' ? !pgnInfo : !name.trim()}
          >
            {step === 'pgn' ? 'Import opening' : 'Create & open editor'}
          </ActionButton>
        </div>
      </form>
    </DialogContent>
  )
}
