import type { OpeningMoveNode } from '@/types/opening'
import { NAG_SYMBOLS } from '@/types/opening'

interface MoveListProps {
  moves: OpeningMoveNode[]
  currentPath: string[]
  onMoveClick: (nodeId: string) => void
  startColor?: 'white' | 'black'
}

export function MoveList({ moves, currentPath, onMoveClick, startColor = 'white' }: MoveListProps) {
  if (moves.length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic p-2">
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
}

function MoveTree({
  nodes,
  currentPath,
  onMoveClick,
  moveNumber,
  isWhiteToMove,
  depth
}: MoveTreeProps) {
  // Get main line node and variations
  const mainNode = nodes.find(n => n.isMainLine) || nodes[0]
  const variations = nodes.filter(n => n !== mainNode)

  if (!mainNode) return null

  const isCurrentMove = currentPath[currentPath.length - 1] === mainNode.id
  const isInPath = currentPath.includes(mainNode.id)

  // Format NAGs
  const nagString = mainNode.nags?.map(nag => NAG_SYMBOLS[nag] || '').join('') || ''

  return (
    <>
      {/* Main move */}
      <span className="inline">
        {/* Move number for white */}
        {isWhiteToMove && (
          <span className="text-zinc-500 mr-1">{moveNumber}.</span>
        )}
        {/* Move number for black at start of line */}
        {!isWhiteToMove && depth === 0 && (
          <span className="text-zinc-500 mr-1">{moveNumber}...</span>
        )}

        {/* The move itself */}
        <button
          onClick={() => onMoveClick(mainNode.id)}
          className={`hover:bg-zinc-700 px-1 rounded transition-colors ${isCurrentMove
              ? 'bg-blue-600 text-white'
              : isInPath
                ? 'text-blue-400'
                : 'text-zinc-200'
            } ${mainNode.isMainLine ? '' : 'text-zinc-400'}`}
        >
          {mainNode.san}
          {nagString && <span className="text-yellow-500 ml-0.5">{nagString}</span>}
        </button>

        {/* Inline comment preview */}
        {mainNode.comment && (
          <span className="text-zinc-500 text-xs ml-1" title={mainNode.comment}>
            💬
          </span>
        )}
      </span>

      {/* Variations (inline, parenthesized) */}
      {variations.length > 0 && (
        <span className="text-zinc-500">
          {variations.map((variation) => (
            <span key={variation.id} className="ml-1">
              (
              {!isWhiteToMove && <span>{moveNumber}...</span>}
              {isWhiteToMove && <span>{moveNumber}.</span>}
              <button
                onClick={() => onMoveClick(variation.id)}
                className={`hover:bg-zinc-700 px-0.5 rounded transition-colors ${currentPath.includes(variation.id) ? 'text-blue-400' : 'text-zinc-400'
                  }`}
              >
                {variation.san}
              </button>
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
                  />
                </span>
              )}
              )
            </span>
          ))}
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
          />
        </span>
      )}
    </>
  )
}

interface CompactMoveListProps {
  line: OpeningMoveNode[]
  currentMoveIndex: number
  startColor?: 'white' | 'black'
}

/**
 * A compact linear move list for showing a single line (used in practice mode)
 */
export function CompactMoveList({ line, currentMoveIndex, startColor = 'white' }: CompactMoveListProps) {
  if (line.length === 0) {
    return <div className="text-sm text-zinc-500 italic">No moves</div>
  }

  let moveNumber = 1
  let isWhite = startColor === 'white'

  return (
    <div className="font-mono text-sm flex flex-wrap gap-x-1 gap-y-0.5">
      {line.map((node, index) => {
        const showNumber = isWhite
        const currentNumber = moveNumber

        // Increment move number after black's move
        if (!isWhite) {
          moveNumber++
        }
        isWhite = !isWhite

        const isPast = index < currentMoveIndex
        const isCurrent = index === currentMoveIndex

        return (
          <span key={node.id} className="inline-flex items-center">
            {showNumber && (
              <span className="text-zinc-500 mr-0.5">{currentNumber}.</span>
            )}
            <span
              className={`px-1 rounded ${isCurrent
                  ? 'bg-blue-600 text-white'
                  : isPast
                    ? 'text-zinc-400'
                    : 'text-zinc-600'
                }`}
            >
              {node.san}
            </span>
          </span>
        )
      })}
    </div>
  )
}
