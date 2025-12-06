import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Chessground as ChessgroundApi } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'

// Import chessground styles
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.brown.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'

export interface ChessgroundRef {
  api: Api | null
}

export interface ChessgroundProps {
  config?: Config
  className?: string
  onMove?: (orig: string, dest: string) => void
}

export const Chessground = forwardRef<ChessgroundRef, ChessgroundProps>(
  ({ config, className, onMove }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const apiRef = useRef<Api | null>(null)

    useImperativeHandle(ref, () => ({
      get api() {
        return apiRef.current
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const mergedConfig: Config = {
        ...config,
        events: {
          ...config?.events,
          move: (orig, dest) => {
            config?.events?.move?.(orig, dest)
            onMove?.(orig, dest)
          },
        },
      }

      apiRef.current = ChessgroundApi(containerRef.current, mergedConfig)

      return () => {
        apiRef.current?.destroy()
        apiRef.current = null
      }
    }, [])

    // Update config when it changes (excluding initial mount)
    useEffect(() => {
      if (apiRef.current && config) {
        apiRef.current.set(config)
      }
    }, [config])

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: '100%', height: '100%' }}
      />
    )
  }
)

Chessground.displayName = 'Chessground'
