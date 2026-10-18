import { useCallback, useEffect, useRef, useState } from 'react'
import type { OpeningMoveNode } from '@/types/opening'
import { scanRepertoire, type RepertoireGap } from '@/lib/repertoire-gaps'

export type GapScanStatus = 'idle' | 'scanning' | 'done' | 'cancelled' | 'error'

export interface GapScanState {
  status: GapScanStatus
  gaps: RepertoireGap[]
  checked: number
  skipped: number
  error: Error | null
}

const IDLE: GapScanState = { status: 'idle', gaps: [], checked: 0, skipped: 0, error: null }

/**
 * Run a repertoire scan against the Lichess explorer. Partial results are kept when it is cancelled or fails.
 */
export function useRepertoireGapScan() {
  const [state, setState] = useState<GapScanState>(IDLE)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const start = useCallback(
    (options: { moves: OpeningMoveNode[]; rootFen: string; color: 'white' | 'black'; token: string; minShare: number }) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      setState({ ...IDLE, status: 'scanning' })

      scanRepertoire({
        ...options,
        signal: controller.signal,
        onProgress: (checked, gaps) => {
          if (!controller.signal.aborted) setState(s => ({ ...s, checked, gaps }))
        },
      })
        .then(result => {
          if (controller.signal.aborted) return
          setState({ status: 'done', error: null, ...result })
        })
        .catch(err => {
          if (controller.signal.aborted) return
          setState(s => ({ ...s, status: 'error', error: err instanceof Error ? err : new Error('Scan failed') }))
        })
    },
    []
  )

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    setState(s => (s.status === 'scanning' ? { ...s, status: 'cancelled' } : s))
  }, [])

  return { ...state, start, cancel }
}
