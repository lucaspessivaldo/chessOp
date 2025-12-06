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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="flex flex-col gap-2 rounded-lg bg-zinc-800 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-sm font-medium text-zinc-400 mb-2">
          Promote to:
        </p>
        <div className="flex gap-2">
          {pieces.map(({ piece, name }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="flex h-16 w-16 items-center justify-center rounded-md bg-zinc-700 text-5xl transition-colors hover:bg-zinc-600"
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
