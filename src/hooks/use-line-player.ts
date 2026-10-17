import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Chess } from '@jackstenglein/chess'
import type { Key } from '@lichess-org/chessground/types'
import type { Config } from '@lichess-org/chessground/config'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { PendingPromotion, PromotionPiece } from '@/types/chess'
import {
  createChess,
  getLegalDests,
  getTurnColor,
  parseUci,
  isPromotionMove,
} from '@/chess/chess-utils'
import { playSound, getMoveSound } from '@/lib/sounds'

export type Color = 'white' | 'black'

/** A line to play through: UCI moves from a start position */
export interface LineSource {
  uci: string[]
  startFen: string
  /** Side the user plays in this line (defaults to the player's userColor) */
  userColor?: Color
}

/** Snapshot of the board, safe to read during render */
export interface LineState {
  fen: string
  turnColor: Color
  lastMove?: [Key, Key]
  check: boolean
  /** Number of moves of the line already played */
  moveIndex: number
  isComplete: boolean
  /** Whether the user is expected to move now */
  isUserTurn: boolean
  /** Destinations the user may play (empty when it's not the user's turn) */
  dests: Map<Key, Key[]>
  /** The move the user is expected to play, if it's the user's turn */
  expectedUci: string | null
}

export type MoveResult = 'correct' | 'wrong' | 'ignored' | 'promotion'

interface LineCallbacks {
  /** Called after the user played the expected move */
  onCorrect?: (index: number) => void
  /** Called when the user played a legal but unexpected move */
  onWrong?: (index: number, playedUci: string) => void
  /** Called when the last move of the line has been played */
  onComplete?: () => void
}

export interface UseLinePlayerOptions extends LineCallbacks {
  initialLine: LineSource
  userColor: Color
  /** Delay between automatic opponent moves (ms) */
  machineDelay?: number
  /** Delay before the first automatic move after loading a line (ms) */
  startDelay?: number
  /** Only allow the expected move to be played (guided study) */
  onlyExpectedMove?: boolean
}

interface EngineConfig {
  userColor: Color
  machineDelay: number
  startDelay: number
  onlyExpectedMove: boolean
}

/**
 * Plays through a line: validates user moves and answers with the opponent's moves.
 * Lives outside React; components observe it through snapshots.
 */
class LineEngine {
  private chess: Chess
  private line: LineSource
  private index = 0
  private lastMove: [Key, Key] | undefined
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private listener: ((state: LineState) => void) | null = null
  private callbacks: LineCallbacks = {}
  private readonly config: EngineConfig

  constructor(line: LineSource, config: EngineConfig) {
    this.line = line
    this.config = config
    this.chess = createChess(line.startFen)
  }

  private get userColor(): Color {
    return this.line.userColor ?? this.config.userColor
  }

  setCallbacks(callbacks: LineCallbacks) {
    this.callbacks = callbacks
  }

  setListener(listener: ((state: LineState) => void) | null) {
    this.listener = listener
  }

  snapshot(): LineState {
    const isComplete = this.index >= this.line.uci.length
    const turnColor = getTurnColor(this.chess)
    const isUserTurn = !isComplete && turnColor === this.userColor
    const expectedUci = isUserTurn ? this.line.uci[this.index] : null

    let dests = new Map<Key, Key[]>()
    if (isUserTurn && expectedUci) {
      if (this.config.onlyExpectedMove) {
        const { from, to } = parseUci(expectedUci)
        dests = new Map([[from as Key, [to as Key]]])
      } else {
        dests = getLegalDests(this.chess)
      }
    }

    return {
      fen: this.chess.fen(),
      turnColor,
      lastMove: this.lastMove,
      check: this.chess.isCheck(),
      moveIndex: this.index,
      isComplete,
      isUserTurn,
      dests,
      expectedUci,
    }
  }

  private emit() {
    this.listener?.(this.snapshot())
  }

  /** Load a new line and start it (opponent moves first if needed) */
  load(line: LineSource) {
    this.stop()
    this.line = line
    this.chess = createChess(line.startFen)
    this.index = 0
    this.lastMove = undefined
    this.emit()
    this.start()
  }

  /** Schedule the opponent's moves if it's their turn */
  start() {
    this.scheduleMachine(this.config.startDelay)
  }

  /** Cancel pending opponent moves */
  stop() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
  }

  isPromotion(from: Key, to: Key): boolean {
    return isPromotionMove(this.chess, from, to)
  }

  tryMove(from: Key, to: Key, promotion?: PromotionPiece): MoveResult {
    const state = this.snapshot()
    if (!state.isUserTurn || !state.expectedUci) return 'ignored'

    const played = `${from}${to}${promotion ?? ''}`
    if (played !== state.expectedUci) {
      playSound('wrong')
      this.callbacks.onWrong?.(this.index, played)
      this.emit()
      return 'wrong'
    }

    const index = this.index
    if (!this.apply(played)) return 'ignored'
    this.emit()
    this.callbacks.onCorrect?.(index)

    if (this.index >= this.line.uci.length) {
      this.callbacks.onComplete?.()
    } else {
      this.scheduleMachine(this.config.machineDelay)
    }
    return 'correct'
  }

  private apply(uci: string): boolean {
    const { from, to, promotion } = parseUci(uci)
    let move
    try {
      move = this.chess.move({ from, to, promotion })
    } catch {
      move = null
    }
    if (!move) return false

    this.index++
    this.lastMove = [from as Key, to as Key]
    playSound(getMoveSound({
      isCapture: !!move.captured,
      isCastle: move.san.startsWith('O-O'),
      isCheck: this.chess.isCheck(),
      isPromotion: !!move.promotion,
    }))
    return true
  }

  private scheduleMachine(delay: number) {
    if (this.index >= this.line.uci.length) return
    if (getTurnColor(this.chess) === this.userColor) return

    const id = setTimeout(() => {
      this.timers.delete(id)
      this.machineStep()
    }, delay)
    this.timers.add(id)
  }

  private machineStep() {
    if (!this.apply(this.line.uci[this.index])) {
      // Corrupted line (illegal move stored): end it instead of stalling
      this.index = this.line.uci.length
    }
    this.emit()

    if (this.index >= this.line.uci.length) {
      this.callbacks.onComplete?.()
    } else {
      this.scheduleMachine(this.config.machineDelay)
    }
  }
}

/**
 * Build the Chessground config for a line state
 */
export function buildBoardConfig(
  state: LineState,
  options: { orientation: Color; autoShapes?: DrawShape[]; locked?: boolean; animationMs?: number }
): Config {
  const canMove = state.isUserTurn && !options.locked
  return {
    fen: state.fen,
    orientation: options.orientation,
    turnColor: state.turnColor,
    lastMove: state.lastMove,
    check: state.check,
    movable: {
      free: false,
      color: canMove ? options.orientation : undefined,
      dests: canMove ? state.dests : new Map(),
      showDests: true,
    },
    premovable: { enabled: false },
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: options.animationMs ?? 200 },
    drawable: {
      enabled: true,
      autoShapes: options.autoShapes ?? [],
    },
  }
}

/**
 * React hook around LineEngine: shared by study, practice, speed drill and mistakes review
 */
export function useLinePlayer(options: UseLinePlayerOptions) {
  const [engine] = useState(() => new LineEngine(options.initialLine, {
    userColor: options.userColor,
    machineDelay: options.machineDelay ?? 400,
    startDelay: options.startDelay ?? 500,
    onlyExpectedMove: options.onlyExpectedMove ?? false,
  }))

  // Callbacks always see the latest props
  useLayoutEffect(() => {
    engine.setCallbacks(options)
  })
  const [state, setState] = useState<LineState>(() => engine.snapshot())
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  useEffect(() => {
    engine.setListener(setState)
    engine.start()
    return () => {
      engine.stop()
      engine.setListener(null)
    }
  }, [engine])

  const pendingRef = useRef<PendingPromotion | null>(null)
  const setPending = useCallback((pending: PendingPromotion | null) => {
    pendingRef.current = pending
    setPendingPromotion(pending)
  }, [])

  const load = useCallback((line: LineSource) => {
    setPending(null)
    engine.load(line)
  }, [engine, setPending])

  /** Handler for Chessground's move event */
  const handleBoardMove = useCallback((from: Key, to: Key): MoveResult => {
    if (engine.isPromotion(from, to)) {
      if (!engine.snapshot().isUserTurn) return 'ignored'
      setPending({ from, to })
      return 'promotion'
    }
    return engine.tryMove(from, to)
  }, [engine, setPending])

  const completePromotion = useCallback((piece: PromotionPiece) => {
    const pending = pendingRef.current
    setPending(null)
    if (pending) engine.tryMove(pending.from, pending.to, piece)
  }, [engine, setPending])

  const cancelPromotion = useCallback(() => setPending(null), [setPending])

  const stop = useCallback(() => engine.stop(), [engine])

  return {
    ...state,
    /** The raw snapshot (stable identity until the board changes) */
    state,
    load,
    stop,
    handleBoardMove,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
  }
}
