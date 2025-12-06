import { createFileRoute } from '@tanstack/react-router'
import { Chessground } from '@/components/chessground'
import { useChess } from '@/hooks/use-chess'
import { PromotionDialog } from '@/components/promotion-dialog'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const {
    chessgroundConfig,
    makeMove,
    reset,
    undo,
    turnColor,
    inCheck,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
  } = useChess({
    onMove: (from, to) => {
      console.log(`Move: ${from} -> ${to}`)
    },
    onGameOver: () => {
      console.log('Game over!')
    },
  })

  return (
    <div className="flex min-h-screen bg-zinc-900 p-6">
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={turnColor}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      <div className="mx-auto flex items-center gap-8">
        {/* Chessboard */}
        <div className="h-[600px] w-[600px] shrink-0">
          <Chessground config={chessgroundConfig} onMove={makeMove} />
        </div>

        {/* Sidebar */}
        <div className="flex h-[600px] w-[320px] flex-col rounded-lg bg-zinc-800 p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">ChessOp</h1>
            <p className="text-sm text-zinc-400">Practice chess openings</p>
          </div>

          {/* Game Info */}
          <div className="mb-6 rounded-md bg-zinc-700/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Turn</span>
              <span className="font-medium text-white capitalize">{turnColor}</span>
            </div>
            {inCheck && (
              <div className="mt-2 text-center">
                <span className="text-red-500 font-semibold">Check!</span>
              </div>
            )}
          </div>

          {/* Move History Placeholder */}
          <div className="mb-6 flex-1 overflow-y-auto rounded-md bg-zinc-700/50 p-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-400">Moves</h2>
            <p className="text-xs text-zinc-500">Move history will appear here...</p>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={undo}
              className="flex-1 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              Undo
            </button>
            <button
              onClick={reset}
              className="flex-1 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
