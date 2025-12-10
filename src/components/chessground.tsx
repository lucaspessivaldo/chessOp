import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react'
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

export const Chessground = forwardRef<ChessgroundRef, ChessgroundProps>(
  ({ config, className, onMove }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const apiRef = useRef<Api | null>(null)
    const [isReady, setIsReady] = useState(false)

    useImperativeHandle(ref, () => ({
      get api() {
        return apiRef.current
      },
    }))

    // Check if container has valid dimensions
    const checkDimensions = useCallback(() => {
      if (!containerRef.current) return false
      const rect = containerRef.current.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }, [])

    useEffect(() => {
      if (!containerRef.current) return

      // Wait for valid dimensions before initializing
      const initializeWhenReady = () => {
        if (!checkDimensions()) {
          // Use requestAnimationFrame to wait for layout
          requestAnimationFrame(initializeWhenReady)
          return
        }

        // Strip shapes from initial config to prevent NaN errors
        // Shapes will be applied after board dimensions are properly calculated
        const { drawable, ...restConfig } = config || {}
        const initialDrawable = drawable ? {
          ...drawable,
          autoShapes: [], // Don't render shapes on initial mount
          shapes: [], // Also clear manual shapes
        } : undefined

        const mergedConfig: Config = {
          ...restConfig,
          drawable: initialDrawable,
          events: {
            ...config?.events,
            move: (orig, dest) => {
              config?.events?.move?.(orig, dest)
              onMove?.(orig, dest)
            },
          },
        }

        apiRef.current = ChessgroundApi(containerRef.current!, mergedConfig)

        // Defer setting ready state to allow chessground to fully initialize
        // and compute board dimensions before shapes are applied
        requestAnimationFrame(() => {
          setIsReady(true)
        })
      }

      initializeWhenReady()

      return () => {
        apiRef.current?.destroy()
        apiRef.current = null
        setIsReady(false)
      }
    }, [])

    // Update config when it changes (excluding initial mount)
    // This includes applying shapes after the board is ready
    useEffect(() => {
      if (apiRef.current && config && isReady) {
        // Only apply config if the board has valid dimensions
        // This prevents NaN errors when shapes are calculated
        if (checkDimensions()) {
          apiRef.current.set(config)
        }
      }
    }, [config, isReady, checkDimensions])

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

