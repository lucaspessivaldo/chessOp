import { useState } from 'react'
import type { OpeningStats, MoveStats } from '@/lib/lichess-api'
import { calculateWinRate, formatGameCount } from '@/lib/lichess-api'
import { ChevronDown, ChevronUp, Loader2, AlertCircle, Check, Plus } from 'lucide-react'

interface OpeningStatsProps {
  stats: OpeningStats | null
  isLoading: boolean
  error: Error | null
  /** UCI moves that exist in the user's repertoire at this position */
  repertoireMoves?: string[]
  /** Current side to move */
  sideToMove: 'white' | 'black'
  /** Callback when user clicks on a move */
  onMoveClick?: (uci: string, san: string) => void
  /** Callback when user hovers over a move (null when mouse leaves) */
  onMoveHover?: (uci: string | null) => void
}

export function OpeningStatsPanel({
  stats,
  isLoading,
  error,
  repertoireMoves = [],
  sideToMove,
  onMoveClick,
  onMoveHover,
}: OpeningStatsProps) {
  const [showAllMoves, setShowAllMoves] = useState(false)

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading stats...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-accent-danger">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load stats</span>
        </div>
      </div>
    )
  }

  // No stats
  if (!stats) {
    return (
      <div className="p-4">
        <div className="text-sm text-text-muted italic">
          No statistics available
        </div>
      </div>
    )
  }

  const totalGames = stats.white + stats.draws + stats.black
  const whitePercent = totalGames > 0 ? (stats.white / totalGames) * 100 : 0
  const drawPercent = totalGames > 0 ? (stats.draws / totalGames) * 100 : 0
  const blackPercent = totalGames > 0 ? (stats.black / totalGames) * 100 : 0

  // Moves to display (limit to 5 unless expanded)
  const movesToShow = showAllMoves ? stats.moves : stats.moves.slice(0, 5)
  const hasMoreMoves = stats.moves.length > 5

  return (
    <div className="p-4 space-y-3">
      {/* Opening name */}
      {stats.opening && (
        <div className="text-xs">
          <span className="text-text-muted">{stats.opening.eco}</span>
          <span className="text-text-secondary ml-2 font-semibold">{stats.opening.name}</span>
        </div>
      )}

      {/* Result bar */}
      <div>
        <div className="flex h-4 rounded overflow-hidden">
          <div
            className="bg-zinc-100"
            style={{ width: `${whitePercent}%` }}
            title={`White: ${stats.white.toLocaleString()} wins`}
          />
          <div
            className="bg-zinc-500"
            style={{ width: `${drawPercent}%` }}
            title={`Draws: ${stats.draws.toLocaleString()}`}
          />
          <div
            className="bg-zinc-900"
            style={{ width: `${blackPercent}%` }}
            title={`Black: ${stats.black.toLocaleString()} wins`}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-text-secondary">{whitePercent.toFixed(0)}%</span>
          <span className="text-text-secondary">{drawPercent.toFixed(0)}%</span>
          <span className="text-text-muted">{blackPercent.toFixed(0)}%</span>
        </div>
        <div className="text-xs text-text-muted text-center mt-1">
          {formatGameCount(totalGames)} games
        </div>
      </div>

      {/* Candidate moves */}
      {stats.moves.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-text-muted uppercase tracking-wider">
            Top Moves
          </div>
          <div className="space-y-1">
            {movesToShow.map((move) => (
              <MoveRow
                key={move.uci}
                move={move}
                sideToMove={sideToMove}
                isInRepertoire={repertoireMoves.includes(move.uci)}
                onClick={() => onMoveClick?.(move.uci, move.san)}
                onHover={(hovering) => onMoveHover?.(hovering ? move.uci : null)}
              />
            ))}
          </div>
          {hasMoreMoves && (
            <button
              onClick={() => setShowAllMoves(!showAllMoves)}
              className="w-full flex items-center justify-center gap-1 text-xs text-text-muted hover:text-text-secondary py-1 transition-colors"
            >
              {showAllMoves ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show {stats.moves.length - 5} more
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* No moves message */}
      {stats.moves.length === 0 && (
        <div className="text-xs text-text-muted italic">
          No recorded games from this position
        </div>
      )}
    </div>
  )
}

interface MoveRowProps {
  move: MoveStats
  sideToMove: 'white' | 'black'
  isInRepertoire: boolean
  onClick?: () => void
  onHover?: (hovering: boolean) => void
}

function MoveRow({ move, sideToMove, isInRepertoire, onClick, onHover }: MoveRowProps) {
  const totalGames = move.white + move.draws + move.black
  const winRate = calculateWinRate(move, sideToMove)
  // totalGames used for bar width relative to siblings

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors group ${isInRepertoire
        ? 'bg-green-600/20 hover:bg-green-600/30'
        : 'bg-surface-2/50 hover:bg-surface-2'
        }`}
    >
      {/* In repertoire indicator or add button */}
      {isInRepertoire ? (
        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
      ) : (
        <Plus className="h-3.5 w-3.5 text-text-muted group-hover:text-accent-blue shrink-0 transition-colors" />
      )}

      {/* Move name */}
      <span className={`font-mono text-sm min-w-10 ${isInRepertoire ? 'text-accent-success' : 'text-text-primary'
        }`}>
        {move.san}
      </span>

      {/* Popularity bar */}
      <div className="flex-1 h-2 bg-surface-3 rounded overflow-hidden">
        <div
          className={`h-full ${isInRepertoire ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(100, (totalGames / 100) * 0.01)}%` }} // Placeholder scaling
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-secondary min-w-[35px] text-right">
          {formatGameCount(totalGames)}
        </span>
        <span className={`min-w-[35px] text-right ${winRate >= 55 ? 'text-accent-success' :
          winRate >= 45 ? 'text-text-secondary' :
            'text-accent-danger'
          }`}>
          {winRate.toFixed(0)}%
        </span>
        <span className="text-text-muted min-w-[30px] text-right" title="Average player rating">
          {move.averageRating}
        </span>
      </div>
    </button>
  )
}
