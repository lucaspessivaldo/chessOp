import { useCallback, useMemo, useReducer } from 'react'
import type { OpeningMoveNode, OpeningStudy } from '@/types/opening'
import { addChildNode, getNodeAtPath, INITIAL_FEN } from '@/lib/opening-utils'

interface Snapshot {
  moves: OpeningMoveNode[]
  practiceStartNodeId?: string
}

interface EditorState extends Snapshot {
  /** Node ids from the root to the selected move ([] = starting position) */
  path: string[]
  past: Snapshot[]
  future: Snapshot[]
}

type EditorAction =
  | { type: 'navigate'; path: string[] }
  | { type: 'play'; node: OpeningMoveNode }
  | { type: 'commit'; moves: OpeningMoveNode[]; practiceStartNodeId?: string | null; path?: string[] }
  | { type: 'undo' }
  | { type: 'redo' }

const HISTORY_LIMIT = 100

/** Longest prefix of `path` that still exists in `moves` */
function validPath(moves: OpeningMoveNode[], path: string[]): string[] {
  const result: string[] = []
  let level = moves
  for (const id of path) {
    const node = level.find(n => n.id === id)
    if (!node) break
    result.push(id)
    level = node.children
  }
  return result
}

function snapshot(state: EditorState): Snapshot {
  return { moves: state.moves, practiceStartNodeId: state.practiceStartNodeId }
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'navigate':
      return { ...state, path: validPath(state.moves, action.path) }

    case 'play': {
      const parent = state.path.length > 0 ? getNodeAtPath(state.moves, state.path) : null
      const siblings = parent ? parent.children : state.moves
      const existing = siblings.find(n => n.uci === action.node.uci)
      if (existing) return { ...state, path: [...state.path, existing.id] }

      const node = { ...action.node, isMainLine: siblings.length === 0 }
      return {
        ...state,
        moves: addChildNode(state.moves, parent?.id ?? null, node),
        path: [...state.path, node.id],
        past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
        future: [],
      }
    }

    case 'commit': {
      const practiceStartNodeId = action.practiceStartNodeId === undefined
        ? state.practiceStartNodeId
        : action.practiceStartNodeId ?? undefined
      return {
        ...state,
        moves: action.moves,
        practiceStartNodeId,
        path: validPath(action.moves, action.path ?? state.path),
        past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
        future: [],
      }
    }

    case 'undo': {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return {
        ...previous,
        path: validPath(previous.moves, state.path),
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future],
      }
    }

    case 'redo': {
      const next = state.future[0]
      if (!next) return state
      return {
        ...next,
        path: validPath(next.moves, state.path),
        past: [...state.past, snapshot(state)],
        future: state.future.slice(1),
      }
    }
  }
}

/**
 * Move tree editing state with full undo/redo
 */
export function useOpeningEditor(initialStudy: OpeningStudy) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    moves: initialStudy.moves,
    practiceStartNodeId: initialStudy.practiceStartNodeId,
    path: [],
    past: [],
    future: [],
  }))

  const rootFen = initialStudy.rootFen || INITIAL_FEN
  const currentNode = useMemo(
    () => (state.path.length > 0 ? getNodeAtPath(state.moves, state.path) : null),
    [state.moves, state.path]
  )
  const fen = currentNode?.fen ?? rootFen

  const navigate = useCallback((path: string[]) => dispatch({ type: 'navigate', path }), [])
  const play = useCallback((node: OpeningMoveNode) => dispatch({ type: 'play', node }), [])
  const commit = useCallback(
    (moves: OpeningMoveNode[], options: { practiceStartNodeId?: string | null; path?: string[] } = {}) =>
      dispatch({ type: 'commit', moves, ...options }),
    []
  )
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])

  return {
    moves: state.moves,
    practiceStartNodeId: state.practiceStartNodeId,
    path: state.path,
    currentNode,
    fen,
    rootFen,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    navigate,
    play,
    commit,
    undo,
    redo,
  }
}
