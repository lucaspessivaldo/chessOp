import { Chess } from '@jackstenglein/chess'
import type { Move as ChessMove } from '@jackstenglein/chess'
import type { OpeningMoveNode, OpeningStudy, BoardShape } from '@/types/opening'

const STORAGE_KEY = 'chessop-openings'

/**
 * Generate a unique ID for nodes
 */
export function generateNodeId(): string {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Initial position FEN
 */
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * Convert a Chess.js move to UCI format
 */
function moveToUci(move: ChessMove): string {
  let uci = move.from + move.to
  if (move.promotion) {
    uci += move.promotion
  }
  return uci
}

/**
 * Parse a PGN string into an opening tree structure
 * Uses @jackstenglein/chess which supports variations
 */
export function parsePgnToTree(pgn: string, startFen?: string): OpeningMoveNode[] {
  const chess = new Chess({ fen: startFen })

  try {
    chess.loadPgn(pgn)
  } catch (e) {
    console.error('Failed to parse PGN:', e)
    return []
  }

  // Get the root move (first move in the game)
  const firstMove = chess.firstMove()
  if (!firstMove) {
    return []
  }

  // Recursively build the tree from the chess moves
  function buildTree(move: ChessMove | null, isMainLine: boolean): OpeningMoveNode | null {
    if (!move) return null

    const node: OpeningMoveNode = {
      id: generateNodeId(),
      san: move.san,
      uci: moveToUci(move),
      fen: move.after,
      comment: move.commentAfter || undefined,
      nags: move.nags && move.nags.length > 0 ? [...move.nags] : undefined,
      children: [],
      isMainLine,
    }

    // Add main continuation
    const next = move.next
    if (next) {
      const nextNode = buildTree(next, isMainLine)
      if (nextNode) {
        node.children.push(nextNode)
      }
    }

    // Add variations (alternatives to the next move)
    // variations is Move[][] - each element is an array of moves representing a variation line
    if (move.variations && move.variations.length > 0) {
      for (const variationLine of move.variations) {
        if (variationLine.length > 0) {
          const varNode = buildTree(variationLine[0], false)
          if (varNode) {
            node.children.push(varNode)
          }
        }
      }
    }

    return node
  }

  // Build tree starting from first move
  const rootNode = buildTree(firstMove, true)
  if (!rootNode) {
    return []
  }

  // Handle variations at the first move level
  const result: OpeningMoveNode[] = [rootNode]

  // Check for variations on the first move itself
  if (firstMove.variations && firstMove.variations.length > 0) {
    for (const variationLine of firstMove.variations) {
      if (variationLine.length > 0) {
        const varNode = buildTree(variationLine[0], false)
        if (varNode) {
          result.push(varNode)
        }
      }
    }
  }

  return result
}

/**
 * Export opening tree to PGN format
 */
export function exportTreeToPgn(nodes: OpeningMoveNode[], headers?: Record<string, string>): string {
  if (nodes.length === 0) return ''

  const chess = new Chess()

  // Set headers if provided
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      chess.setHeader(key, value)
    }
  }

  function addMovesToChess(node: OpeningMoveNode, parentMove: ChessMove | null): void {
    // Navigate to parent position
    if (parentMove) {
      chess.seek(parentMove)
    } else {
      chess.seek(null) // Go to start
    }

    // Make the move
    const move = chess.move(node.san)
    if (!move) {
      console.error('Failed to add move:', node.san)
      return
    }

    // Add comment if present
    if (node.comment) {
      chess.setComment(node.comment)
    }

    // Add NAGs if present
    if (node.nags && node.nags.length > 0) {
      chess.setNags(node.nags)
    }

    // Process children
    const mainChild = node.children.find(c => c.isMainLine)
    const variations = node.children.filter(c => !c.isMainLine)

    // Add main line continuation first
    if (mainChild) {
      addMovesToChess(mainChild, move)
    }

    // Add variations
    for (const variation of variations) {
      addMovesToChess(variation, move)
    }
  }

  // Process all root moves
  const mainRoot = nodes.find(n => n.isMainLine) || nodes[0]
  addMovesToChess(mainRoot, null)

  // Add variations at root level
  for (const node of nodes) {
    if (node !== mainRoot) {
      addMovesToChess(node, null)
    }
  }

  return chess.pgn.render()
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(nodes: OpeningMoveNode[], id: string): OpeningMoveNode | null {
  for (const node of nodes) {
    if (node.id === id) return node

    const found = findNodeById(node.children, id)
    if (found) return found
  }
  return null
}

/**
 * Check if a node is on the linear trunk (before any variations start).
 * A node is on the trunk if:
 * 1. It's part of the main line
 * 2. All ancestors have exactly one child (no branching before this node)
 * 
 * Entry points should only be allowed on the trunk.
 */
export function isOnLinearTrunk(nodes: OpeningMoveNode[], nodeId: string): boolean {
  // Walk the main line and check if we reach the node before any branching
  let current: OpeningMoveNode | undefined = nodes.find(n => n.isMainLine) || nodes[0]

  while (current) {
    // If this is the node we're looking for, it's on the trunk
    if (current.id === nodeId) {
      return true
    }

    // If there's more than one child here, we've hit a branch point
    // Any node after this (including this node's children) is not on the trunk
    if (current.children.length > 1) {
      return false
    }

    // Move to the next node (only child or main line child)
    current = current.children.find(c => c.isMainLine) || current.children[0]
  }

  return false
}

/**
 * Get the main line as a flat array of moves
 */
export function getMainLine(nodes: OpeningMoveNode[]): OpeningMoveNode[] {
  const result: OpeningMoveNode[] = []

  let current = nodes.find(n => n.isMainLine) || nodes[0]
  while (current) {
    result.push(current)
    current = current.children.find(c => c.isMainLine) || current.children[0]
    if (!current) break
  }

  return result
}

/**
 * Get all possible lines (complete paths through the tree)
 */
export function getAllLines(nodes: OpeningMoveNode[]): OpeningMoveNode[][] {
  const lines: OpeningMoveNode[][] = []

  function traverse(node: OpeningMoveNode, currentPath: OpeningMoveNode[]): void {
    const newPath = [...currentPath, node]

    if (node.children.length === 0) {
      // Leaf node - complete line
      lines.push(newPath)
    } else {
      // Continue traversing all children
      for (const child of node.children) {
        traverse(child, newPath)
      }
    }
  }

  for (const rootNode of nodes) {
    traverse(rootNode, [])
  }

  return lines
}

/**
 * Get the path (array of node IDs) from root to a specific node
 */
export function getPathToNode(nodes: OpeningMoveNode[], targetId: string): string[] {
  function findPath(node: OpeningMoveNode, currentPath: string[]): string[] | null {
    const newPath = [...currentPath, node.id]

    if (node.id === targetId) {
      return newPath
    }

    for (const child of node.children) {
      const found = findPath(child, newPath)
      if (found) return found
    }

    return null
  }

  for (const rootNode of nodes) {
    const path = findPath(rootNode, [])
    if (path) return path
  }

  return []
}

/**
 * Get node at a specific path
 */
export function getNodeAtPath(nodes: OpeningMoveNode[], path: string[]): OpeningMoveNode | null {
  if (path.length === 0) return null

  let currentNodes = nodes
  let result: OpeningMoveNode | null = null

  for (const id of path) {
    const found = currentNodes.find(n => n.id === id)
    if (!found) return null
    result = found
    currentNodes = found.children
  }

  return result
}

/**
 * Get parent node for a given node ID
 */
export function getParentNode(nodes: OpeningMoveNode[], targetId: string): OpeningMoveNode | null {
  function findParent(node: OpeningMoveNode, parent: OpeningMoveNode | null): OpeningMoveNode | null {
    if (node.id === targetId) {
      return parent
    }

    for (const child of node.children) {
      const found = findParent(child, node)
      if (found !== undefined) return found
    }

    return null
  }

  for (const rootNode of nodes) {
    if (rootNode.id === targetId) return null // Root has no parent
    const parent = findParent(rootNode, null)
    if (parent) return parent
  }

  return null
}

/**
 * Get the line (path of nodes) from root to a given node
 */
export function getLineToNode(nodes: OpeningMoveNode[], targetId: string): OpeningMoveNode[] {
  const path = getPathToNode(nodes, targetId)
  return path.map(id => findNodeById(nodes, id)).filter((n): n is OpeningMoveNode => n !== null)
}

/**
 * Add a move to the tree at a specific position
 */
export function addMoveToTree(
  nodes: OpeningMoveNode[],
  parentId: string | null,
  san: string,
  uci: string,
  fen: string,
  isMainLine: boolean = false
): OpeningMoveNode[] {
  const newNode: OpeningMoveNode = {
    id: generateNodeId(),
    san,
    uci,
    fen,
    children: [],
    isMainLine,
  }

  if (parentId === null) {
    // Adding to root level
    return [...nodes, newNode]
  }

  // Deep clone and add to parent
  function addToParent(nodeList: OpeningMoveNode[]): OpeningMoveNode[] {
    return nodeList.map(node => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...node.children, newNode],
        }
      }
      return {
        ...node,
        children: addToParent(node.children),
      }
    })
  }

  return addToParent(nodes)
}

/**
 * Update a node's comment
 */
export function updateNodeComment(
  nodes: OpeningMoveNode[],
  nodeId: string,
  comment: string | undefined
): OpeningMoveNode[] {
  function update(nodeList: OpeningMoveNode[]): OpeningMoveNode[] {
    return nodeList.map(node => {
      if (node.id === nodeId) {
        return { ...node, comment }
      }
      return {
        ...node,
        children: update(node.children),
      }
    })
  }

  return update(nodes)
}

/**
 * Delete a node and all its descendants from the tree
 */
export function deleteNode(nodes: OpeningMoveNode[], nodeId: string): OpeningMoveNode[] {
  function remove(nodeList: OpeningMoveNode[]): OpeningMoveNode[] {
    return nodeList
      .filter(node => node.id !== nodeId)
      .map(node => ({
        ...node,
        children: remove(node.children),
      }))
  }

  return remove(nodes)
}

/**
 * Save an opening study to localStorage
 */
export function saveOpeningStudy(study: OpeningStudy): void {
  const studies = loadOpeningStudies()
  const existingIndex = studies.findIndex(s => s.id === study.id)

  if (existingIndex >= 0) {
    studies[existingIndex] = { ...study, updatedAt: Date.now() }
  } else {
    studies.push(study)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(studies))
}

/**
 * Load all opening studies from localStorage
 */
export function loadOpeningStudies(): OpeningStudy[] {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []

  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Delete an opening study from localStorage
 */
export function deleteOpeningStudy(id: string): void {
  const studies = loadOpeningStudies()
  const filtered = studies.filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * Get FEN at a specific position in the tree
 * If path is empty, returns the root FEN
 */
export function getFenAtPath(nodes: OpeningMoveNode[], path: string[], rootFen: string): string {
  if (path.length === 0) return rootFen

  const node = getNodeAtPath(nodes, path)
  return node?.fen || rootFen
}

/**
 * Check if a move exists as a child of the current position
 */
export function findChildByMove(
  nodes: OpeningMoveNode[],
  parentPath: string[],
  uci: string
): OpeningMoveNode | null {
  if (parentPath.length === 0) {
    // Looking at root level
    return nodes.find(n => n.uci === uci) || null
  }

  const parent = getNodeAtPath(nodes, parentPath)
  if (!parent) return null

  return parent.children.find(c => c.uci === uci) || null
}

/**
 * Get siblings (alternative moves) at a position
 */
export function getSiblings(nodes: OpeningMoveNode[], nodeId: string): OpeningMoveNode[] {
  const parent = getParentNode(nodes, nodeId)

  if (!parent) {
    // Node is at root level
    return nodes.filter(n => n.id !== nodeId)
  }

  return parent.children.filter(c => c.id !== nodeId)
}

/**
 * Update a node's NAG annotations
 */
export function updateNodeNags(
  nodes: OpeningMoveNode[],
  nodeId: string,
  nags: string[] | undefined
): OpeningMoveNode[] {
  function update(nodeList: OpeningMoveNode[]): OpeningMoveNode[] {
    return nodeList.map(node => {
      if (node.id === nodeId) {
        return { ...node, nags }
      }
      return {
        ...node,
        children: update(node.children),
      }
    })
  }

  return update(nodes)
}

/**
 * Update a node's board shapes (arrows, circles)
 */
export function updateNodeShapes(
  nodes: OpeningMoveNode[],
  nodeId: string,
  shapes: BoardShape[] | undefined
): OpeningMoveNode[] {
  function update(nodeList: OpeningMoveNode[]): OpeningMoveNode[] {
    return nodeList.map(node => {
      if (node.id === nodeId) {
        return { ...node, shapes: shapes && shapes.length > 0 ? shapes : undefined }
      }
      return {
        ...node,
        children: update(node.children),
      }
    })
  }

  return update(nodes)
}

/**
 * Promote a variation to main line (swap isMainLine flags)
 */
export function promoteToMainLine(
  nodes: OpeningMoveNode[],
  nodeId: string
): OpeningMoveNode[] {
  const node = findNodeById(nodes, nodeId)
  if (!node || node.isMainLine) return nodes

  const parent = getParentNode(nodes, nodeId)

  function updateNode(nodeList: OpeningMoveNode[], parentId: string | null): OpeningMoveNode[] {
    return nodeList.map(n => {
      if (parentId === null && nodes.includes(n)) {
        // Root level
        if (n.id === nodeId) {
          return { ...n, isMainLine: true, children: updateNode(n.children, n.id) }
        }
        if (n.isMainLine) {
          return { ...n, isMainLine: false, children: updateNode(n.children, n.id) }
        }
      }

      if (n.children.some(c => c.id === nodeId)) {
        // Parent of target node
        return {
          ...n,
          children: n.children.map(c => {
            if (c.id === nodeId) {
              return { ...c, isMainLine: true }
            }
            if (c.isMainLine) {
              return { ...c, isMainLine: false }
            }
            return c
          }),
        }
      }

      return {
        ...n,
        children: updateNode(n.children, null),
      }
    })
  }

  // Handle root level promotion
  if (!parent) {
    return nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, isMainLine: true }
      }
      if (n.isMainLine) {
        return { ...n, isMainLine: false }
      }
      return n
    })
  }

  return updateNode(nodes, null)
}

/**
 * Fisher-Yates shuffle for arrays
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Get all unique branch starting nodes (for selecting specific variations to practice)
 */
export function getBranchPoints(nodes: OpeningMoveNode[]): { node: OpeningMoveNode; depth: number }[] {
  const branchPoints: { node: OpeningMoveNode; depth: number }[] = []

  function traverse(nodeList: OpeningMoveNode[], depth: number) {
    for (const node of nodeList) {
      // A branch point is a node with multiple children (variations)
      if (node.children.length > 1) {
        branchPoints.push({ node, depth })
      }
      traverse(node.children, depth + 1)
    }
  }

  // Also consider root level if multiple starting moves
  if (nodes.length > 1) {
    nodes.forEach(n => branchPoints.push({ node: n, depth: 0 }))
  }

  traverse(nodes, 0)
  return branchPoints
}

/**
 * Filter lines to only include those starting with specific node IDs
 */
export function filterLinesByNodes(
  allLines: OpeningMoveNode[][],
  includeNodeIds: Set<string>
): OpeningMoveNode[][] {
  if (includeNodeIds.size === 0) return allLines

  return allLines.filter(line =>
    line.some(node => includeNodeIds.has(node.id))
  )
}

/**
 * Format a line name for display (first N moves)
 */
export function getLineName(line: { san: string }[], index: number, maxMoves = 4): string {
  if (line.length === 0) return `Line ${index + 1}`
  const moves = line.slice(0, maxMoves).map(m => m.san).join(' ')
  return line.length > maxMoves ? `${moves}...` : moves
}
