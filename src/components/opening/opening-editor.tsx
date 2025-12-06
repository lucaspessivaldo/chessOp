import { useState, useCallback, useRef } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { OpeningStudy, OpeningMoveNode } from '@/types/opening'
import { Chessground, type ChessgroundRef } from '@/components/chessground'
import { PromotionDialog, type PromotionPiece } from '@/components/promotion-dialog'
import { MoveList } from './move-list'
import {
  generateNodeId,
  updateNodeComment,
  deleteNode,
  getNodeAtPath,
  getPathToNode,
  saveOpeningStudy,
  INITIAL_FEN,
} from '@/lib/opening-utils'
import { createChess, getLegalDests, getTurnColor, toChessgroundFen, isCheck } from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'
import { Save, Trash2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface OpeningEditorProps {
  initialStudy?: OpeningStudy
  onSave: (study: OpeningStudy) => void
  onCancel: () => void
}

interface PendingPromotion {
  from: Key
  to: Key
}

export function OpeningEditor({ initialStudy, onSave, onCancel }: OpeningEditorProps) {
  const chessgroundRef = useRef<ChessgroundRef>(null)

  // Study metadata
  const [name, setName] = useState(initialStudy?.name || '')
  const [description, setDescription] = useState(initialStudy?.description || '')
  const [color, setColor] = useState<'white' | 'black'>(initialStudy?.color || 'white')

  // Move tree
  const [moves, setMoves] = useState<OpeningMoveNode[]>(initialStudy?.moves || [])
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const currentPathRef = useRef<string[]>([])

  // Keep ref in sync with state
  currentPathRef.current = currentPath

  // Chess state
  const chessRef = useRef<Chess>(createChess(INITIAL_FEN))
  const [fen, setFen] = useState(INITIAL_FEN)
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>()
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  // Comment editing
  const [editingComment, setEditingComment] = useState(false)
  const [commentText, setCommentText] = useState('')

  // Get current node
  const currentNode = currentPath.length > 0 ? getNodeAtPath(moves, currentPath) : null

  // Sync chess instance with current position
  const syncChess = useCallback((targetFen: string) => {
    chessRef.current = createChess(targetFen)
    setFen(targetFen)
  }, [])

  // Legal destinations
  const legalDests = getLegalDests(chessRef.current)
  const turnColor = getTurnColor(chessRef.current)
  const inCheck = isCheck(chessRef.current)

  // Handle making a move
  const executeMove = useCallback((from: Key, to: Key, promotion?: PromotionPiece) => {
    const chess = chessRef.current
    const move = chess.move({ from: from as Square, to: to as Square, promotion })

    if (!move) return false

    const newFen = toChessgroundFen(chess)
    const uci = `${from}${to}${promotion || ''}`

    // Update FEN state immediately so the board reflects the new position
    setFen(newFen)

    // Use ref to get the latest path (avoids stale closure issues)
    const latestPath = currentPathRef.current

    // Get parent node from current moves state
    setMoves(prevMoves => {
      const parentNode = latestPath.length > 0 ? getNodeAtPath(prevMoves, latestPath) : null
      const existingMoves = latestPath.length === 0 ? prevMoves : (parentNode?.children || [])
      const existingMove = existingMoves.find(m => m.uci === uci)

      if (existingMove) {
        // Move exists, just navigate to it (update path via ref and state)
        const newPath = [...latestPath, existingMove.id]
        currentPathRef.current = newPath
        setCurrentPath(newPath)
        setLastMove([from, to])
        return prevMoves // No change to moves
      }

      // New move, add to tree
      // A move is main line if:
      // 1. It's the first move at root level (no siblings), OR
      // 2. It's the first child of a parent that is itself main line
      const isFirstMoveAtPosition = existingMoves.length === 0
      const parentIsMainLine = parentNode?.isMainLine ?? true // Root level counts as main line
      const shouldBeMainLine = isFirstMoveAtPosition && parentIsMainLine

      const newNode: OpeningMoveNode = {
        id: generateNodeId(),
        san: move.san,
        uci,
        fen: newFen,
        children: [],
        isMainLine: shouldBeMainLine,
      }

      const parentId = latestPath.length > 0 ? latestPath[latestPath.length - 1] : null

      // Update path to include new node
      const newPath = [...latestPath, newNode.id]
      currentPathRef.current = newPath
      setCurrentPath(newPath)
      setLastMove([from, to])

      // Add the node to the tree
      if (parentId !== null) {
        const addToParent = (nodes: OpeningMoveNode[]): OpeningMoveNode[] => {
          return nodes.map(node => {
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
        return addToParent(prevMoves)
      } else {
        return [...prevMoves, newNode]
      }
    })

    // Play sound
    const soundType = getMoveSound({
      isCapture: !!move.captured,
      isCastle: move.san === 'O-O' || move.san === 'O-O-O',
      isCheck: isCheck(chess),
      isPromotion: !!move.promotion,
    })
    playSound(soundType)

    return true
  }, []) // No dependencies needed since we use refs

  // Check if move is promotion
  const isPromotionMove = useCallback((from: Key, to: Key): boolean => {
    const piece = chessRef.current.get(from as Square)
    if (!piece || piece.type !== 'p') return false
    const toRank = to[1]
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')
  }, [])

  // Handle move from board
  const handleMove = useCallback((from: Key, to: Key) => {
    if (isPromotionMove(from, to)) {
      setPendingPromotion({ from, to })
      return
    }
    executeMove(from, to)
  }, [isPromotionMove, executeMove])

  // Complete promotion
  const completePromotion = useCallback((piece: PromotionPiece) => {
    if (!pendingPromotion) return
    executeMove(pendingPromotion.from, pendingPromotion.to, piece)
    setPendingPromotion(null)
  }, [pendingPromotion, executeMove])

  // Cancel promotion
  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
  }, [])

  // Navigation - update both ref and state for consistency
  const goToPreviousMove = useCallback(() => {
    const path = currentPathRef.current
    if (path.length === 0) return
    const newPath = path.slice(0, -1)
    currentPathRef.current = newPath
    setCurrentPath(newPath)
    setMoves(currentMoves => {
      const node = newPath.length > 0 ? getNodeAtPath(currentMoves, newPath) : null
      syncChess(node?.fen || INITIAL_FEN)
      return currentMoves
    })
    setLastMove(undefined)
  }, [syncChess])

  const goToNextMove = useCallback(() => {
    const path = currentPathRef.current
    setMoves(currentMoves => {
      const node = path.length > 0 ? getNodeAtPath(currentMoves, path) : null
      const children = node?.children || (path.length === 0 ? currentMoves : [])
      if (children.length === 0) return currentMoves
      const nextNode = children[0]
      const newPath = [...path, nextNode.id]
      currentPathRef.current = newPath
      setCurrentPath(newPath)
      syncChess(nextNode.fen)
      const from = nextNode.uci.slice(0, 2) as Key
      const to = nextNode.uci.slice(2, 4) as Key
      setLastMove([from, to])
      return currentMoves
    })
  }, [syncChess])

  const goToStart = useCallback(() => {
    currentPathRef.current = []
    setCurrentPath([])
    syncChess(INITIAL_FEN)
    setLastMove(undefined)
  }, [syncChess])

  const goToNode = useCallback((nodeId: string) => {
    setMoves(currentMoves => {
      const path = getPathToNode(currentMoves, nodeId)
      if (path.length > 0) {
        currentPathRef.current = path
        setCurrentPath(path)
        const node = getNodeAtPath(currentMoves, path)
        if (node) {
          syncChess(node.fen)
          const from = node.uci.slice(0, 2) as Key
          const to = node.uci.slice(2, 4) as Key
          setLastMove([from, to])
        }
      }
      return currentMoves
    })
  }, [syncChess])

  // Delete current move and all descendants
  const deleteCurrentMove = useCallback(() => {
    if (!currentNode) return
    if (!confirm('Delete this move and all its continuations?')) return

    setMoves(prev => deleteNode(prev, currentNode.id))
    goToPreviousMove()
  }, [currentNode, goToPreviousMove])

  // Save comment for current move
  const saveComment = useCallback(() => {
    if (!currentNode) return
    setMoves(prev => updateNodeComment(prev, currentNode.id, commentText || undefined))
    setEditingComment(false)
  }, [currentNode, commentText])

  // Start editing comment
  const startEditComment = useCallback(() => {
    setCommentText(currentNode?.comment || '')
    setEditingComment(true)
  }, [currentNode])

  // Save the study
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      alert('Please enter a name for the opening study')
      return
    }

    const study: OpeningStudy = {
      id: initialStudy?.id || generateNodeId(),
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      rootFen: INITIAL_FEN,
      moves,
      createdAt: initialStudy?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }

    saveOpeningStudy(study)
    onSave(study)
  }, [name, description, color, moves, initialStudy, onSave])

  // Chessground config
  const config: Config = {
    fen,
    orientation: color,
    turnColor,
    lastMove,
    check: inCheck,
    movable: {
      free: false,
      color: turnColor,
      dests: legalDests,
      showDests: true,
    },
    premovable: { enabled: false },
    animation: { enabled: true, duration: 200 },
  }

  return (
    <div className="flex min-h-screen bg-zinc-900 p-6">
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={turnColor}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      <div className="mx-auto flex items-start gap-8">
        {/* Chessboard */}
        <div className="h-[500px] w-[500px] shrink-0 rounded-sm">
          <Chessground ref={chessgroundRef} config={config} onMove={handleMove} />
        </div>

        {/* Editor Panel */}
        <div className="w-[400px] space-y-4">
          {/* Study Info */}
          <div className="rounded-lg bg-zinc-800 p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Opening Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Sicilian Repertoire"
                className="w-full rounded-md bg-zinc-700 border border-zinc-600 py-2 px-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="w-full rounded-md bg-zinc-700 border border-zinc-600 py-2 px-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Playing as
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setColor('white')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${color === 'white'
                    ? 'bg-zinc-200 text-zinc-900'
                    : 'bg-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                >
                  White
                </button>
                <button
                  onClick={() => setColor('black')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${color === 'black'
                    ? 'bg-zinc-900 text-white border border-zinc-600'
                    : 'bg-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                >
                  Black
                </button>
              </div>
            </div>
          </div>

          {/* Move List */}
          <div className="rounded-lg bg-zinc-800 p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Moves</h3>
            <div className="max-h-[200px] overflow-y-auto">
              <MoveList
                moves={moves}
                currentPath={currentPath}
                onMoveClick={goToNode}
              />
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex gap-2">
            <button
              onClick={goToStart}
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Start
            </button>
            <button
              onClick={goToPreviousMove}
              disabled={currentPath.length === 0}
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={goToNextMove}
              disabled={!currentNode?.children.length && (currentPath.length === 0 ? moves.length === 0 : true)}
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Comment Editor */}
          {currentNode && (
            <div className="rounded-lg bg-zinc-800 p-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">
                Comment for {currentNode.san}
              </h3>
              {editingComment ? (
                <div className="space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add commentary for this move..."
                    rows={3}
                    className="w-full rounded-md bg-zinc-700 border border-zinc-600 py-2 px-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveComment}
                      className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingComment(false)}
                      className="flex-1 rounded-md bg-zinc-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {currentNode.comment ? (
                    <p className="text-sm text-zinc-300 mb-2">{currentNode.comment}</p>
                  ) : (
                    <p className="text-sm text-zinc-500 italic mb-2">No comment</p>
                  )}
                  <button
                    onClick={startEditComment}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {currentNode.comment ? 'Edit comment' : 'Add comment'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete Move */}
          {currentNode && (
            <button
              onClick={deleteCurrentMove}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-red-600/20 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-600/30 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete this move
            </button>
          )}

          {/* Save/Cancel */}
          <div className="flex gap-3 pt-4 border-t border-zinc-700">
            <button
              onClick={onCancel}
              className="flex-1 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Opening
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
