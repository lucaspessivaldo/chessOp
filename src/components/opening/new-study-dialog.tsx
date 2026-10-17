import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ActionButton, ColorBadge } from '@/components/training/training-ui'
import { createStudy, parsePgn } from '@/lib/opening-utils'
import { cn } from '@/lib/utils'

interface NewStudyDialogProps {
  open: boolean
  /** Start on the PGN import tab */
  initialMode?: 'empty' | 'pgn'
  onOpenChange: (open: boolean) => void
  onCreated: (study: OpeningStudy, source: 'empty' | 'pgn') => void
}

/**
 * Create a study from scratch or from a PGN
 */
export function NewStudyDialog(props: NewStudyDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <NewStudyForm key={props.initialMode} {...props} />}
    </Dialog>
  )
}

function NewStudyForm({ initialMode = 'empty', onCreated }: NewStudyDialogProps) {
  const [mode, setMode] = useState<'empty' | 'pgn'>(initialMode)
  const [name, setName] = useState('')
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'empty') {
      if (!name.trim()) {
        setError('Give your study a name.')
        return
      }
      onCreated(createStudy({ name, color }), 'empty')
      return
    }

    try {
      const parsed = parsePgn(pgn)
      const fallbackName = parsed.headers.Opening || (parsed.headers.Event && parsed.headers.Event !== '?' ? parsed.headers.Event : '')
      onCreated(createStudy({ name: name || fallbackName || 'Imported repertoire', color, moves: parsed.moves }), 'pgn')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid PGN')
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none'

  return (
    <DialogContent className="gap-0 border-border-subtle bg-surface-1 p-0 text-text-primary sm:max-w-md">
      <form onSubmit={submit}>
        <div className="border-b border-border-subtle p-5 pr-12">
          <DialogTitle className="text-lg">New opening study</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-text-secondary">
            Build it move by move in the editor, or paste a PGN with your lines.
          </DialogDescription>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1" role="tablist">
            {([['empty', Plus, 'Start empty'], ['pgn', FileText, 'From PGN']] as const).map(([id, Icon, label]) => (
              <button
                type="button"
                role="tab"
                key={id}
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id)
                  setError(null)
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
                  mode === id ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="new-study-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Name {mode === 'empty' && <span className="text-accent-danger">*</span>}
            </label>
            <input
              id="new-study-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={mode === 'pgn' ? 'Taken from the PGN if empty' : 'e.g. My Sicilian Najdorf'}
              autoFocus
              className={inputClass}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">I play as</span>
            <div className="flex gap-2">
              {(['white', 'black'] as const).map(side => (
                <button
                  type="button"
                  key={side}
                  onClick={() => setColor(side)}
                  aria-pressed={color === side}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors',
                    color === side
                      ? 'border-text-primary bg-surface-2 text-text-primary'
                      : 'border-border-subtle bg-surface-2 text-text-secondary hover:text-text-primary'
                  )}
                >
                  <ColorBadge color={side} className="h-5 w-5 text-xs" />
                  {side}
                </button>
              ))}
            </div>
          </div>

          {mode === 'pgn' && (
            <div>
              <label htmlFor="new-study-pgn" className="mb-1.5 block text-sm font-medium text-text-secondary">PGN</label>
              <textarea
                id="new-study-pgn"
                value={pgn}
                onChange={e => setPgn(e.target.value)}
                rows={6}
                spellCheck={false}
                placeholder={'1. e4 c6 2. d4 d5 3. Nc3 (3. e5 Bf5) dxe4 *'}
                className={cn(inputClass, 'resize-y font-mono text-xs')}
              />
              <p className="mt-1 text-[11px] text-text-muted">Variations, comments {'{…}'} and annotations ($1, !?) are kept. Export from Lichess studies or ChessBase works.</p>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-accent-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border-subtle p-4">
          <ActionButton type="submit" tone="primary" disabled={mode === 'pgn' ? !pgn.trim() : !name.trim()}>
            {mode === 'pgn' ? 'Import study' : 'Create & open editor'}
          </ActionButton>
        </div>
      </form>
    </DialogContent>
  )
}
