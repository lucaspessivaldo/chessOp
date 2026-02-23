import type { Color } from '@lichess-org/chessground/types'

export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

interface PromotionDialogProps {
  color: Color
  onSelect: (piece: PromotionPiece) => void
  onCancel: () => void
}

const pieces: { piece: PromotionPiece; name: string }[] = [
  { piece: 'q', name: 'Queen' },
  { piece: 'r', name: 'Rook' },
  { piece: 'b', name: 'Bishop' },
  { piece: 'n', name: 'Knight' },
]

// Unicode chess pieces
const pieceSymbols: Record<Color, Record<PromotionPiece, string>> = {
  white: { q: '♕', r: '♖', b: '♗', n: '♘' },
  black: { q: '♛', r: '♜', b: '♝', n: '♞' },
}

export function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-2 rounded-xl bg-surface-1 p-4 shadow-2xl border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-sm font-medium text-text-secondary mb-2">
          Promote to:
        </p>
        <div className="flex gap-2">
          {pieces.map(({ piece, name }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-2 text-5xl transition-all hover:bg-surface-3 hover:scale-105"
              title={name}
            >
              {pieceSymbols[color][piece]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
