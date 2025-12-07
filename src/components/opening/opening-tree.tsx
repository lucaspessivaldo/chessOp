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
import { Flag, Trash2, ArrowUpRight, Copy } from 'lucide-react'

interface OpeningTreeProps {
  moves: OpeningMoveNode[]
  currentPath: string[]
  onNodeClick: (nodeId: string) => void
  onSetPracticeStart?: (nodeId: string) => void
  onDeleteVariation?: (nodeId: string) => void
  onPromoteToMain?: (nodeId: string) => void
  startColor?: 'white' | 'black'
  practiceStartNodeId?: string
}

const nodeTypes = {
  move: MoveTreeNode,
}

export function OpeningTree({
  moves,
  currentPath,
  onNodeClick,
  onSetPracticeStart,
  onDeleteVariation,
  onPromoteToMain,
  startColor = 'white',
  practiceStartNodeId,
}: OpeningTreeProps) {
  const reactFlowInstance = useRef<ReactFlowInstance<MoveNode> | null>(null)
  const [contextNode, setContextNode] = useState<MoveNode | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

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

      setContextNode(node as MoveNode)
      setContextMenuPos({ x: event.clientX, y: event.clientY })
    },
    []
  )

  const closeContextMenu = useCallback(() => {
    setContextNode(null)
    setContextMenuPos(null)
  }, [])

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenuPos) return

    const handleClick = () => closeContextMenu()
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
          className="fixed z-50 min-w-48 rounded-md border border-zinc-700 bg-zinc-800 p-1 text-zinc-100 shadow-lg"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button
            onClick={handleSetPracticeStart}
            className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-700 transition-colors"
          >
            <Flag className="h-4 w-4 mr-2" />
            {contextNode.data.isPracticeStart ? 'Clear practice start' : 'Set practice start'}
          </button>

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
