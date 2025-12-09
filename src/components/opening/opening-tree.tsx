import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type ReactFlowInstance,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { OpeningMoveNode } from '@/types/opening'
import { MoveTreeNode } from './opening-tree-node'
import { treeToFlow, layoutTree, getTreeStats, type MoveNode, type MoveNodeData } from './opening-tree-utils'
import { Flag, Trash2, ArrowUpRight, Copy, MessageSquare } from 'lucide-react'
import { isOnLinearTrunk } from '@/lib/opening-utils'

interface OpeningTreeProps {
  moves: OpeningMoveNode[]
  currentPath: string[]
  onNodeClick: (nodeId: string) => void
  onSetPracticeStart?: (nodeId: string) => void
  onDeleteVariation?: (nodeId: string) => void
  onPromoteToMain?: (nodeId: string) => void
  onUpdateComment?: (nodeId: string, comment: string) => void
  onToggleNag?: (nodeId: string, nag: string) => void
  startColor?: 'white' | 'black'
  practiceStartNodeId?: string
  getNodeData?: (nodeId: string) => OpeningMoveNode | undefined
}

const nodeTypes = {
  move: MoveTreeNode,
}

// NAG buttons configuration
const nagButtons = [
  { nag: '$1', symbol: '!', label: 'Good move' },
  { nag: '$2', symbol: '?', label: 'Poor move' },
  { nag: '$3', symbol: '!!', label: 'Brilliant' },
  { nag: '$4', symbol: '??', label: 'Blunder' },
  { nag: '$6', symbol: '?!', label: 'Dubious' },
]

export function OpeningTree({
  moves,
  currentPath,
  onNodeClick,
  onSetPracticeStart,
  onDeleteVariation,
  onPromoteToMain,
  onUpdateComment,
  onToggleNag,
  startColor = 'white',
  practiceStartNodeId,
  getNodeData,
}: OpeningTreeProps) {
  const reactFlowInstance = useRef<ReactFlowInstance<MoveNode> | null>(null)
  const [contextNode, setContextNode] = useState<MoveNode | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [commentText, setCommentText] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)

  // Convert tree to flow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const { nodes, edges } = treeToFlow(moves, currentPath, practiceStartNodeId, startColor)
    const layoutedNodes = layoutTree(nodes, edges, 'LR')
    return { nodes: layoutedNodes, edges }
  }, [moves, currentPath, practiceStartNodeId, startColor])

  const [nodes, setNodes, onNodesChange] = useNodesState<MoveNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes/edges when tree changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = treeToFlow(
      moves,
      currentPath,
      practiceStartNodeId,
      startColor
    )
    const layoutedNodes = layoutTree(newNodes, newEdges, 'LR')
    setNodes(layoutedNodes as MoveNode[])
    setEdges(newEdges)
  }, [moves, currentPath, practiceStartNodeId, startColor, setNodes, setEdges])

  // Fit view when nodes change significantly
  useEffect(() => {
    if (reactFlowInstance.current && nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2, duration: 200 })
      }, 50)
    }
  }, [nodes.length])

  // Center on selected node when path changes
  useEffect(() => {
    if (!reactFlowInstance.current || currentPath.length === 0) return

    const selectedNodeId = currentPath[currentPath.length - 1]
    const selectedNode = nodes.find((n) => n.id === selectedNodeId)

    if (selectedNode) {
      setTimeout(() => {
        reactFlowInstance.current?.setCenter(
          selectedNode.position.x + 28,
          selectedNode.position.y + 16,
          { duration: 200, zoom: reactFlowInstance.current?.getZoom() }
        )
      }, 50)
    }
  }, [currentPath, nodes])

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id === 'start') {
        onNodeClick('start')
      } else {
        onNodeClick(node.id)
      }
    },
    [onNodeClick]
  )

  // Handle context menu
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      if (node.id === 'start') return

      const originalNode = getNodeData?.(node.id)
      setCommentText(originalNode?.comment || '')
      setShowCommentInput(false)
      setContextNode(node as MoveNode)
      setContextMenuPos({ x: event.clientX, y: event.clientY })
    },
    [getNodeData]
  )

  const closeContextMenu = useCallback(() => {
    setContextNode(null)
    setContextMenuPos(null)
    setShowCommentInput(false)
  }, [])

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenuPos) return

    const handleClick = (e: MouseEvent) => {
      // Don't close if clicking inside the context menu
      const target = e.target as HTMLElement
      if (target.closest('[data-context-menu]')) return
      closeContextMenu()
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }

    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenuPos, closeContextMenu])

  // Tree stats
  const stats = useMemo(() => getTreeStats(moves), [moves])

  // Context menu actions
  const handleSetPracticeStart = useCallback(() => {
    if (contextNode && onSetPracticeStart) {
      onSetPracticeStart(contextNode.id)
    }
    closeContextMenu()
  }, [contextNode, onSetPracticeStart, closeContextMenu])

  const handleDeleteVariation = useCallback(() => {
    if (contextNode && onDeleteVariation) {
      onDeleteVariation(contextNode.id)
    }
    closeContextMenu()
  }, [contextNode, onDeleteVariation, closeContextMenu])

  const handlePromoteToMain = useCallback(() => {
    if (contextNode && onPromoteToMain) {
      onPromoteToMain(contextNode.id)
    }
    closeContextMenu()
  }, [contextNode, onPromoteToMain, closeContextMenu])

  const handleCopyFen = useCallback(() => {
    if (contextNode?.data.fen) {
      navigator.clipboard.writeText(contextNode.data.fen)
    }
    closeContextMenu()
  }, [contextNode, closeContextMenu])

  const handleToggleNag = useCallback((nag: string) => {
    if (contextNode && onToggleNag) {
      onToggleNag(contextNode.id, nag)
    }
  }, [contextNode, onToggleNag])

  const handleSaveComment = useCallback(() => {
    if (contextNode && onUpdateComment) {
      onUpdateComment(contextNode.id, commentText)
    }
    closeContextMenu()
  }, [contextNode, commentText, onUpdateComment, closeContextMenu])

  // Get current NAGs for the context node
  const currentNags = contextNode ? (getNodeData?.(contextNode.id)?.nags || []) : []

  return (
    <div className="relative w-full h-full">
      {/* Stats bar */}
      <div className="absolute top-2 left-2 z-10 flex gap-3 text-xs text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded">
        <span>{stats.totalMoves} moves</span>
        <span>{stats.variations} variations</span>
        <span>depth {stats.maxDepth}</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onInit={(instance) => {
          reactFlowInstance.current = instance
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        selectionOnDrag={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-900"
      >
        <Background color="#3f3f46" gap={16} size={1} />
        <Controls
          showInteractive={false}
          className="bg-zinc-800! border-zinc-700! shadow-lg! [&>button]:bg-zinc-700! [&>button]:border-zinc-600! [&>button]:hover:bg-zinc-600! [&>button>svg]:fill-zinc-300!"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as MoveNodeData
            if (data.isSelected) return '#2563eb'
            if (data.isInPath) return '#52525b'
            if (data.isMainLine) return '#3f3f46'
            return '#27272a'
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="bg-zinc-800! border-zinc-700!"
        />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenuPos && contextNode && (
        <div
          data-context-menu
          className="fixed z-50 min-w-56 rounded-md border border-zinc-700 bg-zinc-800 p-1 text-zinc-100 shadow-lg"
          style={{
            left: Math.min(contextMenuPos.x, window.innerWidth - 240),
            top: Math.min(contextMenuPos.y, window.innerHeight - 400)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Move name header */}
          <div className="px-2 py-1.5 text-xs text-zinc-400 border-b border-zinc-700 mb-1">
            Move: <span className="text-blue-400 font-medium">{contextNode.data.san}</span>
          </div>

          {/* NAG Buttons - available for all moves */}
          {onToggleNag && (
            <div className="px-2 py-1.5 border-b border-zinc-700 mb-1">
              <span className="text-xs text-zinc-500 mb-1.5 block">Evaluation</span>
              <div className="flex flex-wrap gap-1">
                {nagButtons.map(({ nag, symbol, label }) => {
                  const isActive = currentNags.includes(nag)
                  return (
                    <button
                      key={nag}
                      onClick={() => handleToggleNag(nag)}
                      title={label}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${isActive
                        ? 'bg-yellow-500 text-black'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        }`}
                    >
                      {symbol}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Comment section - only for user moves */}
          {onUpdateComment && contextNode.data.color === startColor && (
            <div className="px-2 py-1.5 border-b border-zinc-700 mb-1">
              {!showCommentInput ? (
                <button
                  onClick={() => setShowCommentInput(true)}
                  className="w-full flex items-center rounded-sm px-1 py-1 text-sm hover:bg-zinc-700 transition-colors"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {commentText ? 'Edit comment' : 'Add comment'}
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    autoFocus
                    className="w-full rounded bg-zinc-700 border border-zinc-600 py-1.5 px-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSaveComment}
                      className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowCommentInput(false)}
                      className="flex-1 rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {(contextNode.data.isPracticeStart || isOnLinearTrunk(moves, contextNode.id)) && (
            <button
              onClick={handleSetPracticeStart}
              className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-700 transition-colors"
            >
              <Flag className="h-4 w-4 mr-2" />
              {contextNode.data.isPracticeStart ? 'Clear entry point' : 'Set as entry point'}
            </button>
          )}

          {!contextNode.data.isMainLine && (
            <button
              onClick={handlePromoteToMain}
              className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-700 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Promote to main line
            </button>
          )}

          <button
            onClick={handleCopyFen}
            className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-700 transition-colors"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy FEN
          </button>

          <div className="-mx-1 my-1 h-px bg-zinc-700" />

          <button
            onClick={handleDeleteVariation}
            className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete move
          </button>
        </div>
      )}
    </div>
  )
}
