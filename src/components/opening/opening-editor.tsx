import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from '@lichess-org/chessground/types'
import type { Config } from '@lichess-org/chessground/config'
import type { DrawShape } from '@lichess-org/chessground/draw'
import {
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Flag,
  GitBranch,
  List,
  MessageSquare,
  Network,
  Redo2,
  Save,
  Settings2,
  Trash2,
  Undo2,
} from 'lucide-react'
import type { Square } from '@jackstenglein/chess'
import type { OpeningStudy, BoardShape } from '@/types/opening'
import { Chessground } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { GameLayout } from '@/components/game-layout'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ActionButton } from '@/components/training/training-ui'
import { useOpeningEditor } from '@/hooks/use-opening-editor'
import { useOpeningStats } from '@/hooks/use-opening-stats'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useSettings } from '@/lib/settings'
import {
  deleteNode,
  findNodeById,
  generateNodeId,
  getPathToNode,
  isOnLinearTrunk,
  promoteToMainLine,
  saveOpeningStudy,
  updateNodeComment,
  updateNodeNags,
  updateNodeShapes,
} from '@/lib/opening-utils'
import { createChess, getLegalDests, getTurnColor, isPromotionMove } from '@/chess/chess-utils'
import { createNagShape } from '@/chess/nag-shapes'
import { playSound, getMoveSound } from '@/lib/sounds'
import type { PromotionPiece } from '@/types/chess'
import { cn } from '@/lib/utils'
import { MoveList } from './move-list'
import { VariationExplorer } from './variation-explorer'
import { OpeningStatsPanel } from './opening-stats'
import { PgnPanel } from './pgn-panel'

// React Flow + dagre are heavy: load the graph only when it's opened
const OpeningTree = lazy(() => import('./opening-tree').then(m => ({ default: m.OpeningTree })))

interface OpeningEditorProps {
  initialStudy: OpeningStudy
  onSave: (study: OpeningStudy) => void
  onCancel: () => void
  /** Notified when the editor gets/loses unsaved changes */
  onDirtyChange?: (dirty: boolean) => void
}

type EditorTab = 'moves' | 'explorer' | 'details'

const nagButtons = [
  { nag: '$1', symbol: '!', label: 'Good move' },
  { nag: '$3', symbol: '!!', label: 'Brilliant move' },
  { nag: '$6', symbol: '?!', label: 'Dubious move' },
  { nag: '$2', symbol: '?', label: 'Mistake' },
  { nag: '$4', symbol: '??', label: 'Blunder' },
]

const tabs: { id: EditorTab; label: string; icon: typeof List }[] = [
  { id: 'moves', label: 'Moves', icon: List },
  { id: 'explorer', label: 'Explorer', icon: BarChart3 },
  { id: 'details', label: 'Details', icon: Settings2 },
]

export function OpeningEditor({ initialStudy, onSave, onCancel, onDirtyChange }: OpeningEditorProps) {
  const { addToast } = useToast()
  const { lichessToken } = useSettings()
  const editor = useOpeningEditor(initialStudy)
  const { moves, path, currentNode, fen, practiceStartNodeId, navigate, play, commit, undo, redo } = editor

  // Study metadata
  const [name, setName] = useState(initialStudy.name)
  const [description, setDescription] = useState(initialStudy.description ?? '')
  const [color, setColor] = useState<'white' | 'black'>(initialStudy.color)

  const [tab, setTab] = useState<EditorTab>('moves')
  const [moveView, setMoveView] = useState<'list' | 'tree'>('list')
  const [showGraph, setShowGraph] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hoveredUci, setHoveredUci] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Key; to: Key } | null>(null)
  const [commentDraft, setCommentDraft] = useState<{ nodeId: string; text: string } | null>(null)

  // ===== Dirty tracking =====
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({
    moves: initialStudy.moves,
    practiceStartNodeId: initialStudy.practiceStartNodeId,
    name: initialStudy.name,
    description: initialStudy.description ?? '',
    color: initialStudy.color,
  }))
  const currentSnapshot = useMemo(
    () => JSON.stringify({ moves, practiceStartNodeId, name, description, color }),
    [moves, practiceStartNodeId, name, description, color]
  )
  const isDirty = currentSnapshot !== savedSnapshot

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  // ===== Board =====
  const chess = useMemo(() => createChess(fen), [fen])
  const turnColor = getTurnColor(chess)
  const legalDests = useMemo(() => getLegalDests(chess), [chess])
  const children = currentNode ? currentNode.children : moves

  const { stats, isLoading: statsLoading, error: statsError, refetch } = useOpeningStats(fen, {
    token: lichessToken,
    enabled: tab === 'explorer',
  })

  const playUci = useCallback((from: Key, to: Key, promotion?: PromotionPiece) => {
    const board = createChess(fen)
    let move
    try {
      move = board.move({ from: from as Square, to: to as Square, promotion })
    } catch {
      move = null
    }
    if (!move) return
    play({
      id: generateNodeId(),
      san: move.san,
      uci: `${from}${to}${promotion ?? ''}`,
      fen: board.fen(),
      children: [],
      isMainLine: false,
    })
    playSound(getMoveSound({
      isCapture: !!move.captured,
      isCastle: move.san.startsWith('O-O'),
      isCheck: board.isCheck(),
      isPromotion: !!move.promotion,
    }))
  }, [fen, play])

  const handleBoardMove = useCallback((from: Key, to: Key) => {
    if (isPromotionMove(chess, from, to)) {
      setPendingPromotion({ from, to })
      return
    }
    playUci(from, to)
  }, [chess, playUci])

  // ===== Navigation =====
  const goBack = useCallback(() => navigate(path.slice(0, -1)), [navigate, path])
  const goForward = useCallback(() => {
    const next = children.find(n => n.isMainLine) ?? children[0]
    if (next) navigate([...path, next.id])
  }, [children, navigate, path])
  const goToStart = useCallback(() => navigate([]), [navigate])
  const goToEnd = useCallback(() => {
    const newPath = [...path]
    let level = children
    while (level.length > 0) {
      const next = level.find(n => n.isMainLine) ?? level[0]
      newPath.push(next.id)
      level = next.children
    }
    navigate(newPath)
  }, [children, navigate, path])
  const goToNode = useCallback((nodeId: string) => navigate(getPathToNode(moves, nodeId)), [moves, navigate])

  // ===== Tree edits =====
  const deleteMove = useCallback((nodeId: string) => {
    const nodePath = getPathToNode(moves, nodeId)
    const newPath = path.includes(nodeId) ? nodePath.slice(0, -1) : path
    const entryRemoved = practiceStartNodeId && nodePath.length > 0 && getPathToNode(moves, practiceStartNodeId).includes(nodeId)
    commit(deleteNode(moves, nodeId), { path: newPath, practiceStartNodeId: entryRemoved ? null : undefined })
    addToast('Move deleted — Ctrl+Z to undo', 'info')
  }, [moves, path, practiceStartNodeId, commit, addToast])

  const toggleNag = useCallback((nodeId: string, nag: string) => {
    const node = findNodeById(moves, nodeId)
    if (!node) return
    const nags = node.nags?.includes(nag) ? undefined : [nag]
    commit(updateNodeNags(moves, nodeId, nags))
  }, [moves, commit])

  const saveComment = useCallback((nodeId: string, text: string) => {
    const node = findNodeById(moves, nodeId)
    if (!node || (node.comment ?? '') === text.trim()) return
    commit(updateNodeComment(moves, nodeId, text))
  }, [moves, commit])

  const toggleEntryPoint = useCallback((nodeId: string) => {
    commit(moves, { practiceStartNodeId: practiceStartNodeId === nodeId ? null : nodeId })
  }, [moves, practiceStartNodeId, commit])

  const handleShapesChange = useCallback((shapes: DrawShape[]) => {
    if (!currentNode) return
    const boardShapes: BoardShape[] = shapes
      .filter(s => s.brush)
      .map(s => ({ orig: s.orig, dest: s.dest, brush: s.brush! }))
    if (JSON.stringify(boardShapes) === JSON.stringify(currentNode.shapes ?? [])) return
    commit(updateNodeShapes(moves, currentNode.id, boardShapes))
  }, [currentNode, moves, commit])

  // ===== Save =====
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      setTab('details')
      addToast('Give your study a name before saving', 'warning')
      return
    }
    const study: OpeningStudy = {
      ...initialStudy,
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      moves,
      practiceStartNodeId,
      updatedAt: Date.now(),
    }
    if (!saveOpeningStudy(study)) {
      addToast('Could not save: browser storage is full or unavailable', 'error')
      return
    }
    setSavedSnapshot(currentSnapshot)
    addToast('Study saved', 'success')
    onSave(study)
  }, [name, description, color, moves, practiceStartNodeId, initialStudy, currentSnapshot, onSave, addToast])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const target = e.target as HTMLElement | null
      const typing = target && ['INPUT', 'TEXTAREA'].includes(target.tagName)
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        handleSave()
      } else if (!typing && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (!typing && key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, undo, redo])

  useHotkeys({
    ArrowLeft: goBack,
    ArrowRight: goForward,
    Home: goToStart,
    End: goToEnd,
    Delete: currentNode ? () => setConfirmDelete(true) : undefined,
  })

  // ===== Board config =====
  const autoShapes = useMemo((): DrawShape[] => {
    const shapes: DrawShape[] = []
    if (hoveredUci) {
      shapes.push({ orig: hoveredUci.slice(0, 2) as Key, dest: hoveredUci.slice(2, 4) as Key, brush: 'blue' })
    }
    if (currentNode?.nags?.length) {
      const nagShape = createNagShape(currentNode.uci.slice(2, 4) as Key, currentNode.nags[0])
      if (nagShape) shapes.push(nagShape)
    }
    return shapes
  }, [hoveredUci, currentNode])

  const config = useMemo((): Config => ({
    fen,
    orientation: color,
    turnColor,
    lastMove: currentNode ? [currentNode.uci.slice(0, 2) as Key, currentNode.uci.slice(2, 4) as Key] : undefined,
    check: chess.isCheck(),
    movable: { free: false, color: turnColor, dests: legalDests, showDests: true },
    premovable: { enabled: false },
    animation: { enabled: true, duration: 200 },
    drawable: {
      enabled: true,
      visible: true,
      defaultSnapToValidMove: true,
      shapes: currentNode?.shapes?.map(s => ({ orig: s.orig as Key, dest: s.dest as Key | undefined, brush: s.brush })) ?? [],
      autoShapes,
      onChange: handleShapesChange,
    },
  }), [fen, color, turnColor, currentNode, chess, legalDests, autoShapes, handleShapesChange])

  // ===== UI pieces =====
  const navButton = 'rounded-lg p-2.5 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none'
  const navigationBar = (
    <div className="flex items-center justify-center gap-0.5 border-y border-border-subtle bg-surface-1 px-2 py-1 lg:rounded-xl lg:border">
      <button type="button" onClick={goToStart} disabled={path.length === 0} className={navButton} title="Start (Home)" aria-label="Go to start">
        <ChevronsLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={goBack} disabled={path.length === 0} className={navButton} title="Previous (←)" aria-label="Previous move">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={goForward} disabled={children.length === 0} className={navButton} title="Next (→)" aria-label="Next move">
        <ChevronRight className="h-5 w-5" />
      </button>
      <button type="button" onClick={goToEnd} disabled={children.length === 0} className={navButton} title="End of line (End)" aria-label="Go to end">
        <ChevronsRight className="h-5 w-5" />
      </button>
      <div className="mx-1.5 h-5 w-px bg-border-strong" />
      <button type="button" onClick={undo} disabled={!editor.canUndo} className={navButton} title="Undo (Ctrl+Z)" aria-label="Undo">
        <Undo2 className="h-5 w-5" />
      </button>
      <button type="button" onClick={redo} disabled={!editor.canRedo} className={navButton} title="Redo (Ctrl+Y)" aria-label="Redo">
        <Redo2 className="h-5 w-5" />
      </button>
      <div className="mx-1.5 h-5 w-px bg-border-strong" />
      <button type="button" onClick={() => setShowGraph(true)} className={cn(navButton, 'flex items-center gap-1.5')} title="Tree graph" aria-label="Open tree graph">
        <Network className="h-5 w-5" />
        <span className="hidden text-sm sm:inline">Graph</span>
      </button>
    </div>
  )

  const draftText = commentDraft && commentDraft.nodeId === currentNode?.id ? commentDraft.text : currentNode?.comment ?? ''
  const commentChanged = !!currentNode && draftText.trim() !== (currentNode.comment ?? '')
  const ply = path.length - 1
  const isUserMove = !!currentNode && (ply % 2 === 0) === (color === 'white')
  const canSetEntry = !!currentNode && (practiceStartNodeId === currentNode.id || isOnLinearTrunk(moves, currentNode.id))

  const annotationPanel = currentNode ? (
    <div className="space-y-3 border-t border-border-subtle p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">
          <span className="font-mono">{Math.floor(ply / 2) + 1}{ply % 2 === 0 ? '.' : '...'}{currentNode.san}</span>
          <span className="ml-2 text-xs font-normal text-text-muted">{isUserMove ? 'your move' : 'opponent'}</span>
        </span>
        <div className="flex items-center gap-1">
          {!currentNode.isMainLine && (
            <button
              type="button"
              onClick={() => commit(promoteToMainLine(moves, currentNode.id))}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              title="Make this the main line"
            >
              <ArrowUpRight className="h-3.5 w-3.5" /> Promote
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-md p-1.5 text-accent-danger hover:bg-accent-danger/15"
            title="Delete this move and its continuations (Del)"
            aria-label="Delete move"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Move annotation">
        {nagButtons.map(({ nag, symbol, label }) => {
          const active = currentNode.nags?.includes(nag)
          return (
            <button
              type="button"
              key={nag}
              onClick={() => toggleNag(currentNode.id, nag)}
              title={label}
              aria-label={label}
              aria-pressed={active}
              className={cn(
                'min-w-9 rounded-md px-2 py-1.5 text-xs font-bold transition-colors',
                active ? 'bg-accent-warning text-zinc-950' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
              )}
            >
              {symbol}
            </button>
          )
        })}
        {canSetEntry && (
          <button
            type="button"
            onClick={() => toggleEntryPoint(currentNode.id)}
            className={cn(
              'ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              practiceStartNodeId === currentNode.id
                ? 'bg-accent-success/20 text-accent-success'
                : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
            )}
            title="Practice starts from this position; earlier moves become a single setup line"
          >
            <Flag className="h-3.5 w-3.5" />
            {practiceStartNodeId === currentNode.id ? 'Entry point' : 'Set entry'}
          </button>
        )}
      </div>

      <div>
        <label htmlFor="move-comment" className="mb-1 flex items-center gap-1.5 text-xs text-text-secondary">
          <MessageSquare className="h-3.5 w-3.5" />
          {isUserMove ? 'Why play this move? (shown before you play it)' : 'Comment on the opponent’s move'}
        </label>
        <textarea
          id="move-comment"
          value={draftText}
          onChange={e => setCommentDraft({ nodeId: currentNode.id, text: e.target.value })}
          onBlur={() => {
            if (commentChanged) saveComment(currentNode.id, draftText)
            setCommentDraft(null)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) (e.target as HTMLTextAreaElement).blur()
          }}
          placeholder="Plans, ideas, traps… (saved when you leave the field)"
          rows={2}
          className="w-full resize-none rounded-lg border border-border-strong bg-surface-2 px-2.5 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
        />
      </div>
    </div>
  ) : (
    <div className="border-t border-border-subtle p-3 text-xs text-text-muted">
      Play moves on the board to build your repertoire. Playing a different move from the same position creates a variation.
    </div>
  )

  const movesTab = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5" role="group" aria-label="Move view">
          {([['list', List, 'Compact list'], ['tree', GitBranch, 'Variation tree']] as const).map(([id, Icon, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setMoveView(id)}
              aria-pressed={moveView === id}
              title={label}
              className={cn('rounded-md p-1.5 transition-colors', moveView === id ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:text-text-primary')}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <span className="text-xs text-text-muted">{children.length > 1 ? `${children.length} continuations` : ''}</span>
      </div>
      <div className="min-h-[120px] flex-1 overflow-y-auto p-3 sidebar-scroll">
        {moveView === 'list' ? (
          <MoveList moves={moves} currentPath={path} onMoveClick={goToNode} practiceStartNodeId={practiceStartNodeId} />
        ) : (
          <VariationExplorer moves={moves} currentPath={path} onMoveClick={goToNode} practiceStartNodeId={practiceStartNodeId} />
        )}
      </div>
      {annotationPanel}
    </div>
  )

  const explorerTab = (
    <OpeningStatsPanel
      stats={stats}
      isLoading={statsLoading}
      error={statsError}
      hasToken={!!lichessToken}
      onRetry={refetch}
      repertoireMoves={children.map(c => c.uci)}
      sideToMove={turnColor}
      onMoveHover={setHoveredUci}
      onMoveClick={uci => {
        setHoveredUci(null)
        playUci(uci.slice(0, 2) as Key, uci.slice(2, 4) as Key, (uci[4] as PromotionPiece | undefined) || undefined)
      }}
    />
  )

  const detailsTab = (
    <div className="space-y-4 p-4">
      <div>
        <label htmlFor="study-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Name <span className="text-accent-danger">*</span>
        </label>
        <input
          id="study-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. My Caro-Kann"
          className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="study-description" className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
        <textarea
          id="study-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Notes about this opening…"
          rows={2}
          className="w-full resize-none rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
        />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">You play as</span>
        <div className="flex gap-2">
          {(['white', 'black'] as const).map(side => (
            <button
              type="button"
              key={side}
              onClick={() => setColor(side)}
              aria-pressed={color === side}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-colors',
                color === side
                  ? side === 'white' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-950 text-zinc-100 ring-1 ring-border-strong'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary'
              )}
            >
              {side === 'white' ? '♔' : '♚'} {side}
            </button>
          ))}
        </div>
      </div>
      <PgnPanel
        moves={moves}
        studyName={name}
        rootFen={editor.rootFen}
        onImport={(imported, mode) => {
          commit(imported, { path: [], practiceStartNodeId: mode === 'replace' ? null : undefined })
          setTab('moves')
          addToast(mode === 'replace' ? 'PGN imported' : 'PGN merged into your repertoire', 'success')
        }}
      />
    </div>
  )

  const tabBar = (
    <div className="grid shrink-0 grid-cols-3 border-b border-border-subtle" role="tablist">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          type="button"
          role="tab"
          key={id}
          aria-selected={tab === id}
          onClick={() => setTab(id)}
          className={cn(
            'flex items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors',
            tab === id ? 'border-accent-blue text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )

  const tabContent = tab === 'moves' ? movesTab : tab === 'explorer' ? explorerTab : detailsTab

  const saveButtons = (
    <div className="flex gap-2">
      <ActionButton onClick={onCancel} className="flex-1">Close</ActionButton>
      <ActionButton tone="primary" icon={Save} onClick={handleSave} className="flex-[2]" disabled={!isDirty && !!initialStudy.moves.length}>
        {isDirty ? 'Save changes' : 'Saved'}
      </ActionButton>
    </div>
  )

  return (
    <>
      <ConfirmDialog
        isOpen={confirmDelete && !!currentNode}
        title="Delete move"
        message={`Delete ${currentNode?.san ?? 'this move'} and all its continuations? You can undo with Ctrl+Z.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (currentNode) deleteMove(currentNode.id)
          setConfirmDelete(false)
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      {pendingPromotion && (
        <PromotionDialog
          color={turnColor}
          onSelect={piece => {
            playUci(pendingPromotion.from, pendingPromotion.to, piece)
            setPendingPromotion(null)
          }}
          onCancel={() => setPendingPromotion(null)}
        />
      )}

      <Dialog open={showGraph} onOpenChange={setShowGraph}>
        <DialogContent className="flex h-[85vh] flex-col gap-3 border-border-subtle bg-surface-1 p-3 text-text-primary sm:max-w-[min(1200px,95vw)] md:p-4">
          <DialogTitle className="text-base">Opening tree</DialogTitle>
          <p className="-mt-2 text-xs text-text-muted">Click a move to jump to it · right-click for annotations and actions</p>
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg">
            <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-text-muted">Loading graph…</div>}>
            <OpeningTree
              moves={moves}
              currentPath={path}
              onNodeClick={nodeId => (nodeId === 'start' ? goToStart() : goToNode(nodeId))}
              onSetPracticeStart={toggleEntryPoint}
              onDeleteVariation={deleteMove}
              onPromoteToMain={nodeId => commit(promoteToMainLine(moves, nodeId))}
              onUpdateComment={(nodeId, comment) => commit(updateNodeComment(moves, nodeId, comment))}
              onToggleNag={toggleNag}
              getNodeData={nodeId => findNodeById(moves, nodeId) || undefined}
              startColor={color}
              practiceStartNodeId={practiceStartNodeId}
            />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      <GameLayout
        board={<Chessground config={config} onMove={handleBoardMove} />}
        belowBoard={navigationBar}
        mobileTopBar={
          <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-1 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{name || 'Untitled study'}</p>
              <p className="text-[11px] text-text-muted">{isDirty ? 'Unsaved changes' : 'All changes saved'}</p>
            </div>
            <ActionButton size="sm" tone="primary" icon={Save} onClick={handleSave} disabled={!isDirty && !!initialStudy.moves.length}>
              Save
            </ActionButton>
          </div>
        }
        mobileContent={
          <div className="mt-2 flex flex-col border-t border-border-subtle bg-surface-1">
            {tabBar}
            {tabContent}
          </div>
        }
        sidebar={
          <>
            {tabBar}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sidebar-scroll">{tabContent}</div>
            <div className="shrink-0 border-t border-border-subtle p-3">
              {isDirty && <p className="mb-2 text-center text-[11px] text-accent-warning">Unsaved changes · Ctrl+S to save</p>}
              {saveButtons}
            </div>
          </>
        }
      />
    </>
  )
}
