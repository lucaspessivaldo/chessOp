import { Chessground } from '@/components/chessground'
import { useChess } from '@/hooks/use-chess'

function App() {
  const { chessgroundConfig, makeMove, reset, undo, turnColor, inCheck } = useChess({
    onMove: (from, to) => {
      console.log(`Move: ${from} -> ${to}`)
    },
    onGameOver: () => {
      console.log('Game over!')
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 p-8">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold text-white">ChessOp</h1>
        <p className="text-zinc-400">Practice chess openings</p>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">
            Turn: <span className="font-medium text-white">{turnColor}</span>
          </span>
          {inCheck && <span className="text-red-500 font-medium">Check!</span>}
        </div>

        <div className="h-[400px] w-[400px]">
          <Chessground config={chessgroundConfig} onMove={makeMove} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={undo}
            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
          >
            Undo
          </button>
          <button
            onClick={reset}
            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
