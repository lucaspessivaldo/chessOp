import type { OpeningMoveNode } from '@/types/opening'
import { NAG_SYMBOLS } from '@/types/opening'
import { Flag, MessageSquare } from 'lucide-react'

interface MoveListProps {
  moves: OpeningMoveNode[]
  currentPath: string[]
  onMoveClick: (nodeId: string) => void
  startColor?: 'white' | 'black'
  practiceStartNodeId?: string
}

export function MoveList({ moves, currentPath, onMoveClick, startColor = 'white', practiceStartNodeId }: MoveListProps) {
  if (moves.length === 0) {
    return (
      <div className="text-sm text-text-muted italic p-2">
        No moves in this opening
      </div>
    )
  }

  return (
    <div className="font-mono text-sm space-y-0.5 max-h-[300px] overflow-y-auto">
      <MoveTree
        nodes={moves}
        currentPath={currentPath}
        onMoveClick={onMoveClick}
        moveNumber={1}
        isWhiteToMove={startColor === 'white'}
        depth={0}
        practiceStartNodeId={practiceStartNodeId}
      />
    </div>
  )
}

interface MoveTreeProps {
  nodes: OpeningMoveNode[]
  currentPath: string[]
  onMoveClick: (nodeId: string) => void
  moveNumber: number
  isWhiteToMove: boolean
  depth: number
  practiceStartNodeId?: string
}

function MoveTree({
  nodes,
  currentPath,
  onMoveClick,
  moveNumber,
  isWhiteToMove,
  depth,
  practiceStartNodeId
}: MoveTreeProps) {
  // Get main line node and variations
  const mainNode = nodes.find(n => n.isMainLine) || nodes[0]
  const variations = nodes.filter(n => n !== mainNode)

  if (!mainNode) return null

  const isCurrentMove = currentPath[currentPath.length - 1] === mainNode.id
  const isInPath = currentPath.includes(mainNode.id)

  // Format NAGs
  const nagString = mainNode.nags?.map(nag => NAG_SYMBOLS[nag] || '').join('') || ''

  // Check if this is the practice start point
  const isPracticeStart = practiceStartNodeId === mainNode.id

  return (
    <>
      {/* Main move */}
      <span className="inline-flex items-center">
        {/* Move number for white */}
        {isWhiteToMove && (
          <span className="text-text-muted mr-1">{moveNumber}.</span>
        )}
        {/* Move number for black at start of line */}
        {!isWhiteToMove && depth === 0 && (
          <span className="text-text-muted mr-1">{moveNumber}...</span>
        )}

        {/* The move itself with NAGs inside the button */}
        <button
          onClick={() => onMoveClick(mainNode.id)}
          className={`px-1.5 py-0.5 rounded transition-colors inline-flex items-center gap-0.5 ${isCurrentMove
            ? 'bg-ink text-ink-foreground'
            : isInPath
              ? 'bg-surface-3 text-text-primary'
              : 'bg-surface-2/50 text-text-primary hover:bg-surface-2'
            } ${mainNode.isMainLine ? '' : 'text-text-secondary'} ${isPracticeStart ? 'ring-1 ring-accent-success' : ''}`}
        >
          {mainNode.san}
          {nagString && <span className={`${isCurrentMove ? 'text-accent-warning' : 'text-accent-warning'}`}>{nagString}</span>}
          {/* Practice start marker inside button */}
          {isPracticeStart && (
            <Flag className="h-3 w-3 text-accent-success" />
          )}
          {/* Inline comment indicator inside button */}
          {mainNode.comment && (
            <span title={mainNode.comment}>
              <MessageSquare className={`h-3 w-3 ${isCurrentMove ? 'text-text-secondary' : 'text-text-muted'}`} />
            </span>
          )}
        </button>
      </span>

      {/* Variations (inline, parenthesized) */}
      {variations.length > 0 && (
        <span className="text-text-muted">
          {variations.map((variation) => {
            const isVariationPracticeStart = practiceStartNodeId === variation.id
            return (
              <span key={variation.id} className="ml-1">
                (
                {!isWhiteToMove && <span>{moveNumber}...</span>}
                {isWhiteToMove && <span>{moveNumber}.</span>}
                <button
                  onClick={() => onMoveClick(variation.id)}
                  className={`px-1 py-0.5 rounded transition-colors ${currentPath.includes(variation.id)
                    ? 'bg-surface-3 text-text-primary'
                    : 'bg-surface-2/30 text-text-secondary hover:bg-surface-2/50'
                    } ${isVariationPracticeStart ? 'ring-1 ring-accent-success' : ''}`}
                >
                  {variation.san}
                </button>
                {isVariationPracticeStart && (
                  <Flag className="inline-block h-3 w-3 text-accent-success ml-0.5" />
                )}
                {/* Recursively render variation continuation */}
                {variation.children.length > 0 && (
                  <span className="ml-1">
                    <MoveTree
                      nodes={variation.children}
                      currentPath={currentPath}
                      onMoveClick={onMoveClick}
                      moveNumber={isWhiteToMove ? moveNumber : moveNumber + 1}
                      isWhiteToMove={!isWhiteToMove}
                      depth={depth + 1}
                      practiceStartNodeId={practiceStartNodeId}
                    />
                  </span>
                )}
                )
              </span>
            )
          })}
        </span>
      )}

      {/* Continue main line */}
      {mainNode.children.length > 0 && (
        <span className="ml-1">
          <MoveTree
            nodes={mainNode.children}
            currentPath={currentPath}
            onMoveClick={onMoveClick}
            moveNumber={isWhiteToMove ? moveNumber : moveNumber + 1}
            isWhiteToMove={!isWhiteToMove}
            depth={depth + 1}
            practiceStartNodeId={practiceStartNodeId}
          />
        </span>
      )}
    </>
  )
}

interface CompactMoveListProps {
  line: OpeningMoveNode[]
  /** Number of moves already played */
  currentMoveIndex: number
  /** Ply of the line's starting position (0 = initial position, white to move) */
  startPly?: number
  /** Hide moves that haven't been played yet (practice) */
  hideFuture?: boolean
}

/**
 * A compact linear move list for a single line
 */
export function CompactMoveList({ line, currentMoveIndex, startPly = 0, hideFuture = false }: CompactMoveListProps) {
  if (line.length === 0) {
    return <div className="text-sm text-text-muted italic">No moves</div>
  }

  const visible = hideFuture ? line.slice(0, currentMoveIndex) : line

  return (
    <ol className="font-mono text-sm flex flex-wrap gap-x-1 gap-y-1" aria-label="Moves of the line">
      {visible.map((node, index) => {
        const ply = startPly + index
        const isWhite = ply % 2 === 0
        const moveNumber = Math.floor(ply / 2) + 1
        const showNumber = isWhite || index === 0
        const isLastPlayed = index === currentMoveIndex - 1
        const isPast = index < currentMoveIndex
        const nag = node.nags?.map(n => NAG_SYMBOLS[n] || '').join('') || ''

        return (
          <li key={node.id} className="inline-flex items-center">
            {showNumber && (
              <span className="text-text-muted mr-0.5 text-xs">{moveNumber}.{isWhite ? '' : '..'}</span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded-md ${isLastPlayed
                ? 'bg-ink text-ink-foreground font-medium'
                : isPast
                  ? 'text-text-primary'
                  : 'text-text-muted'
                }`}
            >
              {node.san}
              {nag && <span className={isLastPlayed ? 'text-ink-foreground/70' : 'text-accent-warning'}>{nag}</span>}
            </span>
          </li>
        )
      })}
      {hideFuture && currentMoveIndex < line.length && (
        <li className="px-1.5 py-0.5 text-text-muted">…</li>
      )}
    </ol>
  )
}
