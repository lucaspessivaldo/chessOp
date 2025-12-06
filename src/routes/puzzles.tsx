import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Chessground } from '@/components/chessground'
import { usePuzzle } from '@/hooks/use-puzzle'
import { PromotionDialog } from '@/components/promotion-dialog'
import { loadPuzzles } from '@/lib/puzzle-utils'
import type { Puzzle } from '@/types/puzzle'
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle } from 'lucide-react'

export const Route = createFileRoute('/puzzles')({
  component: PuzzlesPage,
})

function PuzzlesPage() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPuzzles().then((data) => {
      setPuzzles(data)
      setLoading(false)
    })
  }, [])

  const goToNext = () => {
    if (currentIndex < puzzles.length - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <p className="text-white">Loading puzzles...</p>
      </div>
    )
  }

  if (puzzles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <p className="text-white">No puzzles found</p>
      </div>
    )
  }

  return (
    <PuzzleView
      key={puzzles[currentIndex].PuzzleId}
      puzzle={puzzles[currentIndex]}
      puzzleNumber={currentIndex + 1}
      totalPuzzles={puzzles.length}
      onNext={goToNext}
      onPrevious={goToPrevious}
      hasNext={currentIndex < puzzles.length - 1}
      hasPrevious={currentIndex > 0}
    />
  )
}

interface PuzzleViewProps {
  puzzle: Puzzle
  puzzleNumber: number
  totalPuzzles: number
  onNext: () => void
  onPrevious: () => void
  hasNext: boolean
  hasPrevious: boolean
}

function PuzzleView({
  puzzle,
  puzzleNumber,
  totalPuzzles,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: PuzzleViewProps) {
  const {
    chessgroundConfig,
    makeMove,
    reset,
    status,
    userColor,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
    turnColor,
  } = usePuzzle({
    puzzle,
    onComplete: () => {
      console.log('Puzzle completed!')
    },
    onFail: () => {
      console.log('Puzzle failed!')
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
            <h1 className="text-2xl font-bold text-white">Puzzle Training</h1>
            <p className="text-sm text-zinc-400">
              Puzzle {puzzleNumber} of {totalPuzzles}
            </p>
          </div>

          {/* Puzzle Info */}
          <div className="mb-6 space-y-3 rounded-md bg-zinc-700/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Rating</span>
              <span className="font-medium text-white">{puzzle.Rating}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Playing as</span>
              <span className="font-medium text-white capitalize">{userColor}</span>
            </div>
            {puzzle.Themes && (
              <div className="pt-2 border-t border-zinc-600">
                <span className="text-sm text-zinc-400 block mb-2">Themes</span>
                <div className="flex flex-wrap gap-1">
                  {puzzle.Themes.split(' ').map((theme) => (
                    <span
                      key={theme}
                      className="rounded bg-zinc-600 px-2 py-0.5 text-xs text-zinc-300"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mb-6 flex-1">
            {status === 'playing' && (
              <div className="rounded-md bg-blue-500/20 p-4 text-center">
                <p className="text-blue-400 font-medium">Your turn - find the best move!</p>
              </div>
            )}
            {status === 'completed' && (
              <div className="rounded-md bg-green-500/20 p-4 text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
                <p className="text-green-400 font-medium">Correct! Puzzle solved!</p>
              </div>
            )}
            {status === 'failed' && (
              <div className="rounded-md bg-red-500/20 p-4 text-center">
                <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                <p className="text-red-400 font-medium">Incorrect move. Try again!</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Reset / Retry */}
            {status === 'failed' && (
              <button
                onClick={reset}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Skip (always available) */}
            {status === 'playing' && (
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="w-full rounded-md bg-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip this puzzle
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
