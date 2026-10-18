import { useMemo, useState } from 'react'
import { Check, CornerDownRight, Eye, Loader2, Plus, Radar, X } from 'lucide-react'
import type { OpeningMoveNode } from '@/types/opening'
import { ExplorerError, formatGameCount } from '@/lib/lichess-api'
import { findUnansweredMoves, normalizeSan, type RepertoireGap } from '@/lib/repertoire-gaps'
import { fenPly, formatMoves, getNodeAtPath } from '@/lib/opening-utils'
import type { GapScanState } from '@/hooks/use-repertoire-gaps'
import { ActionButton, SidebarSection } from '@/components/training/training-ui'
import { cn } from '@/lib/utils'
import { LichessTokenForm } from './opening-stats'

const SHARE_OPTIONS = [
  { value: 0.03, label: '3%' },
  { value: 0.05, label: '5%' },
  { value: 0.1, label: '10%' },
]

/** The last moves before a position, e.g. "…2.c4 c6 3.Nc3" */
function pathContext(moves: OpeningMoveNode[], path: string[], rootFen: string): string {
  if (path.length === 0) return 'starting position'
  const nodes: OpeningMoveNode[] = []
  let level = moves
  for (const id of path) {
    const node = level.find(n => n.id === id)
    if (!node) break
    nodes.push(node)
    level = node.children
  }
  const shown = nodes.slice(-3)
  const text = formatMoves(shown, fenPly(rootFen) + nodes.length - shown.length)
  return nodes.length > shown.length ? `…${text}` : text
}

function percent(value: number): string {
  const pct = value * 100
  return pct >= 10 ? `${Math.round(pct)}%` : pct >= 1 ? `${pct.toFixed(1)}%` : `${pct.toFixed(2)}%`
}

interface GapsPanelProps {
  moves: OpeningMoveNode[]
  rootFen: string
  color: 'white' | 'black'
  token: string
  scan: GapScanState & {
    start: (options: { moves: OpeningMoveNode[]; rootFen: string; color: 'white' | 'black'; token: string; minShare: number }) => void
    cancel: () => void
  }
  /** Gap whose move is shown on the board */
  previewId: string | null
  onShow: (gap: RepertoireGap) => void
  onAdd: (gap: RepertoireGap) => void
}

/**
 * Editor tab listing the opponent moves the repertoire doesn't answer
 */
export function GapsPanel({ moves, rootFen, color, token, scan, previewId, onShow, onAdd }: GapsPanelProps) {
  const [minShare, setMinShare] = useState(0.05)
  const unanswered = useMemo(() => findUnansweredMoves(moves, rootFen, color), [moves, rootFen, color])

  // A popular gap is covered once its move exists at that position
  const isCovered = (gap: RepertoireGap) => {
    const siblings = gap.path.length === 0 ? moves : getNodeAtPath(moves, gap.path)?.children
    return !!siblings?.some(n => normalizeSan(n.san) === normalizeSan(gap.san))
  }
  const popular = [...scan.gaps].sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
  const scanning = scan.status === 'scanning'
  const tokenRejected = scan.error instanceof ExplorerError && scan.error.kind === 'unauthorized'

  return (
    <div>
      <SidebarSection title={<span>No reply prepared{unanswered.length > 0 && <Count n={unanswered.length} />}</span>}>
        {unanswered.length === 0 ? (
          <p className="text-xs text-text-muted">
            {moves.length === 0 ? 'Add some moves first.' : 'Every line ends with your move. Nice.'}
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-text-secondary">These lines stop right after the opponent's move. Add your answer.</p>
            <ul className="-mx-1 space-y-0.5">
              {unanswered.map(gap => (
                <li key={gap.id}>
                  <button
                    type="button"
                    onClick={() => onShow(gap)}
                    className="flex w-full items-center gap-2 px-1 py-1.5 text-left text-sm hover:bg-surface-2"
                  >
                    <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-accent-warning" />
                    <span className="font-mono font-medium">{gap.label}</span>
                    <span className="ml-auto text-xs text-text-muted">Go</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </SidebarSection>

      <SidebarSection title={<span>Popular moves you don't cover{popular.length > 0 && <Count n={popular.length} />}</span>}>
        {!token || tokenRejected ? (
          <div className="-m-4">
            <LichessTokenForm invalid={tokenRejected} />
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs leading-relaxed text-text-secondary">
              Checks every position where your opponent moves against Lichess games (1600–2200) and lists the
              replies you haven't prepared, ranked by how often you'll actually meet them.
            </p>

            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-text-muted">Played in at least</span>
              <div className="flex" role="radiogroup" aria-label="Minimum share">
                {SHARE_OPTIONS.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    role="radio"
                    aria-checked={minShare === option.value}
                    disabled={scanning}
                    onClick={() => setMinShare(option.value)}
                    className={cn(
                      '-ml-px border px-2 py-1 text-xs font-medium tabular-nums first:ml-0 disabled:opacity-50',
                      minShare === option.value
                        ? 'relative z-10 border-ink bg-ink text-ink-foreground'
                        : 'border-border-strong text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {scanning ? (
              <div className="mb-3 flex items-center gap-2 border border-border-subtle bg-surface-2 px-3 py-2">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-secondary" />
                <span className="flex-1 text-xs text-text-secondary">
                  Checking positions… <span className="tabular-nums">{scan.checked}</span> done
                </span>
                <button type="button" onClick={scan.cancel} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary">
                  <X className="h-3.5 w-3.5" /> Stop
                </button>
              </div>
            ) : (
              <ActionButton
                tone="primary"
                icon={Radar}
                className="mb-3 w-full"
                disabled={moves.length === 0}
                onClick={() => scan.start({ moves, rootFen, color, token, minShare })}
              >
                {scan.status === 'idle' ? 'Scan repertoire' : 'Scan again'}
              </ActionButton>
            )}

            {scan.status === 'error' && !tokenRejected && (
              <p className="mb-3 text-xs text-accent-danger">{scan.error?.message} Results so far are shown below.</p>
            )}
            {scan.status === 'done' && (
              <p className="mb-3 text-xs text-text-muted">
                {scan.checked} positions checked
                {scan.skipped > 0 && ` · ${scan.skipped} rare ones skipped`}
                {popular.length === 0 && ' · no gaps above this threshold'}
              </p>
            )}

            {popular.length > 0 && (
              <ul className="-mx-1 divide-y divide-border-subtle border-y border-border-subtle">
                {popular.map(gap => {
                  const covered = isCovered(gap)
                  return (
                    <li
                      key={gap.id}
                      className={cn('flex items-center gap-2 px-1 py-2', previewId === gap.id && 'bg-surface-2', covered && 'opacity-55')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold">{gap.label}</p>
                        <p className="truncate text-[11px] text-text-muted">
                          after {pathContext(moves, gap.path, rootFen)}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {percent(gap.share ?? 0)} here · {formatGameCount(gap.games ?? 0)} games
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">{percent(gap.frequency ?? 0)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">of games</p>
                      </div>
                      {covered ? (
                        <span className="flex h-8 w-16 items-center justify-center gap-1 text-xs text-accent-success">
                          <Check className="h-3.5 w-3.5" /> Added
                        </span>
                      ) : (
                        <div className="flex">
                          <button
                            type="button"
                            onClick={() => onShow(gap)}
                            title="Show on the board"
                            aria-label={`Show ${gap.label} on the board`}
                            className="flex h-8 w-8 items-center justify-center text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdd(gap)}
                            title="Add to the repertoire, then play your answer"
                            aria-label={`Add ${gap.label} to the repertoire`}
                            className="flex h-8 w-8 items-center justify-center bg-action text-action-foreground hover:bg-action-hover"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </SidebarSection>
    </div>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-1.5 text-text-muted tabular-nums">{n}</span>
}
