/**
 * Stockfish (WASM, lite single-threaded) running in a Web Worker, spoken to over UCI.
 * ~1.9 MB, loaded only when the engine is first used; needs no cross-origin isolation.
 */
import engineScriptUrl from 'stockfish/bin/stockfish-19-lite-single.js?url'
import engineWasmUrl from 'stockfish/bin/stockfish-19-lite-single.wasm?url'

/** One principal variation, scored from White's point of view */
export interface EngineLine {
  /** 1-based rank of the line (MultiPV) */
  rank: number
  depth: number
  /** Centipawns for White (undefined when a mate is found) */
  cp?: number
  /** Moves to mate: positive = White mates, negative = Black mates */
  mate?: number
  /** Principal variation in UCI */
  pv: string[]
}

export interface EngineAnalysis {
  fen: string
  depth: number
  lines: EngineLine[]
}

type Listener = (analysis: EngineAnalysis) => void

interface EngineOptions {
  multiPv: number
  maxDepth: number
}

export class StockfishEngine {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private searching = false
  /** A `stop` was sent; ignore output until the matching `bestmove` */
  private stopping = false
  private pendingFen: string | null = null
  private currentFen: string | null = null
  private lines = new Map<number, EngineLine>()
  private listener: Listener | null = null
  private readonly options: EngineOptions

  constructor(options: Partial<EngineOptions> = {}) {
    this.options = { multiPv: 3, maxDepth: 20, ...options }
  }

  /** Start the worker and wait for the engine to be ready */
  init(): Promise<void> {
    if (this.ready) return this.ready

    this.ready = new Promise((resolve, reject) => {
      const worker = new Worker(`${engineScriptUrl}#${encodeURIComponent(engineWasmUrl)}`)
      this.worker = worker

      worker.onerror = event => reject(new Error(event.message || 'Failed to start the engine'))
      worker.onmessage = event => {
        const line = String(event.data)
        if (line === 'uciok') {
          worker.postMessage(`setoption name MultiPV value ${this.options.multiPv}`)
          worker.postMessage('setoption name Hash value 32')
          worker.postMessage('isready')
        } else if (line === 'readyok' && !this.searching) {
          resolve()
        } else {
          this.handleLine(line)
        }
      }
      worker.postMessage('uci')
    })
    return this.ready
  }

  /** Analyze a position; results stream to the listener. A running search is interrupted. */
  analyze(fen: string, listener: Listener) {
    this.listener = listener
    if (!this.worker) return

    if (this.searching) {
      this.pendingFen = fen
      if (!this.stopping) {
        this.stopping = true
        this.worker.postMessage('stop')
      }
      return
    }
    this.start(fen)
  }

  /** Stop the current search */
  stop() {
    this.pendingFen = null
    this.listener = null
    if (this.worker && this.searching && !this.stopping) {
      this.stopping = true
      this.worker.postMessage('stop')
    }
  }

  terminate() {
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    this.searching = false
    this.stopping = false
    this.listener = null
  }

  private start(fen: string) {
    if (!this.worker) return
    this.currentFen = fen
    this.lines = new Map()
    this.searching = true
    this.stopping = false
    this.worker.postMessage(`position fen ${fen}`)
    this.worker.postMessage(`go depth ${this.options.maxDepth}`)
  }

  private handleLine(line: string) {
    if (line.startsWith('bestmove')) {
      this.searching = false
      this.stopping = false
      const next = this.pendingFen
      this.pendingFen = null
      if (next) this.start(next)
      return
    }

    if (!line.startsWith('info') || this.stopping || !this.currentFen) return
    const parsed = parseInfo(line, this.currentFen)
    if (!parsed) return

    this.lines.set(parsed.rank, parsed)
    // Report once the first line of a new depth is in (deeper lines replace shallower ones)
    const lines = [...this.lines.values()]
      .filter(l => l.depth >= parsed.depth - 1)
      .sort((a, b) => a.rank - b.rank)
    this.listener?.({ fen: this.currentFen, depth: lines[0]?.depth ?? parsed.depth, lines })
  }
}

/**
 * Parse a UCI `info` line. Scores are converted from side-to-move to White's point of view.
 */
export function parseInfo(line: string, fen: string): EngineLine | null {
  const tokens = line.split(' ')
  const value = (key: string) => {
    const index = tokens.indexOf(key)
    return index >= 0 ? tokens[index + 1] : undefined
  }

  const depth = Number(value('depth'))
  const pvIndex = tokens.indexOf('pv')
  const scoreIndex = tokens.indexOf('score')
  if (!depth || pvIndex < 0 || scoreIndex < 0) return null
  // Bound scores (lowerbound/upperbound) are provisional; skip them
  if (tokens[scoreIndex + 3] === 'lowerbound' || tokens[scoreIndex + 3] === 'upperbound') return null

  const sign = fen.split(' ')[1] === 'b' ? -1 : 1
  const kind = tokens[scoreIndex + 1]
  const score = Number(tokens[scoreIndex + 2])

  return {
    rank: Number(value('multipv') ?? 1),
    depth,
    cp: kind === 'cp' ? score * sign : undefined,
    mate: kind === 'mate' ? score * sign : undefined,
    pv: tokens.slice(pvIndex + 1),
  }
}

/**
 * White's winning chances in [0, 100] (same curve Lichess uses for its eval bar)
 */
export function whiteWinPercent(line: Pick<EngineLine, 'cp' | 'mate'>): number {
  if (line.mate !== undefined) return line.mate > 0 ? 100 : line.mate < 0 ? 0 : 50
  const cp = Math.max(-1000, Math.min(1000, line.cp ?? 0))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

/**
 * Format a score for display: "+0.45", "-1.2", "M3", "-M2"
 */
export function formatScore(line: Pick<EngineLine, 'cp' | 'mate'>): string {
  if (line.mate !== undefined) return line.mate > 0 ? `M${line.mate}` : `-M${Math.abs(line.mate)}`
  const pawns = (line.cp ?? 0) / 100
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(Math.abs(pawns) >= 10 ? 0 : 1)}`
}
