import { useState } from 'react'
import { AlertCircle, Check, ChevronDown, ChevronUp, ExternalLink, KeyRound, Loader2, Plus, RefreshCw } from 'lucide-react'
import type { OpeningStats, MoveStats } from '@/lib/lichess-api'
import { calculateWinRate, ExplorerError, formatGameCount } from '@/lib/lichess-api'
import { updateSettings } from '@/lib/settings'
import { ActionButton } from '@/components/training/training-ui'
import { cn } from '@/lib/utils'

const TOKEN_URL = 'https://lichess.org/account/oauth/token/create?description=ChessOp+opening+explorer'

interface OpeningStatsProps {
  stats: OpeningStats | null
  isLoading: boolean
  error: Error | null
  hasToken: boolean
  onRetry?: () => void
  /** UCI moves that exist in the user's repertoire at this position */
  repertoireMoves?: string[]
  /** Current side to move */
  sideToMove: 'white' | 'black'
  /** Callback when user clicks on a move */
  onMoveClick?: (uci: string, san: string) => void
  /** Callback when user hovers over a move (null when mouse leaves) */
  onMoveHover?: (uci: string | null) => void
}

/**
 * Form to store a Lichess API token (the explorer requires authentication)
 */
export function LichessTokenForm({ invalid = false }: { invalid?: boolean }) {
  const [value, setValue] = useState('')

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={e => {
        e.preventDefault()
        if (value.trim()) updateSettings({ lichessToken: value.trim() })
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15">
          <KeyRound className="h-4 w-4 text-accent-blue" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {invalid ? 'Your Lichess token was rejected' : 'Connect the Lichess explorer'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Lichess requires a free personal API token to see what players choose in each position.
            No permissions are needed. It's stored only in this browser.
          </p>
        </div>
      </div>
      <a
        href={TOKEN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:underline"
      >
        Create a token on lichess.org <ExternalLink className="h-3 w-3" />
      </a>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="lip_…"
          autoComplete="off"
          aria-label="Lichess API token"
          className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
        />
        <ActionButton type="submit" tone="primary" size="sm" disabled={!value.trim()}>
          Save
        </ActionButton>
      </div>
    </form>
  )
}

export function OpeningStatsPanel({
  stats,
  isLoading,
  error,
  hasToken,
  onRetry,
  repertoireMoves = [],
  sideToMove,
  onMoveClick,
  onMoveHover,
}: OpeningStatsProps) {
  const [showAllMoves, setShowAllMoves] = useState(false)

  if (!hasToken) return <LichessTokenForm />

  if (error instanceof ExplorerError && error.kind === 'unauthorized') {
    return <LichessTokenForm invalid />
  }

  if (error) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2 text-accent-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-sm">{error.message || 'Failed to load stats'}</span>
        </div>
        {onRetry && (
          <ActionButton size="sm" icon={RefreshCw} onClick={onRetry}>
            Retry
          </ActionButton>
        )}
      </div>
    )
  }

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-2 p-4 text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading Lichess stats…</span>
      </div>
    )
  }

  const totalGames = stats.white + stats.draws + stats.black
  const whitePercent = totalGames > 0 ? (stats.white / totalGames) * 100 : 0
  const drawPercent = totalGames > 0 ? (stats.draws / totalGames) * 100 : 0
  const blackPercent = totalGames > 0 ? (stats.black / totalGames) * 100 : 0
  const maxMoveGames = Math.max(1, ...stats.moves.map(m => m.white + m.draws + m.black))

  const movesToShow = showAllMoves ? stats.moves : stats.moves.slice(0, 6)
  const hasMoreMoves = stats.moves.length > 6

  return (
    <div className="space-y-4 p-4">
      {stats.opening && (
        <div className="text-xs">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-text-muted">{stats.opening.eco}</span>
          <span className="ml-2 font-semibold text-text-primary">{stats.opening.name}</span>
        </div>
      )}

      {totalGames > 0 && (
        <div>
          <div className="flex h-5 overflow-hidden rounded-md text-[10px] font-semibold">
            <div className="flex items-center justify-center bg-zinc-100 text-zinc-800" style={{ width: `${whitePercent}%` }}>
              {whitePercent >= 12 && `${whitePercent.toFixed(0)}%`}
            </div>
            <div className="flex items-center justify-center bg-zinc-500 text-white" style={{ width: `${drawPercent}%` }}>
              {drawPercent >= 12 && `${drawPercent.toFixed(0)}%`}
            </div>
            <div className="flex items-center justify-center bg-zinc-900 text-zinc-200" style={{ width: `${blackPercent}%` }}>
              {blackPercent >= 12 && `${blackPercent.toFixed(0)}%`}
            </div>
          </div>
          <p className="mt-1.5 text-center text-xs text-text-muted">
            {formatGameCount(totalGames)} games · white / draw / black
          </p>
        </div>
      )}

      {stats.moves.length > 0 ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-wider text-text-muted">
            <span>Move</span>
            <span>Games · score for {sideToMove}</span>
          </div>
          {movesToShow.map(move => (
            <MoveRow
              key={move.uci}
              move={move}
              maxGames={maxMoveGames}
              sideToMove={sideToMove}
              isInRepertoire={repertoireMoves.includes(move.uci)}
              onClick={() => onMoveClick?.(move.uci, move.san)}
              onHover={hovering => onMoveHover?.(hovering ? move.uci : null)}
            />
          ))}
          {hasMoreMoves && (
            <button
              type="button"
              onClick={() => setShowAllMoves(!showAllMoves)}
              className="flex w-full items-center justify-center gap-1 py-1 text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              {showAllMoves ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showAllMoves ? 'Show less' : `Show ${stats.moves.length - 6} more`}
            </button>
          )}
          <p className="pt-1 text-[11px] text-text-muted">Click a move to add it to your repertoire.</p>
        </div>
      ) : (
        <p className="text-xs italic text-text-muted">No recorded games from this position.</p>
      )}
    </div>
  )
}

interface MoveRowProps {
  move: MoveStats
  maxGames: number
  sideToMove: 'white' | 'black'
  isInRepertoire: boolean
  onClick?: () => void
  onHover?: (hovering: boolean) => void
}

function MoveRow({ move, maxGames, sideToMove, isInRepertoire, onClick, onHover }: MoveRowProps) {
  const totalGames = move.white + move.draws + move.black
  const winRate = calculateWinRate(move, sideToMove)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        isInRepertoire ? 'bg-accent-success/15 hover:bg-accent-success/25' : 'hover:bg-surface-2'
      )}
    >
      {isInRepertoire ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-accent-success" />
      ) : (
        <Plus className="h-3.5 w-3.5 shrink-0 text-text-muted transition-colors group-hover:text-accent-blue" />
      )}
      <span className={cn('min-w-12 font-mono text-sm font-medium', isInRepertoire ? 'text-accent-success' : 'text-text-primary')}>
        {move.san}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" title={`${totalGames.toLocaleString()} games`}>
        <div
          className={cn('h-full rounded-full', isInRepertoire ? 'bg-accent-success' : 'bg-accent-blue/70')}
          style={{ width: `${(totalGames / maxGames) * 100}%` }}
        />
      </div>
      <span className="w-11 text-right text-xs tabular-nums text-text-secondary">{formatGameCount(totalGames)}</span>
      <span
        className={cn(
          'w-9 text-right text-xs font-medium tabular-nums',
          winRate >= 55 ? 'text-accent-success' : winRate >= 45 ? 'text-text-secondary' : 'text-accent-danger'
        )}
        title={`Score for ${sideToMove} (wins + half the draws)`}
      >
        {winRate.toFixed(0)}%
      </span>
    </button>
  )
}
