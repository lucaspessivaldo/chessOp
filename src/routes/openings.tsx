import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Chessground, type ChessgroundRef } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { useOpeningStudy } from '@/hooks/use-opening-study'
import { useOpeningPractice } from '@/hooks/use-opening-practice'
import type { OpeningStudy, OpeningMode } from '@/types/opening'
import {
  ModeToggle,
  MoveList,
  CompactMoveList,
  CommentPanel,
  OpeningSelector,
  OpeningEditor,
} from '@/components/opening'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  RotateCcw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronDown,
  Edit,
  Milestone,
} from 'lucide-react'

export const Route = createFileRoute('/openings')({
  component: OpeningsPage,
})

type PageView = 'selector' | 'study' | 'editor'

function OpeningsPage() {
  const [view, setView] = useState<PageView>('selector')
  const [selectedStudy, setSelectedStudy] = useState<OpeningStudy | null>(null)
  const [mode, setMode] = useState<OpeningMode>('study')

  const handleSelectStudy = (study: OpeningStudy) => {
    setSelectedStudy(study)
    setView('study')
    setMode('study')
  }

  const handleCreateNew = () => {
    setView('editor')
  }

  const handleSaveEditor = (study: OpeningStudy) => {
    setSelectedStudy(study)
    setView('study')
    setMode('study')
  }

  const handleCancelEditor = () => {
    if (selectedStudy) {
      setView('study')
    } else {
      setView('selector')
    }
  }

  const handleBackToSelector = () => {
    setSelectedStudy(null)
    setView('selector')
  }

  const handleEditStudy = () => {
    setView('editor')
  }

  // Render based on current view
  if (view === 'selector') {
    return (
      <div className="min-h-screen bg-zinc-900 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Opening Studies</h1>
          <p className="text-zinc-400 mb-8">
            Select an opening to study or practice, or create your own repertoire.
          </p>
          <OpeningSelector onSelect={handleSelectStudy} onCreateNew={handleCreateNew} />
        </div>
      </div>
    )
  }

  if (view === 'editor') {
    return (
      <OpeningEditor
        initialStudy={selectedStudy || undefined}
        onSave={handleSaveEditor}
        onCancel={handleCancelEditor}
      />
    )
  }

  // Study view
  if (!selectedStudy) return null

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToSelector}
              className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{selectedStudy.name}</h1>
              <p className="text-sm text-zinc-400">
                Playing as {selectedStudy.color}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleEditStudy}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <ModeToggle mode={mode} onModeChange={setMode} />
          </div>
        </div>
      </div>

      {/* Content */}
      {mode === 'study' ? (
        <StudyView study={selectedStudy} />
      ) : (
        <PracticeView study={selectedStudy} onComplete={() => setMode('study')} />
      )}
    </div>
  )
}

// Study Mode View
interface StudyViewProps {
  study: OpeningStudy
}

function StudyView({ study }: StudyViewProps) {
  const {
    currentPath,
    currentComment,
    moveInfo,
    availableMoves,
    chessgroundConfig,
    makeMove,
    goToPreviousMove,
    goToStart,
    goToEnd,
    goToNode,
    goToMainLine,
    isUserTurn,
  } = useOpeningStudy({ study })

  // Check if we've reached the end of the line
  const isComplete = availableMoves.length === 0

  return (
    <div className="flex justify-center gap-8 p-6">
      {/* Chessboard */}
      <div className="relative h-[600px] w-[600px] shrink-0 rounded-sm">
        <Chessground config={chessgroundConfig} onMove={makeMove} />

        {/* Status overlay */}
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm">
            <div className="bg-zinc-800 rounded-lg p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-white font-medium mb-4">Line complete!</p>
              <button
                onClick={goToStart}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Start again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-[350px] space-y-4">
        {/* Progress */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Position</span>
            <span className="text-sm text-white">
              Move {moveInfo.current} / {moveInfo.total}
            </span>
          </div>
          {!moveInfo.isMainLine && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-500">In variation</span>
              <button
                onClick={goToMainLine}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Return to main line
              </button>
            </div>
          )}
        </div>

        {/* Status message */}
        {!isComplete && isUserTurn && (
          <div className="rounded-lg bg-green-900/30 border border-green-700 p-4">
            <p className="text-sm text-green-400 text-center">
              Your turn — arrows show the correct moves
            </p>
          </div>
        )}

        {/* Move List */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Moves</h3>
          <MoveList
            moves={study.moves}
            currentPath={currentPath}
            onMoveClick={goToNode}
          />
        </div>

        {/* Commentary */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Commentary</h3>
          <CommentPanel comment={currentComment} />
        </div>

        {/* Navigation Controls */}
        <div className="flex gap-2">
          <button
            onClick={goToStart}
            className="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-700 px-3 py-2.5 text-white hover:bg-zinc-600 transition-colors"
            title="Start again"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={goToPreviousMove}
            disabled={currentPath.length === 0}
            className="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-700 px-3 py-2.5 text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous move"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToEnd}
            className="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-700 px-3 py-2.5 text-white hover:bg-zinc-600 transition-colors"
            title="Go to end"
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <p className="text-xs text-zinc-500 text-center">
          Play moves on the board • Arrows show correct moves
        </p>
      </div>
    </div>
  )
}

// Practice Mode View
interface PracticeViewProps {
  study: OpeningStudy
  onComplete: () => void
}

function PracticeView({ study, onComplete }: PracticeViewProps) {
  const chessgroundRef = useRef<ChessgroundRef>(null)
  const [showLineSelector, setShowLineSelector] = useState(false)

  const {
    status,
    wrongAttempts,
    showWrongMove,
    boardKey,
    currentLine,
    currentLineIndex,
    allLines,
    progressInfo,
    completedLines,
    userColor,
    chessgroundConfig,
    makeMove,
    resetLine,
    nextLine,
    selectLine,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
    turnColor,
  } = useOpeningPractice({
    study,
    onLineComplete: () => {
      console.log('Line completed!')
    },
    onAllLinesComplete: () => {
      console.log('All lines completed!')
    },
  })

  // Format line name for display
  const getLineName = (line: typeof currentLine, index: number) => {
    if (line.length === 0) return `Line ${index + 1}`
    const moves = line.slice(0, 4).map(m => m.san).join(' ')
    return line.length > 4 ? `${moves}...` : moves
  }

  return (
    <div className="flex justify-center gap-8 p-6">
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={turnColor}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {/* Chessboard */}
      <div className={`h-[600px] w-[600px] shrink-0 rounded-sm transition-all duration-200 ${showWrongMove ? 'ring-4 ring-red-500 animate-shake' : ''
        }`}>
        <Chessground
          key={boardKey}
          ref={chessgroundRef}
          config={chessgroundConfig}
          onMove={makeMove}
        />
      </div>

      {/* Sidebar */}
      <div className="w-[350px] space-y-4">
        {/* Progress Overview */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-400">Progress</span>
            <span className="text-sm text-white">
              {progressInfo.completedLines} / {progressInfo.totalLines} lines completed
            </span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progressInfo.completedLines / progressInfo.totalLines) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Line Selector */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <button
            onClick={() => setShowLineSelector(!showLineSelector)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <span className="text-sm text-zinc-400">Current Line</span>
              <p className="text-white font-medium">
                Line {currentLineIndex + 1}: {getLineName(currentLine, currentLineIndex)}
              </p>
            </div>
            <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform ${showLineSelector ? 'rotate-180' : ''
              }`} />
          </button>

          {showLineSelector && (
            <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto">
              {allLines.map((line, index) => (
                <button
                  key={index}
                  onClick={() => {
                    selectLine(index)
                    setShowLineSelector(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${index === currentLineIndex
                    ? 'bg-blue-600 text-white'
                    : completedLines.has(index)
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {completedLines.has(index) && <CheckCircle className="h-4 w-4" />}
                    Line {index + 1}: {getLineName(line, index)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Moves */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Moves</h3>
          <CompactMoveList
            line={currentLine}
            currentMoveIndex={progressInfo.currentMove}
            startColor={study.color === 'white' ? 'white' : 'black'}
          />
        </div>

        {/* Status */}
        <div className="rounded-lg bg-zinc-800 p-4">
          {status === 'playing' && (
            <div className={`rounded-md p-4 text-center transition-colors ${showWrongMove ? 'bg-red-500/20' : 'bg-blue-500/20'
              }`}>
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
                <p className="text-blue-400 font-medium">
                  Your turn as {userColor} - find the correct move!
                </p>
              )}
            </div>
          )}

          {status === 'line-complete' && (
            <div className="rounded-md bg-green-500/20 p-4 text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <p className="text-green-400 font-medium">Line completed!</p>
              {wrongAttempts > 0 && (
                <p className="text-xs text-zinc-400 mt-1">
                  With {wrongAttempts} wrong {wrongAttempts === 1 ? 'attempt' : 'attempts'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={resetLine}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Line
            </button>
            {status === 'line-complete' && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 transition-colors"
              >
                Next Line
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* All lines completed */}
          {progressInfo.completedLines === progressInfo.totalLines && (
            <button
              onClick={onComplete}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <Milestone className="h-4 w-4" />
              All Lines Completed! Return to Study Mode
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
