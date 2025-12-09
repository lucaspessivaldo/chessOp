import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Chessground, type ChessgroundRef } from '@/components/chessground'
import { usePuzzle } from '@/hooks/use-puzzle'
import { PromotionDialog } from '@/components/promotion-dialog'
import { loadPuzzles } from '@/lib/puzzle-utils'
import type { Puzzle } from '@/types/puzzle'
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle, SlidersHorizontal, Lightbulb, ChevronDown } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

export const Route = createFileRoute('/puzzles')({
  component: PuzzlesPage,
})

const MIN_RATING = 400
const MAX_RATING = 3000

type ThemeFilter = 'all' | 'promotion' | 'mate'

function PuzzlesPage() {
  const [allPuzzles, setAllPuzzles] = useState<Puzzle[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [ratingRange, setRatingRange] = useState<[number, number]>([800, 2000])
  const [showFilters, setShowFilters] = useState(false)
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>('all')

  useEffect(() => {
    loadPuzzles().then((data) => {
      setAllPuzzles(data)
      setLoading(false)
    })
  }, [])

  // Filter and shuffle puzzles by rating range and theme
  const puzzles = useMemo(() => {
    const filtered = allPuzzles.filter((puzzle) => {
      const rating = parseInt(puzzle.Rating, 10)
      const inRatingRange = rating >= ratingRange[0] && rating <= ratingRange[1]

      if (!inRatingRange) return false

      // Theme filter
      if (themeFilter === 'all') return true

      const themes = puzzle.Themes?.toLowerCase() || ''
      if (themeFilter === 'promotion') {
        return themes.includes('promotion')
      }
      if (themeFilter === 'mate') {
        return themes.includes('matein1') || themes.includes('matein2')
      }

      return true
    })
    // Shuffle using Fisher-Yates algorithm
    const shuffled = [...filtered]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [allPuzzles, ratingRange, themeFilter])

  // Reset to first puzzle when filters change
  useEffect(() => {
    setCurrentIndex(0)
  }, [ratingRange, themeFilter])

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 pt-14">
        <p className="text-white">Loading puzzles...</p>
      </div>
    )
  }

  if (puzzles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 pt-14">
        <div className="text-center px-4">
          <p className="text-white mb-4">No puzzles found with current filters</p>
          <button
            onClick={() => {
              setRatingRange([MIN_RATING, MAX_RATING])
              setThemeFilter('all')
            }}
            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors touch-target"
          >
            Reset Filters
          </button>
        </div>
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
      ratingRange={ratingRange}
      onRatingRangeChange={setRatingRange}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      themeFilter={themeFilter}
      onThemeFilterChange={setThemeFilter}
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
  ratingRange: [number, number]
  onRatingRangeChange: (range: [number, number]) => void
  showFilters: boolean
  onToggleFilters: () => void
  themeFilter: ThemeFilter
  onThemeFilterChange: (filter: ThemeFilter) => void
}

function PuzzleView({
  puzzle,
  puzzleNumber,
  totalPuzzles,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  ratingRange,
  onRatingRangeChange,
  showFilters,
  onToggleFilters,
  themeFilter,
  onThemeFilterChange,
}: PuzzleViewProps) {
  const chessgroundRef = useRef<ChessgroundRef>(null)
  const [showInfo, setShowInfo] = useState(false)

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
    showHint,
    requestHint,
    boardKey,
    wrongAttempts,
    showWrongMove,
  } = usePuzzle({
    puzzle,
    chessgroundRef,
    onComplete: () => {
      console.log('Puzzle completed!')
    },
    onFail: () => {
      console.log('Puzzle failed!')
    },
  })

  return (
    <div className="min-h-screen bg-zinc-900 pt-14 md:pt-16">
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={turnColor}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-[calc(100vh-3.5rem)] safe-bottom">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              #{puzzleNumber}
            </span>
            <span className="text-xs text-zinc-400">
              Rating: {puzzle.Rating}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-md transition-colors touch-target ${showInfo ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showInfo ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={onToggleFilters}
              className={`p-2 rounded-md transition-colors touch-target ${showFilters ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Info Panel */}
        {showInfo && (
          <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Playing as</span>
              <span className="text-white capitalize">{userColor}</span>
            </div>
            {puzzle.Themes && (
              <div className="flex flex-wrap gap-1">
                {puzzle.Themes.split(' ').slice(0, 4).map((theme) => (
                  <span
                    key={theme}
                    className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Filters Panel */}
        {showFilters && (
          <div className="px-3 py-3 bg-zinc-800/50 border-b border-zinc-700 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">Rating Range</span>
                <span className="text-xs text-zinc-500">
                  {ratingRange[0]} - {ratingRange[1]}
                </span>
              </div>
              <Slider
                value={ratingRange}
                onValueChange={(value) => onRatingRangeChange(value as [number, number])}
                min={MIN_RATING}
                max={MAX_RATING}
                step={50}
                className="w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'promotion', 'mate'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => onThemeFilterChange(filter)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors touch-target ${themeFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-700 text-zinc-300'
                    }`}
                >
                  {filter === 'all' ? 'All' : filter === 'promotion' ? 'Promotion' : 'Mate'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chessboard - Takes remaining space */}
        <div className="flex-1 flex items-center justify-center p-2">
          <div className={`chess-board-container rounded-sm transition-all duration-200 ${showWrongMove ? 'ring-4 ring-red-500 animate-shake' : ''}`}>
            <Chessground key={boardKey} ref={chessgroundRef} config={chessgroundConfig} onMove={makeMove} />
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-3 py-2">
          {status === 'playing' && (
            <div className={`rounded-lg px-4 py-2 text-center ${showWrongMove ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
              {showWrongMove ? (
                <p className="text-red-400 font-medium text-sm flex items-center justify-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Wrong move! Try again.
                </p>
              ) : wrongAttempts > 0 ? (
                <p className="text-blue-400 font-medium text-sm">
                  Keep trying! ({wrongAttempts} wrong)
                </p>
              ) : (
                <p className="text-blue-400 font-medium text-sm">Your turn - find the best move!</p>
              )}
            </div>
          )}
          {status === 'completed' && (
            <div className="rounded-lg bg-green-500/20 px-4 py-2 text-center">
              <p className="text-green-400 font-medium text-sm flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Puzzle solved!
                {wrongAttempts > 0 && ` (${wrongAttempts} wrong)`}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="px-3 py-3 bg-zinc-800 border-t border-zinc-700 space-y-2">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-700 py-3 text-sm font-medium text-white active:bg-zinc-600 transition-colors touch-target"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            {status === 'playing' && (
              <button
                onClick={requestHint}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-colors touch-target ${showHint
                  ? 'bg-yellow-600 text-white'
                  : 'bg-zinc-700 text-white'
                  }`}
              >
                <Lightbulb className="h-4 w-4" />
                Hint
              </button>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-zinc-700 py-3 text-sm font-medium text-white active:bg-zinc-600 transition-colors disabled:opacity-40 touch-target"
            >
              <ChevronLeft className="h-5 w-5" />
              Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white active:bg-blue-500 transition-colors disabled:opacity-40 touch-target"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-[calc(100vh-4rem)] p-6">
        <div className="mx-auto flex items-center gap-8">
          {/* Chessboard */}
          <div className={`h-[600px] w-[600px] shrink-0 rounded-sm transition-all duration-200 ${showWrongMove ? 'ring-4 ring-red-500 animate-shake' : ''}`}>
            <Chessground key={boardKey} ref={chessgroundRef} config={chessgroundConfig} onMove={makeMove} />
          </div>

          {/* Sidebar */}
          <div className="flex h-[600px] w-[320px] flex-col rounded-lg bg-zinc-800 p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Puzzle Training</h1>
                <p className="text-sm text-zinc-400">
                  Puzzle {puzzleNumber} of {totalPuzzles}
                </p>
              </div>
              <button
                onClick={onToggleFilters}
                className={`rounded-md p-2 transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                title="Filter by rating"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>
            </div>

            {/* Rating Filter */}
            {showFilters && (
              <div className="mb-6 rounded-md bg-zinc-700/50 p-4 space-y-4">
                {/* Rating Range */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-zinc-300">Rating Range</span>
                    <span className="text-sm text-zinc-400">
                      {ratingRange[0]} - {ratingRange[1]}
                    </span>
                  </div>
                  <Slider
                    value={ratingRange}
                    onValueChange={(value) => onRatingRangeChange(value as [number, number])}
                    min={MIN_RATING}
                    max={MAX_RATING}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>{MIN_RATING}</span>
                    <span>{MAX_RATING}</span>
                  </div>
                </div>

                {/* Theme Filter */}
                <div>
                  <span className="text-sm font-medium text-zinc-300 block mb-3">Theme</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onThemeFilterChange('all')}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${themeFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500'
                        }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => onThemeFilterChange('promotion')}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${themeFilter === 'promotion'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500'
                        }`}
                    >
                      Promotion
                    </button>
                    <button
                      onClick={() => onThemeFilterChange('mate')}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${themeFilter === 'mate'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-600 text-zinc-300 hover:bg-zinc-500'
                        }`}
                    >
                      Mate in 1-2
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                <div className={`rounded-md p-4 text-center transition-colors ${showWrongMove ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                  {showWrongMove ? (
                    <>
                      <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                      <p className="text-red-400 font-medium">Wrong move! Try again.</p>
                    </>
                  ) : wrongAttempts > 0 ? (
                    <>
                      <p className="text-blue-400 font-medium">Keep trying!</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {wrongAttempts} wrong {wrongAttempts === 1 ? 'attempt' : 'attempts'}
                      </p>
                    </>
                  ) : (
                    <p className="text-blue-400 font-medium">Your turn - find the best move!</p>
                  )}
                </div>
              )}
              {status === 'completed' && (
                <div className="rounded-md bg-green-500/20 p-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
                  <p className="text-green-400 font-medium">Correct! Puzzle solved!</p>
                  {wrongAttempts > 0 && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Solved with {wrongAttempts} wrong {wrongAttempts === 1 ? 'attempt' : 'attempts'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-3">
              {/* Reset and Hint */}
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                {status === 'playing' && (
                  <button
                    onClick={requestHint}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${showHint
                      ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                      : 'bg-zinc-700 text-white hover:bg-zinc-600'
                      }`}
                  >
                    <Lightbulb className="h-4 w-4" />
                    Hint
                  </button>
                )}
              </div>

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
    </div>
  )
}
