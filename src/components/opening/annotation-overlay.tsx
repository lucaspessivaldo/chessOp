import { useRef, useState } from 'react'
import type { BoardShape } from '@/types/opening'
import { BRUSHES } from '@/lib/board-shapes'

const FILES = 'abcdefgh'

interface AnnotationOverlayProps {
  orientation: 'white' | 'black'
  brush: string
  /** A finished shape: a circle (same square) or an arrow (two squares) */
  onShape: (shape: BoardShape) => void
  /** The shape being drawn, to preview it on the board */
  onPreview: (shape: BoardShape | null) => void
}

function squareCoords(square: string, orientation: 'white' | 'black') {
  const file = FILES.indexOf(square[0])
  const rank = Number(square[1]) - 1
  return orientation === 'white' ? { x: file, y: 7 - rank } : { x: 7 - file, y: rank }
}

/**
 * Transparent layer over the board for drawing with a tap or a drag (works on touch screens).
 * Drag from one square to another for an arrow, or tap the first square and then the second one.
 * Tapping the same square twice draws a circle; drawing an existing shape again removes it.
 */
export function AnnotationOverlay({ orientation, brush, onShape, onPreview }: AnnotationOverlayProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState<string | null>(null)
  // A tap without a drag keeps the origin selected, waiting for a second tap
  const dragged = useRef(false)

  const squareAt = (e: React.PointerEvent): string | null => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return null
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 8)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 8)
    if (x < 0 || x > 7 || y < 0 || y > 7) return null
    return orientation === 'white' ? `${FILES[x]}${8 - y}` : `${FILES[7 - x]}${y + 1}`
  }

  const finish = (orig: string, dest: string) => {
    onShape(orig === dest ? { orig, brush } : { orig, dest, brush })
    onPreview(null)
    setOrigin(null)
  }

  const highlight = origin ? squareCoords(origin, orientation) : null
  const color = BRUSHES.find(b => b.id === brush)?.color ?? BRUSHES[0].color

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-10 cursor-crosshair"
      style={{ touchAction: 'none' }}
      onContextMenu={e => e.preventDefault()}
      onPointerDown={e => {
        const square = squareAt(e)
        if (!square) return
        e.currentTarget.setPointerCapture(e.pointerId)
        dragged.current = false
        if (origin) {
          // Second tap: same square for a circle, another one for an arrow
          finish(origin, square)
          return
        }
        setOrigin(square)
      }}
      onPointerMove={e => {
        if (!origin || !e.currentTarget.hasPointerCapture(e.pointerId)) return
        const square = squareAt(e)
        if (!square) return
        if (square !== origin) dragged.current = true
        onPreview(square === origin ? null : { orig: origin, dest: square, brush })
      }}
      onPointerUp={e => {
        if (!origin) return
        const square = squareAt(e)
        if (dragged.current && square && square !== origin) finish(origin, square)
      }}
    >
      {highlight && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${highlight.x * 12.5}%`,
            top: `${highlight.y * 12.5}%`,
            width: '12.5%',
            height: '12.5%',
            boxShadow: `inset 0 0 0 3px ${color}`,
          }}
        />
      )}
    </div>
  )
}
