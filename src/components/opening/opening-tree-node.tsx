import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Flag, MessageSquare } from 'lucide-react'
import type { MoveNodeData, MoveNode } from './opening-tree-utils'
import { NAG_SYMBOLS } from '@/types/opening'

type MoveNodeProps = NodeProps<MoveNode>

export const MoveTreeNode = memo(function MoveTreeNode({ data, id }: MoveNodeProps) {
  const {
    san,
    isMainLine,
    isPracticeStart,
    isSelected,
    isInPath,
    moveNumber,
    color,
    hasComment,
    nags,
  } = data as MoveNodeData

  const isStart = id === 'start'

  // Format NAGs
  const nagString = nags?.map((nag: string) => NAG_SYMBOLS[nag] || '').join('') || ''

  // Node styling based on state
  const getBgColor = () => {
    if (isSelected) return 'bg-blue-600'
    if (isInPath) return 'bg-zinc-600'
    if (isMainLine) return 'bg-zinc-700'
    return 'bg-zinc-800'
  }

  const getBorderColor = () => {
    if (isPracticeStart) return 'border-green-500 border-2'
    if (isSelected) return 'border-blue-400 border-2'
    if (isMainLine) return 'border-zinc-500 border'
    return 'border-zinc-600 border'
  }

  const getTextColor = () => {
    if (isSelected) return 'text-white'
    if (color === 'white') return 'text-zinc-100'
    return 'text-zinc-300'
  }

  if (isStart) {
    return (
      <>
        <div
          className={`
            px-3 py-1.5 rounded-sm text-xs font-medium cursor-pointer
            bg-zinc-700 border border-zinc-500 text-zinc-300
            hover:bg-zinc-600 transition-colors
            ${isSelected ? 'ring-2 ring-blue-500' : ''}
          `}
        >
          ●
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className="bg-zinc-500! w-2! h-2!"
        />
      </>
    )
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="bg-zinc-500! w-2! h-2!"
      />
      <div
        className={`
          relative px-2 py-1 rounded-sm text-xs font-medium cursor-pointer
          ${getBgColor()} ${getBorderColor()} ${getTextColor()}
          hover:brightness-110 transition-all
          flex items-center gap-1 min-w-10 justify-center
        `}
      >
        {/* Move number indicator for white moves */}
        {color === 'white' && !isStart && (
          <span className="text-zinc-500 text-[10px] mr-0.5">{moveNumber}.</span>
        )}

        {/* Move notation */}
        <span className={isMainLine ? 'font-semibold' : 'font-normal'}>
          {san}
        </span>

        {/* NAG annotation */}
        {nagString && (
          <span className="text-yellow-400 text-[10px]">{nagString}</span>
        )}

        {/* Indicators */}
        <div className="absolute -top-1 -right-1 flex gap-0.5">
          {isPracticeStart && (
            <div className="bg-green-500 rounded-full p-0.5" title="Practice starts here">
              <Flag className="h-2 w-2 text-white" />
            </div>
          )}
          {hasComment && (
            <div className="bg-blue-500 rounded-full p-0.5" title="Has comment">
              <MessageSquare className="h-2 w-2 text-white" />
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="bg-zinc-500! w-2! h-2!"
      />
    </>
  )
})
