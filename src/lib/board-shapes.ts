/**
 * Board annotations (arrows and circles): brushes, PGN commands and editing helpers
 */
import type { BoardShape } from '@/types/opening'

export interface Brush {
  id: string
  label: string
  /** Swatch color in the UI (matches Chessground's brush) */
  color: string
  /** Letter used by PGN [%cal] / [%csl] commands */
  code: string
}

export const BRUSHES: Brush[] = [
  { id: 'green', label: 'Green', color: '#15781B', code: 'G' },
  { id: 'red', label: 'Red', color: '#882020', code: 'R' },
  { id: 'blue', label: 'Blue', color: '#003088', code: 'B' },
  { id: 'yellow', label: 'Yellow', color: '#e68f00', code: 'Y' },
]

const SQUARE = /^[a-h][1-8]$/

function brushFromCode(code: string): string | null {
  return BRUSHES.find(b => b.code === code.toUpperCase())?.id ?? null
}

/**
 * Shapes from the [%cal] (arrows) and [%csl] (squares) commands of a PGN comment
 */
export function shapesFromPgn(arrows: string[] = [], squares: string[] = []): BoardShape[] | undefined {
  const shapes: BoardShape[] = []
  for (const item of squares) {
    const brush = brushFromCode(item[0] ?? '')
    const orig = item.slice(1, 3)
    if (brush && SQUARE.test(orig)) shapes.push({ orig, brush })
  }
  for (const item of arrows) {
    const brush = brushFromCode(item[0] ?? '')
    const orig = item.slice(1, 3)
    const dest = item.slice(3, 5)
    if (brush && SQUARE.test(orig) && SQUARE.test(dest)) shapes.push({ orig, dest, brush })
  }
  return shapes.length > 0 ? shapes : undefined
}

/**
 * PGN commands for a node's shapes, e.g. "[%csl Gd4][%cal Ge2e4,Rd1h5]"
 */
export function shapesToPgn(shapes: BoardShape[] = []): string {
  const code = (brush: string) => BRUSHES.find(b => b.id === brush)?.code ?? 'G'
  const squares = shapes.filter(s => !s.dest).map(s => `${code(s.brush)}${s.orig}`)
  const arrows = shapes.filter(s => s.dest).map(s => `${code(s.brush)}${s.orig}${s.dest}`)
  return [
    squares.length > 0 ? `[%csl ${squares.join(',')}]` : '',
    arrows.length > 0 ? `[%cal ${arrows.join(',')}]` : '',
  ].join('')
}

/**
 * Add a shape, recolor it when it exists in another color, or remove it when it is identical
 */
export function toggleShape(shapes: BoardShape[], shape: BoardShape): BoardShape[] {
  const same = (s: BoardShape) => s.orig === shape.orig && (s.dest ?? null) === (shape.dest ?? null)
  const existing = shapes.find(same)
  if (!existing) return [...shapes, shape]
  if (existing.brush === shape.brush) return shapes.filter(s => !same(s))
  return shapes.map(s => (same(s) ? shape : s))
}
