import { Chess } from '@jackstenglein/chess'
import type { Move as ChessMove } from '@jackstenglein/chess'
import type { OpeningMoveNode, OpeningStudy, BoardShape } from '@/types/opening'
import { NAG_SYMBOLS } from '@/types/opening'
import { readJson, writeJson } from '@/lib/storage'
import { shapesFromPgn, shapesToPgn } from '@/lib/board-shapes'

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
 * Ply (half-move) count of a FEN: 0 for the initial position, 1 after 1.e4, ...
 */
export function fenPly(fen: string): number {
  const parts = fen.split(' ')
  const turn = parts[1] === 'b' ? 1 : 0
  const fullMove = parseInt(parts[5] ?? '1', 10) || 1
  return (fullMove - 1) * 2 + turn
}

/**
 * Convert a Chess.js move to UCI format
 */
function moveToUci(move: ChessMove): string {
  return move.from + move.to + (move.promotion ?? '')
}

/**
 * Result of parsing a PGN into an opening tree
 */
export interface ParsedPgn {
  moves: OpeningMoveNode[]
  headers: Record<string, string>
}

/**
 * Parse a PGN string (with variations, comments and NAGs) into an opening tree.
 * Throws an Error with a friendly message when the PGN is invalid.
 */
export function parsePgn(pgn: string): ParsedPgn {
  const chess = new Chess()

  try {
    chess.loadPgn(pgn.trim())
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(`Could not read this PGN: ${detail}`)
  }

  const headers = chess.header().valueMap()

  if (chess.setUpFen() !== INITIAL_FEN) {
    throw new Error('Only PGNs starting from the initial position are supported.')
  }

  function buildNode(move: ChessMove, isMainLine: boolean): OpeningMoveNode {
    return {
      id: generateNodeId(),
      san: move.san,
      uci: moveToUci(move),
      fen: move.after,
      comment: move.commentAfter?.trim() || undefined,
      nags: move.nags && move.nags.length > 0 ? [...move.nags] : undefined,
      shapes: shapesFromPgn(move.commentDiag?.colorArrows, move.commentDiag?.colorFields),
      children: buildSiblings(move.next, isMainLine),
      isMainLine,
    }
  }

  // `move.variations` holds the alternatives to `move` itself (its siblings)
  function buildSiblings(first: ChessMove | null, parentIsMain: boolean): OpeningMoveNode[] {
    if (!first) return []
    const siblings = [buildNode(first, parentIsMain)]
    for (const variation of first.variations ?? []) {
      if (variation.length > 0) siblings.push(buildNode(variation[0], false))
    }
    return siblings
  }

  const moves = buildSiblings(chess.firstMove(), true)
  if (moves.length === 0) {
    throw new Error('The PGN does not contain any moves.')
  }
  return { moves, headers }
}

/**
 * Parse a PGN string into an opening tree, returning [] when invalid
 */
export function parsePgnToTree(pgn: string): OpeningMoveNode[] {
  try {
    return parsePgn(pgn).moves
  } catch (e) {
    console.error('Failed to parse PGN:', e)
    return []
  }
}

function hasComment(node: OpeningMoveNode): boolean {
  return !!node.comment || (node.shapes?.length ?? 0) > 0
}

function escapeComment(comment: string): string {
  return comment.replace(/[{}]/g, '')
}

/**
 * Export an opening tree to PGN (variations, comments, NAGs and arrows included)
 */
export function exportTreeToPgn(
  nodes: OpeningMoveNode[],
  headers: Record<string, string> = {},
  rootFen: string = INITIAL_FEN
): string {
  const startPly = fenPly(rootFen)

  function moveText(node: OpeningMoveNode, ply: number, forceNumber: boolean): string {
    const moveNumber = Math.floor(ply / 2) + 1
    const isWhite = ply % 2 === 0
    let text = isWhite ? `${moveNumber}. ${node.san}` : forceNumber ? `${moveNumber}... ${node.san}` : node.san
    for (const nag of node.nags ?? []) {
      text += nag.startsWith('$') ? ` ${nag}` : ` ${nag}`
    }
    const commands = shapesToPgn(node.shapes)
    const comment = [commands, node.comment ? escapeComment(node.comment) : ''].filter(Boolean).join(' ')
    if (comment) text += ` {${comment}}`
    return text
  }

  function renderSiblings(siblings: OpeningMoveNode[], ply: number, forceNumber: boolean): string {
    if (siblings.length === 0) return ''
    const main = siblings.find(n => n.isMainLine) ?? siblings[0]
    const variations = siblings.filter(n => n !== main)

    const parts = [moveText(main, ply, forceNumber)]
    for (const variation of variations) {
      const rest = renderSiblings(variation.children, ply + 1, hasComment(variation))
      parts.push(`(${moveText(variation, ply, true)}${rest ? ` ${rest}` : ''})`)
    }
    const continuation = renderSiblings(main.children, ply + 1, variations.length > 0 || hasComment(main))
    if (continuation) parts.push(continuation)
    return parts.join(' ')
  }

  const allHeaders: Record<string, string> = { Event: '?', Result: '*', ...headers }
  if (rootFen !== INITIAL_FEN) {
    allHeaders.SetUp = '1'
    allHeaders.FEN = rootFen
  }
  const headerText = Object.entries(allHeaders)
    .map(([key, value]) => `[${key} "${value.replace(/"/g, "'")}"]`)
    .join('\n')

  const body = renderSiblings(nodes, startPly, true)
  return `${headerText}\n\n${body ? `${body} ` : ''}*\n`
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
 * Entry points should only be allowed on the trunk.
 */
export function isOnLinearTrunk(nodes: OpeningMoveNode[], nodeId: string): boolean {
  if (nodes.length > 1) return false
  let current: OpeningMoveNode | undefined = nodes[0]

  while (current) {
    if (current.id === nodeId) return true
    if (current.children.length > 1) return false
    current = current.children[0]
  }

  return false
}

/**
 * Get all possible lines (complete paths through the tree)
 */
export function getAllLines(nodes: OpeningMoveNode[]): OpeningMoveNode[][] {
  const lines: OpeningMoveNode[][] = []

  function traverse(node: OpeningMoveNode, currentPath: OpeningMoveNode[]): void {
    const newPath = [...currentPath, node]
    if (node.children.length === 0) {
      lines.push(newPath)
    } else {
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
 * Count moves, lines and depth of a tree
 */
export function getTreeSummary(nodes: OpeningMoveNode[]): { moves: number; lines: number; depth: number } {
  let moves = 0
  let lines = 0
  let depth = 0

  function walk(list: OpeningMoveNode[], level: number) {
    for (const node of list) {
      moves++
      depth = Math.max(depth, level)
      if (node.children.length === 0) lines++
      walk(node.children, level + 1)
    }
  }
  walk(nodes, 1)
  return { moves, lines, depth }
}

/**
 * A single trainable line of a study
 */
export interface StudyLine {
  /** Stable key: the id of the last node of the line */
  key: string
  /** Nodes of the line, in order */
  nodes: OpeningMoveNode[]
  /** UCI moves of the line, in order */
  uci: string[]
  /** FEN the line starts from */
  startFen: string
  /** Whether this is the setup line leading to the entry point */
  isSetup: boolean
  /** Short human-readable name that distinguishes the line from its siblings */
  label: string
}

function toStudyLine(nodes: OpeningMoveNode[], startFen: string, isSetup: boolean): StudyLine {
  return {
    key: nodes[nodes.length - 1]?.id ?? 'empty',
    nodes,
    uci: nodes.map(n => n.uci),
    startFen,
    isSetup,
    label: '',
  }
}

/**
 * Name each line by where it leaves the main line, adding the deepest branch point
 * when that alone doesn't tell it apart from a sibling line.
 */
function labelLines(lines: StudyLine[]): StudyLine[] {
  return lines.map(line => {
    if (line.isSetup) return { ...line, label: 'Setup to entry point' }
    if (line.nodes.length === 0) return { ...line, label: 'Empty line' }

    const startPly = fenPly(line.startFen)
    const firstBranch = line.nodes.findIndex(n => !n.isMainLine)
    if (firstBranch === -1) return { ...line, label: 'Main line' }

    // Deepest point where this line separates from any other line
    let deepest = 0
    for (const other of lines) {
      if (other === line) continue
      let common = 0
      while (common < line.nodes.length && line.nodes[common]?.id === other.nodes[common]?.id) common++
      deepest = Math.max(deepest, common)
    }

    const head = formatMoves(line.nodes.slice(firstBranch), startPly + firstBranch, 3)
    if (deepest <= firstBranch + 2 || deepest >= line.nodes.length) {
      return { ...line, label: formatMoves(line.nodes.slice(firstBranch), startPly + firstBranch, 4) }
    }
    const tail = formatMoves(line.nodes.slice(deepest), startPly + deepest, 2)
    return { ...line, label: `${head.replace(/ …$/, '')} … ${tail}` }
  })
}

/**
 * Extract the trainable lines of a study.
 * With `useEntryPoint`, the moves up to the entry point become a single setup line and
 * every other line starts from the entry point position.
 */
export function extractStudyLines(study: OpeningStudy, useEntryPoint = false): StudyLine[] {
  const rootFen = study.rootFen || INITIAL_FEN
  const startNode = useEntryPoint && study.practiceStartNodeId
    ? findNodeById(study.moves, study.practiceStartNodeId)
    : null

  if (!startNode) {
    return labelLines(getAllLines(study.moves).map(nodes => toStudyLine(nodes, rootFen, false)))
  }

  const setupNodes = getPathToNode(study.moves, startNode.id)
    .map(id => findNodeById(study.moves, id))
    .filter((n): n is OpeningMoveNode => n !== null)

  const variationLines = getAllLines(startNode.children).map(nodes => toStudyLine(nodes, startNode.fen, false))
  return labelLines([toStudyLine(setupNodes, rootFen, true), ...variationLines])
}

/**
 * Get the path (array of node IDs) from root to a specific node
 */
export function getPathToNode(nodes: OpeningMoveNode[], targetId: string): string[] {
  function findPath(node: OpeningMoveNode, currentPath: string[]): string[] | null {
    const newPath = [...currentPath, node.id]
    if (node.id === targetId) return newPath

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
 * Get parent node for a given node ID (null for root-level nodes)
 */
export function getParentNode(nodes: OpeningMoveNode[], targetId: string): OpeningMoveNode | null {
  const path = getPathToNode(nodes, targetId)
  if (path.length < 2) return null
  return getNodeAtPath(nodes, path.slice(0, -1))
}

function mapNode(
  nodes: OpeningMoveNode[],
  nodeId: string,
  update: (node: OpeningMoveNode) => OpeningMoveNode
): OpeningMoveNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) return update(node)
    if (node.children.length === 0) return node
    return { ...node, children: mapNode(node.children, nodeId, update) }
  })
}

/**
 * Update a node's comment
 */
export function updateNodeComment(
  nodes: OpeningMoveNode[],
  nodeId: string,
  comment: string | undefined
): OpeningMoveNode[] {
  return mapNode(nodes, nodeId, node => ({ ...node, comment: comment?.trim() || undefined }))
}

/**
 * Update a node's NAG annotations
 */
export function updateNodeNags(
  nodes: OpeningMoveNode[],
  nodeId: string,
  nags: string[] | undefined
): OpeningMoveNode[] {
  return mapNode(nodes, nodeId, node => ({ ...node, nags: nags && nags.length > 0 ? nags : undefined }))
}

/**
 * Update a node's board shapes (arrows, circles)
 */
export function updateNodeShapes(
  nodes: OpeningMoveNode[],
  nodeId: string,
  shapes: BoardShape[] | undefined
): OpeningMoveNode[] {
  return mapNode(nodes, nodeId, node => ({ ...node, shapes: shapes && shapes.length > 0 ? shapes : undefined }))
}

/**
 * Add a child node under `parentId` (or at root level when null)
 */
export function addChildNode(
  nodes: OpeningMoveNode[],
  parentId: string | null,
  child: OpeningMoveNode
): OpeningMoveNode[] {
  if (parentId === null) return [...nodes, child]
  return mapNode(nodes, parentId, node => ({ ...node, children: [...node.children, child] }))
}

/**
 * Delete a node and all its descendants from the tree.
 * When a main line move is deleted, its first remaining sibling becomes the main line.
 */
export function deleteNode(nodes: OpeningMoveNode[], nodeId: string): OpeningMoveNode[] {
  function remove(list: OpeningMoveNode[]): OpeningMoveNode[] {
    const target = list.find(n => n.id === nodeId)
    if (target) {
      const remaining = list.filter(n => n.id !== nodeId)
      if (target.isMainLine && remaining.length > 0 && !remaining.some(n => n.isMainLine)) {
        remaining[0] = { ...remaining[0], isMainLine: true }
      }
      return remaining
    }
    return list.map(node => (node.children.length > 0 ? { ...node, children: remove(node.children) } : node))
  }

  return remove(nodes)
}

/**
 * Promote a variation to main line: it becomes the first sibling and the only main line move
 */
export function promoteToMainLine(nodes: OpeningMoveNode[], nodeId: string): OpeningMoveNode[] {
  function promote(list: OpeningMoveNode[]): OpeningMoveNode[] {
    const target = list.find(n => n.id === nodeId)
    if (target) {
      return [
        { ...target, isMainLine: true },
        ...list.filter(n => n.id !== nodeId).map(n => ({ ...n, isMainLine: false })),
      ]
    }
    return list.map(node => (node.children.length > 0 ? { ...node, children: promote(node.children) } : node))
  }

  return promote(nodes)
}

/**
 * Merge `incoming` moves into `base`, reusing nodes that already exist (same UCI at the same position)
 */
export function mergeTrees(base: OpeningMoveNode[], incoming: OpeningMoveNode[]): OpeningMoveNode[] {
  const result = [...base]
  for (const node of incoming) {
    const index = result.findIndex(n => n.uci === node.uci)
    if (index === -1) {
      result.push({ ...node, isMainLine: result.length === 0 ? node.isMainLine : false })
    } else {
      const existing = result[index]
      result[index] = {
        ...existing,
        comment: existing.comment ?? node.comment,
        nags: existing.nags ?? node.nags,
        shapes: existing.shapes ?? node.shapes,
        children: mergeTrees(existing.children, node.children),
      }
    }
  }
  return result
}

// ===== Study persistence =====

/**
 * Load all opening studies from localStorage
 */
export function loadOpeningStudies(): OpeningStudy[] {
  const studies = readJson<OpeningStudy[]>(STORAGE_KEY, [])
  return Array.isArray(studies) ? studies : []
}

/**
 * Save an opening study to localStorage. Returns false if storage is full/unavailable.
 */
export function saveOpeningStudy(study: OpeningStudy): boolean {
  const studies = loadOpeningStudies()
  const existingIndex = studies.findIndex(s => s.id === study.id)

  if (existingIndex >= 0) {
    studies[existingIndex] = { ...study, updatedAt: Date.now() }
  } else {
    studies.push(study)
  }

  return writeJson(STORAGE_KEY, studies)
}

/**
 * Delete an opening study from localStorage
 */
export function deleteOpeningStudy(id: string): void {
  writeJson(STORAGE_KEY, loadOpeningStudies().filter(s => s.id !== id))
}

/**
 * Load a single opening study by ID
 */
export function loadOpeningStudyById(id: string): OpeningStudy | null {
  return loadOpeningStudies().find(s => s.id === id) || null
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
 * Format a sequence of nodes with move numbers, e.g. "3.e5 Bf5 4.Nf3"
 */
export function formatMoves(nodes: { san: string; nags?: string[] }[], startPly: number, maxMoves = Infinity): string {
  const parts: string[] = []
  nodes.slice(0, maxMoves).forEach((node, i) => {
    const ply = startPly + i
    const nag = node.nags?.map(n => NAG_SYMBOLS[n] ?? '').join('') ?? ''
    const number = ply % 2 === 0 ? `${Math.floor(ply / 2) + 1}.` : i === 0 ? `${Math.floor(ply / 2) + 1}...` : ''
    parts.push(`${number}${node.san}${nag}`)
  })
  const text = parts.join(' ')
  return nodes.length > maxMoves ? `${text} …` : text
}

/**
 * Display name of a line
 */
export function getLineLabel(line: StudyLine): string {
  return line.label || 'Line'
}

/**
 * Create (and persist) a new study
 */
export function createStudy(data: {
  name: string
  color: 'white' | 'black'
  description?: string
  moves?: OpeningMoveNode[]
}): OpeningStudy {
  const now = Date.now()
  const study: OpeningStudy = {
    id: generateNodeId(),
    name: data.name.trim() || 'Untitled study',
    description: data.description?.trim() || undefined,
    color: data.color,
    rootFen: INITIAL_FEN,
    moves: data.moves ?? [],
    createdAt: now,
    updatedAt: now,
  }
  saveOpeningStudy(study)
  return study
}
