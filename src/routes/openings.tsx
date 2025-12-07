import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Chessground, type ChessgroundRef } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { useOpeningPractice } from '@/hooks/use-opening-practice'
import type { OpeningStudy } from '@/types/opening'
import {
  CompactMoveList,
  OpeningSelector,
  OpeningEditor,
  VariationSelector,
} from '@/components/opening'
import {
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronDown,
  Edit,
  Milestone,
  Shuffle,
  SkipForward,
  Lightbulb,
  MessageSquare,
} from 'lucide-react'

export const Route = createFileRoute('/openings')({
  component: OpeningsPage,
})

type PageView = 'selector' | 'study' | 'editor'

function OpeningsPage() {
  const [view, setView] = useState<PageView>('selector')
  const [selectedStudy, setSelectedStudy] = useState<OpeningStudy | null>(null)

  const handleSelectStudy = (study: OpeningStudy) => {
    setSelectedStudy(study)
    setView('study')
  }

  const handleCreateNew = () => {
    setView('editor')
  }

  const handleSaveEditor = (study: OpeningStudy) => {
    setSelectedStudy(study)
    setView('study')
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
          </div>
        </div>
      </div>

      {/* Content */}
      <PracticeView study={selectedStudy} />
    </div>
  )
}

// Practice Mode View
interface PracticeViewProps {
  study: OpeningStudy
}

function PracticeView({ study }: PracticeViewProps) {
  const chessgroundRef = useRef<ChessgroundRef>(null)
  const [showLineSelector, setShowLineSelector] = useState(false)
  const [randomOrder, setRandomOrder] = useState(false)
  const [showVariationSelector, setShowVariationSelector] = useState(false)
  const [selectedLineIndices, setSelectedLineIndices] = useState<number[] | undefined>(undefined)

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
    skippedLines,
    userColor,
    chessgroundConfig,
    makeMove,
    resetLine,
    nextLine,
    skipLine,
    selectLine,
    resetProgress,
    hintLevel,
    increaseHint,
    isCurrentLineSetup,
    hasPracticeStartMarker,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
    turnColor,
  } = useOpeningPractice({
    study,
    randomOrder,
    selectedLineIndices,
    onLineComplete: () => {
      console.log('Line completed!')
    },
    onAllLinesComplete: () => {
      console.log('All lines completed!')
    },
  })

  const handleStartWithSelection = (indices: number[]) => {
    setSelectedLineIndices(indices)
    setShowVariationSelector(false)
  }

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
        {/* Practice Options */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-400">Options</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVariationSelector(true)}
                className="px-3 py-1.5 rounded-md text-sm bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
              >
                Select Lines
              </button>
              <button
                onClick={() => setRandomOrder(!randomOrder)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${randomOrder
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-zinc-400 hover:text-white'
                  }`}
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </div>
          {selectedLineIndices && selectedLineIndices.length < allLines.length && (
            <p className="text-xs text-blue-400 mt-2">
              Practicing {selectedLineIndices.length} of {allLines.length + (allLines.length - selectedLineIndices.length)} lines
            </p>
          )}
        </div>

        {/* Variation Selector Modal */}
        {showVariationSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md">
              <VariationSelector
                moves={study.moves}
                onStart={handleStartWithSelection}
                onCancel={() => setShowVariationSelector(false)}
              />
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-400">Progress</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white">
                {progressInfo.completedLines} / {progressInfo.totalLines} lines
                {skippedLines.size > 0 && (
                  <span className="text-yellow-400 ml-1">({skippedLines.size} skipped)</span>
                )}
              </span>
              {(progressInfo.completedLines > 0 || skippedLines.size > 0) && (
                <button
                  onClick={resetProgress}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-white transition-colors"
                  title="Reset all progress"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Current Line</span>
                {hasPracticeStartMarker && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isCurrentLineSetup
                    ? 'bg-amber-600/30 text-amber-400'
                    : 'bg-green-600/30 text-green-400'
                    }`}>
                    {isCurrentLineSetup ? 'Setup' : 'Variation'}
                  </span>
                )}
              </div>
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
                      : skippedLines.has(index)
                        ? 'bg-yellow-600/20 text-yellow-400'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {completedLines.has(index) && <CheckCircle className="h-4 w-4" />}
                    {skippedLines.has(index) && !completedLines.has(index) && <SkipForward className="h-4 w-4" />}
                    Line {index + 1}: {getLineName(line, index)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Moves with Comment */}
        <div className="rounded-lg bg-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Moves</h3>
          <CompactMoveList
            line={currentLine}
            currentMoveIndex={progressInfo.currentMove}
            startColor={study.color === 'white' ? 'white' : 'black'}
          />
          {/* Show current move comment if exists */}
          {currentLine[progressInfo.currentMove - 1]?.comment && (
            <div className="mt-3 p-3 bg-zinc-700/50 rounded-md border-l-2 border-blue-500">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-zinc-300">
                  {currentLine[progressInfo.currentMove - 1].comment}
                </p>
              </div>
            </div>
          )}
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
          {/* Main controls row */}
          <div className="flex gap-2">
            <button
              onClick={resetLine}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-zinc-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
            <button
              onClick={increaseHint}
              disabled={hintLevel >= 3 || status !== 'playing'}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-zinc-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Hint level: ${hintLevel}/3`}
            >
              <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-yellow-400' : ''}`} />
              Hint {hintLevel > 0 && `(${hintLevel})`}
            </button>
            <button
              onClick={skipLine}
              disabled={currentLineIndex >= allLines.length - 1}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-zinc-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </button>
          </div>

          {/* Next line button when complete */}
          {status === 'line-complete' && currentLineIndex < allLines.length - 1 && (
            <button
              onClick={nextLine}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 transition-colors"
            >
              Next Line
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* All lines completed */}
          {progressInfo.completedLines === progressInfo.totalLines && (
            <div className="w-full flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white">
              <Milestone className="h-4 w-4" />
              All Lines Completed!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
