import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Download, KeyRound, Trash2, Upload } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Chessground } from '@/components/chessground'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { useToast } from '@/components/ui/toast'
import { ActionButton, Switch } from '@/components/training/training-ui'
import { BOARD_THEMES } from '@/lib/board-themes'
import { updateSettings, useSettings, type Settings } from '@/lib/settings'
import { clearAllData, downloadBackup, parseBackup, restoreBackup, type Backup } from '@/lib/backup'
import { extractStudyLines, loadOpeningStudies } from '@/lib/opening-utils'
import { getMistakesDue } from '@/lib/mistakes-storage'
import { getStudyMastery } from '@/lib/practice-storage'
import { loadTrainings } from '@/lib/trainings'
import { cn } from '@/lib/utils'

// Italian Game after 3.Bc4, to preview the board theme
const PREVIEW_CONFIG = {
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
  orientation: 'white' as const,
  viewOnly: true,
  lastMove: ['f1', 'c4'] as ['f1', 'c4'],
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-border-strong py-10 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        {description && <p className="mt-2 text-sm text-text-secondary">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex border border-border-strong" role="radiogroup">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
            value === option.value ? 'bg-ink text-ink-foreground' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * User area: profile, board & appearance preferences, engine, Lichess and data
 */
export function SettingsPage() {
  const settings = useSettings()
  const { addToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingRestore, setPendingRestore] = useState<Backup | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [tokenDraft, setTokenDraft] = useState('')

  const stats = useMemo(() => {
    const studies = loadOpeningStudies()
    let lines = 0
    let mastered = 0
    let due = 0
    for (const study of studies) {
      const keys = study.moves.length ? extractStudyLines(study, true).map(l => l.key) : []
      lines += keys.length
      mastered += Math.round(getStudyMastery(study.id, keys) * keys.length)
      due += getMistakesDue(study).length
    }
    return { openings: studies.length, lines, mastered, due, trainings: loadTrainings().length }
  }, [])

  const set = (patch: Partial<Settings>) => updateSettings(patch)

  return (
    <div className="min-h-full bg-surface-0 px-4 pb-20 pt-20 md:px-6 md:pt-28">
      <Navbar />

      <ConfirmDialog
        isOpen={pendingRestore !== null}
        title="Replace your data?"
        message="Everything stored in this browser will be replaced by the backup. This cannot be undone."
        confirmLabel="Restore backup"
        variant="danger"
        onConfirm={() => {
          if (pendingRestore) {
            restoreBackup(pendingRestore)
            location.reload()
          }
        }}
        onCancel={() => setPendingRestore(null)}
      />
      <ConfirmDialog
        isOpen={confirmWipe}
        title="Delete all data?"
        message="All openings, trainings, progress, mistakes and preferences in this browser will be deleted. Export a backup first if you want to keep them."
        confirmLabel="Delete everything"
        variant="danger"
        onConfirm={() => {
          clearAllData()
          location.reload()
        }}
        onCancel={() => setConfirmWipe(false)}
      />

      <div className="mx-auto max-w-5xl">
        {/* Profile header */}
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-text-muted">Your area</p>
        <input
          value={settings.displayName}
          onChange={e => set({ displayName: e.target.value })}
          placeholder="Your name"
          aria-label="Display name"
          maxLength={40}
          className="w-full bg-transparent font-display text-5xl uppercase placeholder-text-muted/60 focus:outline-none md:text-7xl"
        />

        <dl className="mt-8 grid grid-cols-2 border border-text-primary sm:grid-cols-5">
          {[
            { label: 'Openings', value: stats.openings },
            { label: 'Lines', value: stats.lines },
            { label: 'Mastered', value: stats.lines ? `${Math.round((stats.mastered / stats.lines) * 100)}%` : '0%' },
            { label: 'To review', value: stats.due },
            { label: 'Trainings', value: stats.trainings },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'px-4 py-3',
                i > 0 && 'border-text-primary sm:border-l',
                i % 2 === 1 && 'border-l',
                i >= 2 && 'border-t sm:border-t-0'
              )}
            >
              <dt className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{stat.label}</dt>
              <dd className="font-display text-3xl tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12">
          {/* Board */}
          <Section title="Board" description="Pick the colors you train best with. Applies to every board in the app.">
            <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
              <div>
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
                  {BOARD_THEMES.map(theme => {
                    const active = settings.boardTheme === theme.id
                    return (
                      <li key={theme.id}>
                        <button
                          type="button"
                          onClick={() => set({ boardTheme: theme.id })}
                          aria-pressed={active}
                          className={cn('group w-full border-2 p-1 text-left transition-colors', active ? 'border-action' : 'border-transparent hover:border-border-strong')}
                        >
                          <span
                            className="relative block aspect-square w-full"
                            style={{
                              backgroundImage: `repeating-conic-gradient(${theme.dark} 0 25%, ${theme.light} 0 50%)`,
                              backgroundSize: '50% 50%',
                            }}
                          >
                            {active && (
                              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-action text-action-foreground">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </span>
                            )}
                          </span>
                          <span className="mt-1.5 block text-center text-[11px] font-semibold uppercase tracking-wider">{theme.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
                  <Switch
                    checked={settings.showCoordinates}
                    onChange={showCoordinates => set({ showCoordinates })}
                    label="Coordinates"
                    description="Show files and ranks on the board edges"
                  />
                  <Switch
                    checked={settings.showLegalMoves}
                    onChange={showLegalMoves => set({ showLegalMoves })}
                    label="Legal move dots"
                    description="Show where a selected piece can move"
                  />
                </div>
              </div>
              <div className="aspect-square w-full max-w-[260px] overflow-hidden board-wrapper">
                <Chessground config={PREVIEW_CONFIG} />
              </div>
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <Segmented
              value={settings.theme}
              onChange={theme => set({ theme })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
            <div className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
              <Switch
                checked={settings.soundEnabled}
                onChange={soundEnabled => set({ soundEnabled })}
                label="Sounds"
                description="Move, capture and feedback sounds"
              />
            </div>
          </Section>

          {/* Engine */}
          <Section title="Engine" description="Stockfish 19 runs in your browser while you edit openings.">
            <div className="divide-y divide-border-subtle border-y border-border-subtle">
              <Switch
                checked={settings.engineEnabled}
                onChange={engineEnabled => set({ engineEnabled })}
                label="Analysis in the editor"
                description="Evaluation bar and the top 3 engine lines"
              />
              <Switch
                checked={settings.engineArrow}
                onChange={engineArrow => set({ engineArrow })}
                label="Best move arrow"
                description="Draw the engine's preferred move on the board"
              />
            </div>
          </Section>

          {/* Lichess */}
          <Section title="Lichess" description="The opening explorer needs a free personal API token. It stays in this browser.">
            {settings.lichessToken ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 text-sm">
                  <KeyRound className="h-4 w-4 text-action" /> Token connected
                  <span className="font-mono text-xs text-text-muted">…{settings.lichessToken.slice(-4)}</span>
                </span>
                <ActionButton size="sm" onClick={() => set({ lichessToken: '' })}>Remove</ActionButton>
              </div>
            ) : (
              <form
                className="flex max-w-md gap-2"
                onSubmit={e => {
                  e.preventDefault()
                  if (tokenDraft.trim()) {
                    set({ lichessToken: tokenDraft.trim() })
                    setTokenDraft('')
                  }
                }}
              >
                <input
                  type="password"
                  value={tokenDraft}
                  onChange={e => setTokenDraft(e.target.value)}
                  placeholder="lip_…"
                  autoComplete="off"
                  aria-label="Lichess API token"
                  className="h-10 min-w-0 flex-1 border border-border-strong bg-surface-1 px-3 text-sm focus:border-text-primary focus:outline-none"
                />
                <ActionButton type="submit" tone="ink" disabled={!tokenDraft.trim()}>Save</ActionButton>
              </form>
            )}
            <a
              href="https://lichess.org/account/oauth/token/create?description=ChessOp+opening+explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-text-secondary underline underline-offset-2 hover:text-text-primary"
            >
              Create a token on lichess.org
            </a>
          </Section>

          {/* Data */}
          <Section title="Your data" description="Everything is stored in this browser. Export a backup to move it or keep it safe.">
            <div className="flex flex-wrap gap-2">
              <ActionButton
                tone="ink"
                icon={Download}
                onClick={() => {
                  downloadBackup()
                  addToast('Backup downloaded', 'success')
                }}
              >
                Export backup
              </ActionButton>
              <ActionButton icon={Upload} onClick={() => fileRef.current?.click()}>
                Import backup
              </ActionButton>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    setPendingRestore(parseBackup(await file.text()))
                  } catch (err) {
                    addToast(err instanceof Error ? err.message : 'Invalid backup', 'error')
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setConfirmWipe(true)}
              className="mt-6 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-accent-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete all data
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}
