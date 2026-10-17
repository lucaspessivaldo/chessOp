import { useEffect, useLayoutEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { Chessground as ChessgroundApi } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'

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
  onMove?: (orig: Key, dest: Key) => void
}

/**
 * React wrapper around Chessground.
 *
 * The board is created once its container has a size (shapes need real dimensions).
 * After every user move the latest config is re-applied on the next frame, so a move
 * rejected by the parent (wrong move, pending promotion) snaps back automatically.
 */
export const Chessground = forwardRef<ChessgroundRef, ChessgroundProps>(
  ({ config, className, onMove }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const apiRef = useRef<Api | null>(null)
    const configRef = useRef(config)
    const onMoveRef = useRef(onMove)
    const [isReady, setIsReady] = useState(false)

    useLayoutEffect(() => {
      configRef.current = config
      onMoveRef.current = onMove
    })

    useImperativeHandle(ref, () => ({
      get api() {
        return apiRef.current
      },
    }))

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      let resyncFrame = 0

      const init = () => {
        if (apiRef.current) return
        const { drawable, ...rest } = configRef.current ?? {}
        apiRef.current = ChessgroundApi(container, {
          ...rest,
          // Shapes are applied once the board has its final dimensions
          drawable: drawable ? { ...drawable, autoShapes: [], shapes: [] } : undefined,
          events: {
            ...configRef.current?.events,
            move: (orig, dest) => {
              configRef.current?.events?.move?.(orig, dest)
              onMoveRef.current?.(orig, dest)
              cancelAnimationFrame(resyncFrame)
              resyncFrame = requestAnimationFrame(() => {
                if (apiRef.current && configRef.current) apiRef.current.set(configRef.current)
              })
            },
          },
        })
        setIsReady(true)
      }

      const observer = new ResizeObserver(entries => {
        const rect = entries[0]?.contentRect
        if (!rect || rect.width === 0 || rect.height === 0) return
        if (!apiRef.current) {
          init()
        } else {
          apiRef.current.redrawAll()
        }
      })
      observer.observe(container)

      return () => {
        observer.disconnect()
        cancelAnimationFrame(resyncFrame)
        apiRef.current?.destroy()
        apiRef.current = null
        setIsReady(false)
      }
    }, [])

    // Apply config changes once the board is ready
    useEffect(() => {
      if (apiRef.current && config && isReady) {
        apiRef.current.set(config)
      }
    }, [config, isReady])

    return (
      <div
        ref={containerRef}
        className={`aspect-square ${className || ''}`}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      />
    )
  }
)

Chessground.displayName = 'Chessground'
