import { useState, useCallback } from 'react'
import type { OpeningMoveNode } from '@/types/opening'
import { NAG_SYMBOLS } from '@/types/opening'
import { ChevronRight, ChevronDown, MessageSquare, Flag } from 'lucide-react'

interface VariationExplorerProps {
  moves: OpeningMoveNode[]
  currentPath: string[]
  onMoveClick: (nodeId: string) => void
  startColor?: 'white' | 'black'
  practiceStartNodeId?: string
}

export function VariationExplorer({
  moves,
  currentPath,
  onMoveClick,
  startColor = 'white',
  practiceStartNodeId,
}: VariationExplorerProps) {
  if (moves.length === 0) {
    return (
      <div className="text-sm text-text-muted italic p-2">
        No moves in this opening
      </div>
    )
  }

  return (
    <div className="font-mono text-sm space-y-1">
      {moves.map((node, index) => (
        <TreeNode
          key={node.id}
          node={node}
          currentPath={currentPath}
          onMoveClick={onMoveClick}
          moveNumber={1}
          isWhiteToMove={startColor === 'white'}
          depth={0}
          isFirst={index === 0}
          practiceStartNodeId={practiceStartNodeId}
        />
      ))}
    </div>
  )
}

interface TreeNodeProps {
  node: OpeningMoveNode
  currentPath: string[]
  onMoveClick: (nodeId: string) => void
  moveNumber: number
  isWhiteToMove: boolean
  depth: number
  isFirst: boolean
  practiceStartNodeId?: string
}

function TreeNode({
  node,
  currentPath,
  onMoveClick,
  moveNumber,
  isWhiteToMove,
  depth,
  isFirst,
  practiceStartNodeId,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasVariations = node.children.length > 1
  const isCurrentMove = currentPath[currentPath.length - 1] === node.id
  const isInPath = currentPath.includes(node.id)
  const isPracticeStart = practiceStartNodeId === node.id

  // Format NAGs
  const nagString = node.nags?.map(nag => NAG_SYMBOLS[nag] || '').join('') || ''

  // Get main continuation and variations
  const mainChild = node.children.find(c => c.isMainLine) || node.children[0]
  const variations = node.children.filter(c => c !== mainChild)

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-border-subtle pl-2' : ''}`}>
      {/* Move row */}
      <div className="flex items-center gap-1 py-0.5">
        {/* Expand/collapse for variations */}
        {hasVariations ? (
          <button
            onClick={toggleExpand}
            className="p-0.5 hover:bg-surface-2 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-text-muted" />
            ) : (
              <ChevronRight className="h-3 w-3 text-text-muted" />
            )}
          </button>
        ) : (
          <span className="w-4" /> // Spacer
        )}

        {/* Move number */}
        {(isWhiteToMove || isFirst) && (
          <span className="text-text-muted text-xs min-w-5">
            {moveNumber}.{!isWhiteToMove && '..'}
          </span>
        )}

        {/* Move button */}
        <button
          onClick={() => onMoveClick(node.id)}
          className={`px-1.5 py-0.5 rounded text-sm font-medium transition-colors ${isCurrentMove
            ? 'bg-accent-blue text-white'
            : isInPath
              ? 'text-accent-blue hover:bg-surface-2'
              : node.isMainLine
                ? 'text-text-primary hover:bg-surface-2'
                : 'text-text-secondary hover:bg-surface-2'
            } ${isPracticeStart ? 'ring-1 ring-accent-success' : ''}`}
        >
          {node.san}
          {nagString && (
            <span className="text-accent-warning ml-0.5">{nagString}</span>
          )}
        </button>

        {/* Practice start flag */}
        {isPracticeStart && (
          <Flag className="h-3 w-3 text-accent-success" />
        )}

        {/* Comment indicator */}
        {node.comment && (
          <span className="text-text-muted" title={node.comment}>
            <MessageSquare className="h-3 w-3" />
          </span>
        )}

        {/* Variation count badge */}
        {hasVariations && (
          <span className="text-xs text-text-muted bg-surface-2 px-1.5 rounded">
            +{variations.length}
          </span>
        )}
      </div>

      {/* Children (main line and variations) */}
      {isExpanded && node.children.length > 0 && (
        <div className="space-y-1">
          {/* Main continuation */}
          {mainChild && (
            <TreeNode
              node={mainChild}
              currentPath={currentPath}
              onMoveClick={onMoveClick}
              moveNumber={isWhiteToMove ? moveNumber : moveNumber + 1}
              isWhiteToMove={!isWhiteToMove}
              depth={depth}
              isFirst={false}
              practiceStartNodeId={practiceStartNodeId}
            />
          )}

          {/* Variations */}
          {variations.map(variation => (
            <div
              key={variation.id}
              className="mt-1 bg-surface-1/50 rounded-lg py-1"
            >
              <TreeNode
                node={variation}
                currentPath={currentPath}
                onMoveClick={onMoveClick}
                moveNumber={isWhiteToMove ? moveNumber : moveNumber + 1}
                isWhiteToMove={!isWhiteToMove}
                depth={depth + 1}
                isFirst={true}
                practiceStartNodeId={practiceStartNodeId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
