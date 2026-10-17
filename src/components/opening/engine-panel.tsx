import { useMemo } from 'react'
import { Cpu, Loader2, MoveUpRight } from 'lucide-react'
import type { Square } from '@jackstenglein/chess'
import type { EngineAnalysis } from '@/lib/engine'
import { formatScore } from '@/lib/engine'
import type { EngineStatus } from '@/hooks/use-engine'
import { createChess, parseUci } from '@/chess/chess-utils'
import { fenPly, formatMoves } from '@/lib/opening-utils'
import { updateSettings, useSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'

interface EnginePanelProps {
  fen: string
  status: EngineStatus
  analysis: EngineAnalysis | null
  /** Play (add to the repertoire) the first move of a line */
  onPlay: (uci: string) => void
  /** Hover a line to preview its first move */
  onHover?: (uci: string | null) => void
}

/** Convert a UCI principal variation to SAN, stopping at the first illegal move */
function pvToSan(fen: string, pv: string[], max = 8): { san: string }[] {
  const chess = createChess(fen)
  const moves: { san: string }[] = []
  for (const uci of pv.slice(0, max)) {
    const { from, to, promotion } = parseUci(uci)
    let move
    try {
      move = chess.move({ from: from as Square, to: to as Square, promotion })
    } catch {
      move = null
    }
    if (!move) break
    moves.push({ san: move.san })
  }
  return moves
}

/**
 * Compact Stockfish panel: on/off switch, depth, evaluation and the top lines
 */
export function EnginePanel({ fen, status, analysis, onPlay, onHover }: EnginePanelProps) {
  const { engineEnabled, engineArrow } = useSettings()
  const startPly = fenPly(fen)

  const lines = useMemo(
    () => (analysis?.lines ?? []).map(line => ({ ...line, moves: pvToSan(fen, line.pv) })),
    [analysis, fen]
  )
  const gameOver = useMemo(() => {
    const chess = createChess(fen)
    return chess.isCheckmate() ? 'Checkmate' : chess.isStalemate() ? 'Stalemate' : null
  }, [fen])

  return (
    <div className="border-b border-border-subtle">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          role="switch"
          aria-checked={engineEnabled}
          onClick={() => updateSettings({ engineEnabled: !engineEnabled })}
          className="flex items-center gap-2 rounded-md py-1 pr-1 text-xs font-medium text-text-primary"
          title={engineEnabled ? 'Turn the engine off' : 'Turn the engine on'}
        >
          <span
            className={cn(
              'relative h-4 w-7 rounded-full transition-colors',
              engineEnabled ? 'bg-ink' : 'bg-surface-3'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-3 w-3 rounded-full bg-surface-1 shadow-sm transition-all',
                engineEnabled ? 'left-3.5' : 'left-0.5'
              )}
            />
          </span>
          <Cpu className="h-3.5 w-3.5 text-text-muted" />
          Stockfish 19
        </button>

        <span className="ml-auto flex items-center gap-2 text-[11px] text-text-muted tabular-nums">
          {status === 'loading' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </>
          )}
          {status === 'ready' && analysis && <>depth {analysis.depth}</>}
          {status === 'error' && <span className="text-accent-danger">Engine failed to start</span>}
        </span>

        {engineEnabled && (
          <button
            type="button"
            onClick={() => updateSettings({ engineArrow: !engineArrow })}
            aria-pressed={engineArrow}
            className={cn(
              'rounded p-1 transition-colors hover:bg-surface-2',
              engineArrow ? 'text-text-primary' : 'text-text-muted'
            )}
            title={engineArrow ? 'Hide best-move arrow' : 'Show best-move arrow'}
          >
            <MoveUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {engineEnabled && (
        <ul className="space-y-px px-1.5 pb-2">
          {gameOver ? (
            <li className="px-1.5 py-1 text-xs text-text-secondary">{gameOver}</li>
          ) : lines.length === 0 ? (
            <li className="px-1.5 py-1 text-xs text-text-muted">{status === 'ready' ? 'Thinking…' : ' '}</li>
          ) : (
            lines.map(line => (
              <li key={line.rank}>
                <button
                  type="button"
                  onClick={() => line.pv[0] && onPlay(line.pv[0])}
                  onMouseEnter={() => onHover?.(line.pv[0] ?? null)}
                  onMouseLeave={() => onHover?.(null)}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
                  title="Add the first move to your repertoire"
                >
                  <span
                    className={cn(
                      'w-12 shrink-0 rounded-sm px-1 py-px text-center font-mono text-[11px] font-medium tabular-nums',
                      (line.mate ?? line.cp ?? 0) >= 0 ? 'bg-[#f4f4f2] text-[#403d39] ring-1 ring-black/10' : 'bg-[#403d39] text-[#f4f4f2]'
                    )}
                  >
                    {formatScore(line)}
                  </span>
                  <span className="truncate font-mono text-xs text-text-secondary">{formatMoves(line.moves, startPly, 8)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
