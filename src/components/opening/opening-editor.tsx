import { useState, useCallback, useRef, useEffect } from 'react'
import { Chess } from '@jackstenglein/chess'
import type { Square } from '@jackstenglein/chess'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { OpeningStudy, OpeningMoveNode, BoardShape } from '@/types/opening'
import { Chessground, type ChessgroundRef } from '@/components/chessground'
import { PromotionDialog, type PromotionPiece } from '@/components/promotion-dialog'
import { MoveList } from './move-list'
import { VariationExplorer } from './variation-explorer'
import { OpeningTree } from './opening-tree'
import { OpeningStatsPanel } from './opening-stats'
import { useOpeningStats } from '@/hooks/use-opening-stats'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog, AlertDialog } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  generateNodeId,
  updateNodeComment,
  updateNodeNags,
  updateNodeShapes,
  deleteNode,
  getNodeAtPath,
  getPathToNode,
  saveOpeningStudy,
  promoteToMainLine,
  findNodeById,
  isOnLinearTrunk,
  INITIAL_FEN,
} from '@/lib/opening-utils'
import { createChess, getLegalDests, getTurnColor, toChessgroundFen, isCheck, isPromotionMove as checkIsPromotionMove } from '@/chess/chess-utils'
import { createNagShape } from '@/chess/nag-shapes'
import { playSound, getMoveSound } from '@/lib/sounds'
import { Save, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Undo2, Redo2, ArrowUpRight, List, GitBranch, Flag, BarChart3, MessageSquare, Network, X, Settings } from 'lucide-react'

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
  const { addToast } = useToast()

  // Study metadata
  const [name, setName] = useState(initialStudy?.name || '')
  const [description, setDescription] = useState(initialStudy?.description || '')
  const [color, setColor] = useState<'white' | 'black'>(initialStudy?.color || 'white')

  // Move tree
  const [moves, setMoves] = useState<OpeningMoveNode[]>(initialStudy?.moves || [])
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const currentPathRef = useRef<string[]>([])

  // Practice start marker
  const [practiceStartNodeId, setPracticeStartNodeId] = useState<string | undefined>(
    initialStudy?.practiceStartNodeId
  )

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

  // Move view mode (list vs tree)
  const [moveViewMode, setMoveViewMode] = useState<'list' | 'tree'>('list')

  // Graph modal state
  const [showGraphModal, setShowGraphModal] = useState(false)

  // Stats panel toggle (kept for accordion state tracking)
  const [showStats] = useState(true)

  // Hovered explorer move (for showing arrow on board)
  const [hoveredMoveUci, setHoveredMoveUci] = useState<string | null>(null)

  // Undo/Redo history
  const [history, setHistory] = useState<OpeningMoveNode[][]>([initialStudy?.moves || []])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Dialog states
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [validationAlert, setValidationAlert] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  })

  // Get current node
  const currentNode = currentPath.length > 0 ? getNodeAtPath(moves, currentPath) : null

  // Check if the current node is a user move (user's color)
  // Depth 0 = first move (white), depth 1 = second move (black), etc.
  // If user plays white: even depths (0, 2, 4...) are user moves
  // If user plays black: odd depths (1, 3, 5...) are user moves
  const isUserMove = currentPath.length > 0 && (
    (color === 'white' && (currentPath.length - 1) % 2 === 0) ||
    (color === 'black' && (currentPath.length - 1) % 2 === 1)
  )

  // Sync comment text when current node changes
  useEffect(() => {
    setCommentText(currentNode?.comment || '')
    setEditingComment(false)
  }, [currentNode?.id])

  // Lichess opening stats
  const { stats, isLoading: statsLoading, error: statsError } = useOpeningStats(
    showStats ? fen : null,
    { enabled: showStats }
  )

  // Get repertoire moves at current position
  const repertoireMoves = currentNode?.children.map(c => c.uci) || moves.map(m => m.uci)

  // Push to history when moves change (called manually after significant changes)
  const pushToHistory = useCallback((newMoves: OpeningMoveNode[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newMoves)
      return newHistory.slice(-50) // Keep last 50 states
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setMoves(history[newIndex])
    }
  }, [historyIndex, history])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setMoves(history[newIndex])
    }
  }, [historyIndex, history])

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

  // Handle move from board
  const handleMove = useCallback((from: Key, to: Key) => {
    if (checkIsPromotionMove(chessRef.current, from, to)) {
      setPendingPromotion({ from, to })
      return
    }
    executeMove(from, to)
  }, [executeMove])

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
  const handleDeleteClick = useCallback(() => {
    if (!currentNode) return
    setDeleteConfirm(true)
  }, [currentNode])

  const confirmDeleteMove = useCallback(() => {
    if (!currentNode) return
    const newMoves = deleteNode(moves, currentNode.id)
    pushToHistory(newMoves)
    setMoves(newMoves)
    goToPreviousMove()
    setDeleteConfirm(false)
    addToast('Move deleted', 'success')
  }, [currentNode, goToPreviousMove, moves, pushToHistory, addToast])

  // Save comment for current move
  const saveComment = useCallback(() => {
    if (!currentNode) return
    const newMoves = updateNodeComment(moves, currentNode.id, commentText || undefined)
    pushToHistory(newMoves)
    setMoves(newMoves)
    setEditingComment(false)
    addToast('Comment saved', 'success')
  }, [currentNode, commentText, moves, pushToHistory, addToast])

  // Start editing comment
  const startEditComment = useCallback(() => {
    setCommentText(currentNode?.comment || '')
    setEditingComment(true)
  }, [currentNode])

  // Toggle NAG annotation for current move (single selection only)
  const toggleNag = useCallback((nag: string) => {
    if (!currentNode) return
    const currentNags = currentNode.nags || []
    const hasNag = currentNags.includes(nag)
    // If already has this NAG, remove it; otherwise replace with this NAG only
    const newNags = hasNag ? [] : [nag]
    const newMoves = updateNodeNags(moves, currentNode.id, newNags.length > 0 ? newNags : undefined)
    pushToHistory(newMoves)
    setMoves(newMoves)
  }, [currentNode, moves, pushToHistory])

  // Promote variation to main line
  const handlePromoteToMain = useCallback(() => {
    if (!currentNode || currentNode.isMainLine) return
    const newMoves = promoteToMainLine(moves, currentNode.id)
    pushToHistory(newMoves)
    setMoves(newMoves)
  }, [currentNode, moves, pushToHistory])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPreviousMove()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNextMove()
      } else if (e.key === 'Home') {
        e.preventDefault()
        goToStart()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPreviousMove, goToNextMove, goToStart, undo, redo])

  // Save the study
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      setValidationAlert({ isOpen: true, message: 'Please enter a name for the opening study' })
      return
    }

    const study: OpeningStudy = {
      id: initialStudy?.id || generateNodeId(),
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      rootFen: INITIAL_FEN,
      moves,
      practiceStartNodeId,
      createdAt: initialStudy?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }

    saveOpeningStudy(study)
    addToast('Opening study saved!', 'success')
    onSave(study)
  }, [name, description, color, moves, practiceStartNodeId, initialStudy, onSave, addToast])

  // Handle shapes change from drawable
  const handleShapesChange = useCallback((shapes: DrawShape[]) => {
    if (!currentNode) return

    // Convert to BoardShape format, filtering shapes without brush
    const boardShapes: BoardShape[] = shapes
      .filter(s => s.brush) // Only keep shapes with a brush color
      .map(s => ({
        orig: s.orig,
        dest: s.dest,
        brush: s.brush!,
      }))

    const updatedMoves = updateNodeShapes(moves, currentNode.id, boardShapes)
    pushToHistory(updatedMoves)
    setMoves(updatedMoves)
  }, [currentNode, moves, pushToHistory])

  // Convert saved shapes to drawable shapes
  const savedShapes: DrawShape[] = currentNode?.shapes?.map(s => ({
    orig: s.orig as Key,
    dest: s.dest as Key | undefined,
    brush: s.brush,
  })) ?? []

  // Create hover arrow shape if a move is being hovered in explorer
  const hoverArrowShape: DrawShape | null = hoveredMoveUci ? {
    orig: hoveredMoveUci.slice(0, 2) as Key,
    dest: hoveredMoveUci.slice(2, 4) as Key,
    brush: 'blue',
  } : null

  // Create NAG shape for current move (if it has NAGs)
  const nagShape: DrawShape | null = currentNode?.nags?.length
    ? createNagShape(currentNode.uci.slice(2, 4) as Key, currentNode.nags[0]) || null
    : null

  // Programmatic shapes (hover arrow + NAG shape)
  const autoShapes: DrawShape[] = [
    ...(hoverArrowShape ? [hoverArrowShape] : []),
    ...(nagShape ? [nagShape] : []),
  ]

  // Chessground config with drawing enabled
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
    drawable: {
      enabled: true,
      visible: true,
      defaultSnapToValidMove: true,
      shapes: savedShapes, // User-drawn shapes (can be cleared with right-click)
      autoShapes, // Programmatic shapes (hover arrow)
      onChange: handleShapesChange,
    },
  }

  // NAG buttons configuration
  const nagButtons = [
    { nag: '$1', symbol: '!', label: 'Good move' },
    { nag: '$2', symbol: '?', label: 'Poor move' },
    { nag: '$3', symbol: '!!', label: 'Brilliant' },
    { nag: '$4', symbol: '??', label: 'Blunder' },
    { nag: '$6', symbol: '?!', label: 'Dubious' },
  ]

  // Calculate move number for display
  const moveNumber = Math.floor(currentPath.length / 2) + 1
  const isBlackToMove = turnColor === 'black'

  return (
    <div className="min-h-screen bg-zinc-900 p-4">
      {/* Dialogs */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Delete Move"
        message="Delete this move and all its continuations? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteMove}
        onCancel={() => setDeleteConfirm(false)}
      />
      <AlertDialog
        isOpen={validationAlert.isOpen}
        title="Validation Error"
        message={validationAlert.message}
        variant="warning"
        onClose={() => setValidationAlert({ isOpen: false, message: '' })}
      />

      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={turnColor}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {/* Graph Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-[90vw] max-w-[1200px] h-[80vh] bg-zinc-800 rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Opening Tree Graph</h2>
              <button
                onClick={() => setShowGraphModal(false)}
                className="p-2 rounded-md hover:bg-zinc-700 transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
            <div className="flex-1">
              <OpeningTree
                moves={moves}
                currentPath={currentPath}
                onNodeClick={(nodeId) => {
                  if (nodeId === 'start') {
                    goToStart()
                  } else {
                    goToNode(nodeId)
                  }
                }}
                onSetPracticeStart={(nodeId) => {
                  if (practiceStartNodeId === nodeId) {
                    setPracticeStartNodeId(undefined)
                  } else {
                    setPracticeStartNodeId(nodeId)
                  }
                }}
                onDeleteVariation={(nodeId) => {
                  const newMoves = deleteNode(moves, nodeId)
                  pushToHistory(newMoves)
                  setMoves(newMoves)
                  if (currentPath.includes(nodeId)) {
                    const idx = currentPath.indexOf(nodeId)
                    const newPath = currentPath.slice(0, idx)
                    currentPathRef.current = newPath
                    setCurrentPath(newPath)
                    const node = newPath.length > 0 ? getNodeAtPath(newMoves, newPath) : null
                    syncChess(node?.fen || INITIAL_FEN)
                    setLastMove(undefined)
                  }
                  addToast('Move deleted', 'success')
                }}
                onPromoteToMain={(nodeId) => {
                  const newMoves = promoteToMainLine(moves, nodeId)
                  pushToHistory(newMoves)
                  setMoves(newMoves)
                }}
                onUpdateComment={(nodeId, comment) => {
                  const newMoves = updateNodeComment(moves, nodeId, comment)
                  pushToHistory(newMoves)
                  setMoves(newMoves)
                  addToast(comment ? 'Comment saved' : 'Comment removed', 'success')
                }}
                onToggleNag={(nodeId, nag) => {
                  const node = findNodeById(moves, nodeId)
                  if (!node) return
                  const currentNags = node.nags || []
                  // Single selection: if already has this NAG, remove it; otherwise replace
                  const newNags = currentNags.includes(nag) ? [] : [nag]
                  const newMoves = updateNodeNags(moves, nodeId, newNags.length > 0 ? newNags : undefined)
                  pushToHistory(newMoves)
                  setMoves(newMoves)
                }}
                getNodeData={(nodeId) => findNodeById(moves, nodeId) || undefined}
                startColor={color}
                practiceStartNodeId={practiceStartNodeId}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1100px]">
        <div className="flex gap-6">
          {/* Left Column: Board + Controls */}
          <div className="flex flex-col gap-3">
            {/* Chessboard */}
            <div className="h-[560px] w-[560px] shrink-0 rounded-sm">
              <Chessground ref={chessgroundRef} config={config} onMove={handleMove} />
            </div>

            {/* Navigation Bar */}
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-2">
              <button
                onClick={goToStart}
                className="p-2 rounded-md hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
                title="Go to start"
              >
                <ChevronsLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToPreviousMove}
                disabled={currentPath.length === 0}
                className="p-2 rounded-md hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous move (←)"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNextMove}
                disabled={!currentNode?.children.length && (currentPath.length === 0 ? moves.length === 0 : true)}
                className="p-2 rounded-md hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next move (→)"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  // Go to end of main line
                  let node = currentNode
                  let path = [...currentPath]
                  const nodesToTraverse = currentPath.length === 0 ? moves : (node?.children || [])
                  let mainNode = nodesToTraverse.find(n => n.isMainLine) || nodesToTraverse[0]
                  while (mainNode) {
                    path.push(mainNode.id)
                    const nextMain = mainNode.children.find(n => n.isMainLine) || mainNode.children[0]
                    if (!nextMain) break
                    mainNode = nextMain
                  }
                  if (path.length > currentPath.length) {
                    setCurrentPath(path)
                    const endNode = getNodeAtPath(moves, path)
                    if (endNode) {
                      syncChess(endNode.fen)
                      setLastMove([endNode.uci.slice(0, 2) as Key, endNode.uci.slice(2, 4) as Key])
                    }
                  }
                }}
                className="p-2 rounded-md hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
                title="Go to end"
              >
                <ChevronsRight className="h-5 w-5" />
              </button>

              <div className="flex-1" />

              <button
                onClick={() => setShowGraphModal(true)}
                className="p-2 rounded-md hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white flex items-center gap-1.5"
                title="Open tree graph"
              >
                <Network className="h-5 w-5" />
                <span className="text-sm">Tree Graph</span>
              </button>
            </div>
          </div>

          {/* Right Column: Editor Panel */}
          <div className="flex-1 min-w-[380px] max-w-[450px]">
            {/* Tabbed Interface */}
            <Tabs defaultValue="moves" className="w-full h-[600px]">
              <div className="rounded-lg bg-zinc-800 overflow-hidden h-full flex flex-col">
                {/* Tabs Header */}
                <TabsList className="w-full grid grid-cols-3 p-1 border-b border-zinc-700 bg-transparent rounded-none shrink-0">
                  <TabsTrigger value="moves" className="flex items-center gap-1.5 text-xs">
                    <List className="h-3.5 w-3.5" />
                    Moves
                  </TabsTrigger>
                  <TabsTrigger value="explorer" className="flex items-center gap-1.5 text-xs">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Explorer
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs">
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                {/* Moves Tab */}
                <TabsContent value="moves" className="mt-0 flex-1 overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="p-3 border-b border-zinc-700 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 bg-zinc-700 rounded-md p-0.5">
                          <button
                            onClick={() => setMoveViewMode('list')}
                            className={`p-1.5 rounded transition-colors ${moveViewMode === 'list'
                              ? 'bg-zinc-600 text-white'
                              : 'text-zinc-400 hover:text-white'
                              }`}
                            title="Compact list"
                          >
                            <List className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setMoveViewMode('tree')}
                            className={`p-1.5 rounded transition-colors ${moveViewMode === 'tree'
                              ? 'bg-zinc-600 text-white'
                              : 'text-zinc-400 hover:text-white'
                              }`}
                            title="Variation tree"
                          >
                            <GitBranch className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {currentNode && (
                        <button
                          onClick={handleDeleteClick}
                          className="p-1.5 rounded text-red-400 hover:bg-red-600/20 transition-colors"
                          title="Delete this move"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Move List */}
                  <div className="p-3 flex-1 overflow-y-auto scrollbar-thin min-h-0">
                    {moveViewMode === 'list' ? (
                      <MoveList
                        moves={moves}
                        currentPath={currentPath}
                        onMoveClick={goToNode}
                        practiceStartNodeId={practiceStartNodeId}
                      />
                    ) : (
                      <VariationExplorer
                        moves={moves}
                        currentPath={currentPath}
                        onMoveClick={goToNode}
                        startColor={color}
                        practiceStartNodeId={practiceStartNodeId}
                      />
                    )}
                  </div>

                  {/* Annotation Section */}
                  {currentNode && (
                    <div className="border-t border-zinc-700 shrink-0">
                      {/* Entry Point - only show for nodes on the linear trunk */}
                      {(practiceStartNodeId === currentNode.id || isOnLinearTrunk(moves, currentNode.id)) && (
                        <div className="p-3 border-b border-zinc-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Flag className="h-3.5 w-3.5 text-zinc-400" />
                              <span className="text-xs text-zinc-400">Set this move as Entry Point</span>
                            </div>
                            {practiceStartNodeId === currentNode.id ? (
                              <button
                                onClick={() => setPracticeStartNodeId(undefined)}
                                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                              >
                                <Flag className="h-3 w-3" />
                                Clear
                              </button>
                            ) : (
                              <button
                                onClick={() => setPracticeStartNodeId(currentNode.id)}
                                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                              >
                                <Flag className="h-3 w-3" />
                                Set
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* NAGs & Move Info */}
                      <div className="p-3 border-b border-zinc-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-zinc-400">
                            {currentNode.san}
                            {!isUserMove && <span className="ml-1 text-zinc-500">(opponent)</span>}
                          </span>
                          {!currentNode.isMainLine && (
                            <button
                              onClick={handlePromoteToMain}
                              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                              title="Promote to main line"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              Promote
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {nagButtons.map(({ nag, symbol, label }) => {
                            const isActive = currentNode.nags?.includes(nag)
                            return (
                              <button
                                key={nag}
                                onClick={() => toggleNag(nag)}
                                title={label}
                                aria-label={label}
                                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${isActive
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

                      {/* Comment */}
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-xs text-zinc-400">Comment</span>
                          {currentNode.comment && isUserMove && (
                            <span className="text-xs text-green-400">●</span>
                          )}
                        </div>
                        {isUserMove ? (
                          <>
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onFocus={() => setEditingComment(true)}
                              placeholder="Add commentary..."
                              rows={2}
                              className="w-full rounded-md bg-zinc-700 border border-zinc-600 py-1.5 px-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
                            />
                            {editingComment && commentText !== (currentNode.comment || '') && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={saveComment}
                                  className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setCommentText(currentNode.comment || '')
                                    setEditingComment(false)
                                  }}
                                  className="flex-1 rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-600 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-zinc-500">Only for your moves ({color})</p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Explorer Tab */}
                <TabsContent value="explorer" className="mt-0 flex-1 overflow-y-auto">
                  <OpeningStatsPanel
                    stats={stats}
                    isLoading={statsLoading}
                    error={statsError}
                    repertoireMoves={repertoireMoves}
                    sideToMove={turnColor}
                    onMoveHover={setHoveredMoveUci}
                    onMoveClick={(uci, san) => {
                      // Add the move from explorer to the repertoire
                      const from = uci.slice(0, 2) as Key
                      const to = uci.slice(2, 4) as Key
                      const promotion = uci.length > 4 ? uci[4] as PromotionPiece : undefined
                      handleMove(from, to, promotion)
                    }}
                  />
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-0 flex-1 overflow-y-auto">
                  {/* Opening Name */}
                  <div className="p-4 border-b border-zinc-700">
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      Opening Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., My Sicilian Repertoire"
                      className="w-full rounded-md bg-zinc-700 border border-zinc-600 py-2 px-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div className="p-4 border-b border-zinc-700">
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Notes about this opening..."
                      rows={2}
                      className="w-full rounded-md bg-zinc-700 border border-zinc-600 py-2 px-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Playing as */}
                  <div className="p-4">
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
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
                          ? 'bg-zinc-600 text-white border border-zinc-500'
                          : 'bg-zinc-700 text-zinc-400 hover:text-white'
                          }`}
                      >
                        Black
                      </button>
                    </div>
                  </div>
                </TabsContent>

                {/* Action Buttons - shown on all tabs */}
                <div className="p-4 flex gap-2 border-t border-zinc-700 mt-auto shrink-0">
                  <button
                    onClick={onCancel}
                    className="flex-1 rounded-md bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
