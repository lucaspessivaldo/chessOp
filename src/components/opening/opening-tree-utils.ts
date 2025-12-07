import type { Node, Edge } from '@xyflow/react'
import dagre from 'dagre'
import type { OpeningMoveNode } from '@/types/opening'

export interface MoveNodeData extends Record<string, unknown> {
  san: string
  uci: string
  fen: string
  isMainLine: boolean
  isPracticeStart: boolean
  isSelected: boolean
  isInPath: boolean
  moveNumber: number
  color: 'white' | 'black'
  hasComment: boolean
  nags?: string[]
}

export type MoveNode = Node<MoveNodeData, 'move'>

const NODE_WIDTH = 56
const NODE_HEIGHT = 32

/**
 * Convert opening tree to React Flow nodes and edges
 */
export function treeToFlow(
  moves: OpeningMoveNode[],
  currentPath: string[],
  practiceStartNodeId?: string,
  startColor: 'white' | 'black' = 'white'
): { nodes: MoveNode[]; edges: Edge[] } {
  const nodes: MoveNode[] = []
  const edges: Edge[] = []

  // Add start node
  nodes.push({
    id: 'start',
    type: 'move',
    position: { x: 0, y: 0 },
    data: {
      san: 'Start',
      uci: '',
      fen: '',
      isMainLine: true,
      isPracticeStart: false,
      isSelected: currentPath.length === 0,
      isInPath: true,
      moveNumber: 0,
      color: startColor,
      hasComment: false,
    },
  })

  function traverse(
    node: OpeningMoveNode,
    parentId: string,
    depth: number,
    isWhiteToMove: boolean,
    moveNum: number
  ) {
    const isInPath = currentPath.includes(node.id)
    const isSelected = currentPath[currentPath.length - 1] === node.id

    nodes.push({
      id: node.id,
      type: 'move',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        san: node.san,
        uci: node.uci,
        fen: node.fen,
        isMainLine: node.isMainLine,
        isPracticeStart: practiceStartNodeId === node.id,
        isSelected,
        isInPath,
        moveNumber: moveNum,
        color: isWhiteToMove ? 'white' : 'black',
        hasComment: !!node.comment,
        nags: node.nags,
      },
    })

    edges.push({
      id: `${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      type: 'smoothstep',
      style: {
        stroke: node.isMainLine ? '#a1a1aa' : '#52525b',
        strokeWidth: node.isMainLine ? 2 : 1,
      },
      animated: isInPath,
    })

    // Process children
    const nextMoveNum = isWhiteToMove ? moveNum : moveNum + 1
    for (const child of node.children) {
      traverse(child, node.id, depth + 1, !isWhiteToMove, nextMoveNum)
    }
  }

  // Process root moves
  const isWhiteFirst = startColor === 'white'
  for (const rootNode of moves) {
    traverse(rootNode, 'start', 1, isWhiteFirst, 1)
  }

  return { nodes, edges }
}

/**
 * Apply dagre layout to nodes
 */
export function layoutTree(
  nodes: MoveNode[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
): MoveNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    nodesep: 20,
    ranksep: 40,
    marginx: 20,
    marginy: 20,
  })

  // Add nodes to graph
  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  // Add edges to graph
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  // Run layout
  dagre.layout(g)

  // Apply positions
  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    }
  })
}

/**
 * Calculate tree statistics
 */
export function getTreeStats(moves: OpeningMoveNode[]): {
  totalMoves: number
  mainLineMoves: number
  variations: number
  maxDepth: number
} {
  let totalMoves = 0
  let mainLineMoves = 0
  let variations = 0
  let maxDepth = 0

  function traverse(node: OpeningMoveNode, depth: number) {
    totalMoves++
    if (node.isMainLine) mainLineMoves++
    if (node.children.length > 1) variations += node.children.length - 1
    maxDepth = Math.max(maxDepth, depth)

    for (const child of node.children) {
      traverse(child, depth + 1)
    }
  }

  for (const root of moves) {
    traverse(root, 1)
  }

  // Count root variations
  if (moves.length > 1) {
    variations += moves.length - 1
  }

  return { totalMoves, mainLineMoves, variations, maxDepth }
}
