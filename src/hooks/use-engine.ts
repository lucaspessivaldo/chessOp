import { useEffect, useRef, useState } from 'react'
import { StockfishEngine, type EngineAnalysis } from '@/lib/engine'

export type EngineStatus = 'off' | 'loading' | 'ready' | 'error'

/**
 * Analyze `fen` with Stockfish while `enabled`. The engine (worker) is created on first use
 * and terminated when the component unmounts or the engine is turned off.
 */
export function useEngineAnalysis(fen: string, enabled: boolean) {
  const engineRef = useRef<StockfishEngine | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [analysis, setAnalysis] = useState<EngineAnalysis | null>(null)

  // Start / stop the worker
  useEffect(() => {
    if (!enabled) return
    const engine = new StockfishEngine({ multiPv: 3, maxDepth: 20 })
    engineRef.current = engine
    let cancelled = false
    engine.init().then(
      () => !cancelled && setLoaded(true),
      () => !cancelled && setFailed(true)
    )
    return () => {
      cancelled = true
      engine.terminate()
      engineRef.current = null
      setLoaded(false)
    }
  }, [enabled])

  // Analyze the current position
  useEffect(() => {
    const engine = engineRef.current
    if (!enabled || !loaded || !engine) return
    engine.analyze(fen, setAnalysis)
    return () => engine.stop()
  }, [fen, enabled, loaded])

  const status: EngineStatus = !enabled ? 'off' : failed ? 'error' : loaded ? 'ready' : 'loading'
  // Never show an evaluation that belongs to another position
  const current = analysis && analysis.fen === fen ? analysis : null

  return { status, analysis: enabled ? current : null }
}
