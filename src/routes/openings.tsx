import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Chessground, type ChessgroundRef } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useOpeningPractice } from '@/hooks/use-opening-practice'
import { useOpeningStudy } from '@/hooks/use-opening-study'
import { useSpeedDrill, type SpeedDrillStats } from '@/hooks/use-speed-drill'
import { useMistakesReview, getMistakesDueForReview } from '@/hooks/use-mistakes-review'
import type { OpeningStudy } from '@/types/opening'
import { getLineName } from '@/lib/opening-utils'
import { Navbar } from '@/components/navbar'
import {
  CompactMoveList,
  OpeningSelector,
  OpeningEditor,
  VariationSelector,
} from '@/components/opening'
import {
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  ChevronDown,
  Edit,
  Shuffle,
  SkipForward,
  Lightbulb,
  Play,
  BookOpen,
  Zap,
  AlertTriangle,
  Trophy,
  Clock,
  Target,
  OctagonAlert,
} from 'lucide-react'

export const Route = createFileRoute('/openings')({
  component: OpeningsPage,
})

type PageView = 'selector' | 'study' | 'editor'

interface NewStudyData {
  name: string
  description: string
  color: 'white' | 'black'
}

function OpeningsPage() {
  const [view, setView] = useState<PageView>('selector')
  const [selectedStudy, setSelectedStudy] = useState<OpeningStudy | null>(null)
  const [newStudyData, setNewStudyData] = useState<NewStudyData | null>(null)

  const handleSelectStudy = (study: OpeningStudy) => {
    setSelectedStudy(study)
    setView('study')
  }

  const handleCreateNew = (data: NewStudyData) => {
    setNewStudyData(data)
    setView('editor')
  }

  const handleSaveEditor = (study: OpeningStudy) => {
    setSelectedStudy(study)
    setNewStudyData(null)
    setView('study')
  }

  const handleCancelEditor = () => {
    setNewStudyData(null)
    if (selectedStudy) {
      setView('study')
    } else {
      setView('selector')
    }
  }

  const handleBackToSelector = () => {
    setSelectedStudy(null)
    setNewStudyData(null)
    setView('selector')
  }

  // Render based on current view
  if (view === 'selector') {
    return (
      <div className="min-h-screen bg-zinc-900 pt-14 md:pt-16 px-3 py-4 md:p-6">
        <Navbar />
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Opening Studies</h1>
          <p className="text-sm md:text-base text-zinc-400 mb-4 md:mb-8">
            Select an opening to study or practice, or create your own repertoire.
          </p>
          <OpeningSelector onSelect={handleSelectStudy} onCreateNew={handleCreateNew} />
        </div>
      </div>
    )
  }

  if (view === 'editor' && !selectedStudy && newStudyData) {
    // Only show standalone editor when creating new study (no existing study)
    // Create a partial study object with the dialog data
    const partialStudy: OpeningStudy = {
      id: '',
      name: newStudyData.name,
      description: newStudyData.description,
      color: newStudyData.color,
      moves: [],
      rootFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    return (
      <OpeningEditor
        initialStudy={partialStudy}
        onSave={handleSaveEditor}
        onCancel={handleCancelEditor}
      />
    )
  }

  // Study view
  if (!selectedStudy) return null

  return <StudyPageContent study={selectedStudy} onBack={handleBackToSelector} onStudyUpdate={handleSaveEditor} />
}

type StudyMode = 'practice' | 'study' | 'speed' | 'mistakes' | 'edit'

interface StudyPageContentProps {
  study: OpeningStudy
  onBack: () => void
  onStudyUpdate: (study: OpeningStudy) => void
}

function StudyPageContent({ study, onBack, onStudyUpdate }: StudyPageContentProps) {
  const [mode, setMode] = useState<StudyMode>('study')
  const [mistakesCount, setMistakesCount] = useState(() => getMistakesDueForReview(study.id).length)

  // Refresh mistakes count when switching to mistakes tab or periodically
  const refreshMistakesCount = () => {
    setMistakesCount(getMistakesDueForReview(study.id).length)
  }

  return (
    <div className="min-h-full bg-zinc-900 flex flex-col">
      {/* Mode Tabs - Sticky within scroll container */}
      <div className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900 px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-0.5 md:gap-1 overflow-x-auto scroll-tabs -mx-3 px-3 md:mx-0 md:px-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 border-transparent text-zinc-400 hover:text-white transition-colors whitespace-nowrap touch-target"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span className="hidden sm:inline">{study.name}</span>
            </button>
            <div className="w-px bg-zinc-800 my-2" />
            <button
              onClick={() => setMode('study')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'study'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-white'
                }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Study</span>
            </button>
            <button
              onClick={() => setMode('practice')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'practice'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-white'
                }`}
            >
              <Play className="h-4 w-4" />
              <span>Practice</span>
            </button>
            <button
              onClick={() => setMode('speed')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'speed'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-white'
                }`}
            >
              <Zap className="h-4 w-4" />
              Speed
            </button>
            <button
              onClick={() => setMode('mistakes')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'mistakes'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-white'
                }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Mistakes</span>
              <span className="sm:hidden">Fix</span>
              {mistakesCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {mistakesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'edit'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-white'
                }`}
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content based on mode */}
      <div className="flex-1">
        {mode === 'practice' && <PracticeView study={study} onMistakeMade={refreshMistakesCount} />}
        {mode === 'study' && <StudyView study={study} />}
        {mode === 'speed' && <SpeedDrillView study={study} />}
        {mode === 'mistakes' && <MistakesReviewView study={study} onMistakeCompleted={refreshMistakesCount} />}
        {mode === 'edit' && <EditView study={study} onSave={onStudyUpdate} />}
      </div>
    </div>
  )
}

// Practice Mode View
interface PracticeViewProps {
  study: OpeningStudy
  onMistakeMade?: () => void
}

function PracticeView({ study, onMistakeMade }: PracticeViewProps) {
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
    chessgroundConfig,
    makeMove,
    resetLine,
    nextLine,
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
    onMistake: () => {
      onMistakeMade?.()
    },
  })

  const handleStartWithSelection = (indices: number[]) => {
    setSelectedLineIndices(indices)
    setShowVariationSelector(false)
  }

  return (
    <>
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={turnColor}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {/* Variation Selector Modal */}
      <Dialog open={showVariationSelector} onOpenChange={setShowVariationSelector}>
        <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-md" showCloseButton={false}>
          <VariationSelector
            moves={study.moves}
            onStart={handleStartWithSelection}
            onCancel={() => setShowVariationSelector(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-full">
        {/* Options Bar */}
        <div className="px-3 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center justify-between mb-2 h-8">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">
                {progressInfo.completedLines}/{progressInfo.totalLines} lines
              </span>
              {skippedLines.size > 0 && (
                <span className="text-xs text-yellow-400">({skippedLines.size} skipped)</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVariationSelector(true)}
                className="px-2 py-1.5 rounded-md text-xs bg-zinc-700 text-zinc-300 touch-target"
              >
                Lines
              </button>
              <button
                onClick={() => setRandomOrder(!randomOrder)}
                className={`p-1.5 rounded-md transition-colors touch-target ${randomOrder ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(progressInfo.completedLines / progressInfo.totalLines) * 100}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className={`chess-board-container rounded-sm transition-all duration-200 ${showWrongMove ? 'ring-4 ring-red-500 animate-shake' : ''}`}>
            <Chessground
              key={boardKey}
              ref={chessgroundRef}
              config={chessgroundConfig}
              onMove={makeMove}
            />
          </div>
        </div>

        {/* Current Line Info */}
        <button
          onClick={() => setShowLineSelector(!showLineSelector)}
          className="mx-3 px-3 py-2 bg-zinc-800 rounded-lg flex items-center justify-between"
        >
          <div className="text-left min-w-0">
            <p className="text-xs text-zinc-400">Line {currentLineIndex + 1}</p>
            <p className="text-sm text-white font-medium truncate">{getLineName(currentLine, currentLineIndex)}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-zinc-400 shrink-0 ml-2 transition-transform ${showLineSelector ? 'rotate-180' : ''}`} />
        </button>

        {/* Line Selector Dropdown */}
        {showLineSelector && (
          <div className="mx-3 mt-1 max-h-32 overflow-y-auto bg-zinc-800 rounded-lg border border-zinc-700">
            {allLines.map((line, index) => (
              <button
                key={index}
                onClick={() => { selectLine(index); setShowLineSelector(false) }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${index === currentLineIndex ? 'bg-blue-600 text-white' : completedLines.has(index) ? 'text-green-400' : 'text-zinc-300'}`}
              >
                {completedLines.has(index) && <CheckCircle className="h-3 w-3" />}
                Line {index + 1}: {getLineName(line, index)}
              </button>
            ))}
          </div>
        )}

        {/* Status */}
        {(showWrongMove || status === 'line-complete') && (
          <div className="px-3 py-2">
            {showWrongMove && (
              <div className="rounded-lg bg-red-500/20 px-4 py-2 text-center">
                <p className="text-red-400 font-medium text-sm flex items-center justify-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Wrong move! Try again.
                </p>
              </div>
            )}
            {status === 'line-complete' && !showWrongMove && (
              <div className="rounded-lg bg-green-500/20 px-4 py-2 text-center">
                <p className="text-green-400 font-medium text-sm flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Line completed!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-zinc-800 border-t border-zinc-700 mt-auto">
          <div className="flex gap-2">
            <button
              onClick={resetLine}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-700 py-2.5 text-sm font-medium text-white touch-target"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Restart</span>
            </button>
            <button
              onClick={increaseHint}
              disabled={hintLevel >= 3 || status !== 'playing'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-700 py-2.5 text-sm font-medium text-white disabled:opacity-50 touch-target"
            >
              <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-yellow-400' : ''}`} />
              <span className="sr-only sm:not-sr-only">Hint</span>
              {hintLevel > 0 && <span className="text-xs">({hintLevel})</span>}
            </button>
            {status === 'line-complete' && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white touch-target"
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {progressInfo.completedLines === progressInfo.totalLines && (
              <button
                onClick={resetProgress}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-600 py-2.5 text-sm font-medium text-white touch-target"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-8 p-6">
        {/* Chessboard */}
        <div className={`h-[600px] w-[600px] shrink-0 rounded-sm transition-all duration-200 ${showWrongMove ? 'ring-4 ring-red-500 animate-shake' : ''}`}>
          <Chessground
            key={boardKey}
            ref={chessgroundRef}
            config={chessgroundConfig}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-lg bg-zinc-800 overflow-hidden flex flex-col">
          {/* Practice Options */}
          <div className="p-4 border-b border-zinc-700">
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

          {/* Progress Overview */}
          <div className="p-4 border-b border-zinc-700">
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
            <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300 progress-bar-striped"
                style={{ width: `${(progressInfo.completedLines / progressInfo.totalLines) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Line Selector */}
          <div className="p-4 border-b border-zinc-700">
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

          {/* Spacer to push controls to bottom */}
          <div className="flex-1" />

          {/* Status - only show for wrong moves and line complete */}
          {(showWrongMove || status === 'line-complete') && (
            <div className="p-4 border-t border-zinc-700">
              {showWrongMove && (
                <div className="rounded-md p-4 text-center bg-red-500/20">
                  <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                  <p className="text-red-400 font-medium">Wrong move! Try again.</p>
                </div>
              )}

              {status === 'line-complete' && !showWrongMove && (
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
          )}

          {/* Controls */}
          <div className="p-4 border-t border-zinc-700 space-y-3">
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

            {/* All lines completed - Reset practice button */}
            {progressInfo.completedLines === progressInfo.totalLines && (
              <button
                onClick={resetProgress}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Practice
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Study Mode View - Step through repertoire with annotations
function StudyView({ study }: { study: OpeningStudy }) {
  const chessgroundRef = useRef<ChessgroundRef>(null)
  const [showLineSelector, setShowLineSelector] = useState(false)
  const [showLinesModal, setShowLinesModal] = useState(false)

  const {
    isComplete,
    moveInfo,
    currentComment,
    currentLine,
    currentLineIndex,
    allLines,
    allLineNodes,
    selectLine,
    nextLine,
    restartStudy,
    goToStart,
    makeMove,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
    chessgroundConfig,
  } = useOpeningStudy({ study })

  // Check if all lines are completed (on last line and it's complete)
  const isStudyComplete = isComplete && currentLineIndex === allLines.length - 1

  return (
    <>
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={study.color}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {/* Lines Selector Modal */}
      <Dialog open={showLinesModal} onOpenChange={setShowLinesModal}>
        <DialogContent>
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Select Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 overflow-y-auto min-h-0 p-4 pt-0 max-h-[60vh]">
            {allLineNodes.map((lineNodes, index) => (
              <button
                key={index}
                onClick={() => { selectLine(index); setShowLinesModal(false) }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${index === currentLineIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
              >
                Line {index + 1}: {getLineName(lineNodes, index)}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-full">
        {/* Progress Bar */}
        <div className="px-3 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center justify-between mb-2 h-8">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Move {moveInfo.current}/{moveInfo.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Line {currentLineIndex + (isComplete ? 1 : 0)}/{allLines.length}</span>
              <button
                onClick={() => setShowLinesModal(true)}
                className="px-2 py-1.5 rounded-md text-xs bg-zinc-700 text-zinc-300 touch-target"
              >
                Lines
              </button>
            </div>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentLineIndex + (isComplete ? 1 : 0)) / allLines.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className="chess-board-container rounded-sm">
            <Chessground
              ref={chessgroundRef}
              config={chessgroundConfig}
              onMove={makeMove}
            />
          </div>
        </div>

        {/* Current Line Selector */}
        <button
          onClick={() => setShowLineSelector(!showLineSelector)}
          className="mx-3 px-3 py-2 bg-zinc-800 rounded-lg flex items-center justify-between"
        >
          <div className="text-left min-w-0">
            <p className="text-xs text-zinc-400">Line {currentLineIndex + 1}</p>
            <p className="text-sm text-white font-medium truncate">{getLineName(currentLine, currentLineIndex)}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-zinc-400 shrink-0 ml-2 transition-transform ${showLineSelector ? 'rotate-180' : ''}`} />
        </button>

        {/* Line Selector Dropdown */}
        {showLineSelector && (
          <div className="mx-3 mt-1 max-h-32 overflow-y-auto bg-zinc-800 rounded-lg border border-zinc-700">
            {allLineNodes.map((lineNodes, index) => (
              <button
                key={index}
                onClick={() => { selectLine(index); setShowLineSelector(false) }}
                className={`w-full text-left px-3 py-2 text-sm ${index === currentLineIndex ? 'bg-blue-600 text-white' : 'text-zinc-300'}`}
              >
                Line {index + 1}: {getLineName(lineNodes, index)}
              </button>
            ))}
          </div>
        )}

        {/* Comment / Status */}
        {isComplete ? (
          <div className="mx-3 mt-2 rounded-lg bg-green-500/20 px-4 py-2 text-center">
            <p className="text-green-400 font-medium text-sm flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {isStudyComplete ? 'Study completed!' : 'Line completed!'}
            </p>
          </div>
        ) : currentComment ? (
          <div className="mx-3 mt-2 rounded-lg bg-amber-500/15 px-3 py-2 border border-amber-500/30">
            <p className="text-sm text-amber-100 flex items-start gap-2">
              <OctagonAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
              {currentComment}
            </p>
          </div>
        ) : null}

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-zinc-800 border-t border-zinc-700 mt-auto">
          <div className="flex gap-2">
            <button
              onClick={goToStart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-700 py-2.5 text-sm font-medium text-white touch-target"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Restart</span>
            </button>
            {isComplete && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white touch-target"
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {isStudyComplete && (
              <button
                onClick={restartStudy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-600 py-2.5 text-sm font-medium text-white touch-target"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-8 p-6">

        {/* Board */}
        <div className="h-[600px] w-[600px] shrink-0 rounded-sm overflow-hidden">
          <Chessground
            ref={chessgroundRef}
            config={chessgroundConfig}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-lg bg-zinc-800 overflow-hidden flex flex-col">
          {/* Progress Overview */}
          <div className="p-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-400">Progress</span>
              <span className="text-sm text-white">
                {currentLineIndex + (isComplete ? 1 : 0)} / {allLines.length} lines
              </span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 progress-bar-striped"
                style={{ width: `${((currentLineIndex + (isComplete ? 1 : 0)) / allLines.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Move {moveInfo.current} of {moveInfo.total}
            </p>
          </div>

          {/* Current Line Selector */}
          <div className="p-4 border-b border-zinc-700">
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
              <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform ${showLineSelector ? 'rotate-180' : ''}`} />
            </button>

            {showLineSelector && (
              <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto">
                {allLineNodes.map((lineNodes, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      selectLine(index)
                      setShowLineSelector(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${index === currentLineIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      {index === currentLineIndex && <CheckCircle className="h-4 w-4" />}
                      Line {index + 1}: {getLineName(lineNodes, index)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Moves */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Moves</h3>
            <CompactMoveList
              line={currentLine}
              currentMoveIndex={moveInfo.current}
              startColor={study.color === 'white' ? 'white' : 'black'}
            />
          </div>

          {/* Status / Comment Area */}
          {isComplete ? (
            <div className="bg-green-500/20 p-4 text-center border-t border-zinc-700">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <p className="text-green-400 font-medium">
                {isStudyComplete ? 'Study completed!' : 'Line completed!'}
              </p>
            </div>
          ) : currentComment ? (
            <div className="bg-amber-500/15 p-4 border-t border-amber-500/40">
              <div className="flex items-start gap-3">
                <OctagonAlert className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-100">{currentComment}</p>
              </div>
            </div>
          ) : null}

          {/* Controls */}
          <div className="p-4 border-t border-zinc-700 space-y-2">
            <button
              onClick={goToStart}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Line
            </button>

            {/* Next Line Button - only show when line is complete and not on last line */}
            {isComplete && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 transition-colors"
              >
                Next Line
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* Restart Study Button - show when all lines are complete */}
            {isStudyComplete && (
              <button
                onClick={restartStudy}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Study
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Speed Drill View - Rapid practice with timer
function SpeedDrillView({ study }: { study: OpeningStudy }) {
  const chessgroundRef = useRef<ChessgroundRef>(null)
  const [showResults, setShowResults] = useState(false)
  const [finalStats, setFinalStats] = useState<SpeedDrillStats | null>(null)

  const {
    config,
    isComplete,
    isRunning,
    boardKey,
    elapsedMs,
    formatTime,
    progress,
    stats,
    makeMove,
    resetDrill,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
  } = useSpeedDrill({
    study,
    onComplete: (s) => {
      setFinalStats(s)
      setShowResults(true)
    },
  })

  const handleReset = () => {
    setShowResults(false)
    setFinalStats(null)
    resetDrill()
  }

  return (
    <>
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={study.color}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-full">
        {/* Timer & Progress */}
        <div className="px-3 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center justify-between mb-2 h-8">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              <span className="text-2xl font-mono font-bold text-white">{formatTime(elapsedMs)}</span>
            </div>
            <span className="text-xs text-zinc-400">Line {progress.currentLine}/{progress.totalLines}</span>
          </div>
          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-150"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className="chess-board-container rounded-sm" key={boardKey}>
            <Chessground ref={chessgroundRef} config={config} onMove={makeMove} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-3 py-2 grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-green-400">{(finalStats ?? stats).correctMoves}</p>
            <p className="text-xs text-zinc-500">Correct</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{(finalStats ?? stats).wrongMoves}</p>
            <p className="text-xs text-zinc-500">Wrong</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-400">{(finalStats ?? stats).accuracy.toFixed(0)}%</p>
            <p className="text-xs text-zinc-500">Accuracy</p>
          </div>
          <div>
            <p className="text-lg font-bold text-yellow-400">
              {(finalStats ?? stats).correctMoves > 0 ? ((finalStats ?? stats).averageTimePerMove / 1000).toFixed(1) : '0'}s
            </p>
            <p className="text-xs text-zinc-500">Avg</p>
          </div>
        </div>

        {/* Results */}
        {showResults && finalStats && (
          <div className="mx-3 rounded-lg bg-yellow-500/10 px-4 py-3 text-center border border-yellow-500/30">
            <Trophy className="mx-auto h-8 w-8 text-yellow-400 mb-2" />
            <p className="font-bold text-white">Drill Complete!</p>
            <p className="text-xs text-zinc-400 mt-1">Time: {formatTime(finalStats.timeMs)} | Accuracy: {finalStats.accuracy.toFixed(0)}%</p>
          </div>
        )}

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-zinc-800 border-t border-zinc-700 mt-auto">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-yellow-600 py-2.5 text-sm font-medium text-white touch-target"
            >
              <RotateCcw className="h-4 w-4" />
              {isComplete ? 'Try Again' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-8 p-6">
        {/* Board */}
        <div className="h-[600px] w-[600px] shrink-0 overflow-hidden" key={boardKey}>
          <Chessground
            ref={chessgroundRef}
            config={config}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-lg bg-zinc-800 overflow-hidden flex flex-col">
          {/* Timer Display */}
          <div className="p-4 border-b border-zinc-700 text-center">
            <Clock className="mx-auto h-8 w-8 text-yellow-400 mb-2" />
            <p className="text-4xl font-mono font-bold text-white">
              {formatTime(elapsedMs)}
            </p>
            {!isRunning && !isComplete && (
              <p className="text-xs text-zinc-500 mt-2">Make a move to start</p>
            )}
          </div>

          {/* Progress */}
          <div className="p-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-zinc-400">Progress</h3>
              <span className="text-sm text-zinc-500">
                Line {progress.currentLine} / {progress.totalLines}
              </span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-150 progress-bar-striped"
                style={{ width: `${progress.overallProgress}%` }}
              />
            </div>
          </div>

          {/* Live Stats */}
          <div className="p-4 border-b border-zinc-700">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{(finalStats ?? stats).correctMoves}</p>
                <p className="text-xs text-zinc-500">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{(finalStats ?? stats).wrongMoves}</p>
                <p className="text-xs text-zinc-500">Wrong</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {(finalStats ?? stats).accuracy.toFixed(0)}%
                </p>
                <p className="text-xs text-zinc-500">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">
                  {(finalStats ?? stats).correctMoves > 0 ? ((finalStats ?? stats).averageTimePerMove / 1000).toFixed(1) : '0.0'}s
                </p>
                <p className="text-xs text-zinc-500">Avg/Move</p>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          {showResults && finalStats && (
            <div className="p-4 border-b border-zinc-700 bg-yellow-500/10">
              <Trophy className="mx-auto h-10 w-10 text-yellow-400 mb-3" />
              <h3 className="text-lg font-bold text-white text-center mb-2">Drill Complete!</h3>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-300">Time: <span className="text-white font-medium">{formatTime(finalStats.timeMs)}</span></p>
                <p className="text-zinc-300">Accuracy: <span className="text-white font-medium">{finalStats.accuracy.toFixed(1)}%</span></p>
                <p className="text-zinc-300">Avg per move: <span className="text-white font-medium">{(finalStats.averageTimePerMove / 1000).toFixed(2)}s</span></p>
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Controls */}
          <div className="p-4 border-t border-zinc-700">
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-yellow-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-500 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              {isComplete ? 'Try Again' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Mistakes Review View - Practice problem positions
function MistakesReviewView({ study, onMistakeCompleted }: { study: OpeningStudy; onMistakeCompleted?: () => void }) {
  const chessgroundRef = useRef<ChessgroundRef>(null)

  const {
    config,
    boardKey,
    isCorrect,
    showWrongMove,
    wrongAttempts,
    hintLevel,
    currentMistake,
    parentNode,
    currentIndex,
    totalMistakes,
    isComplete,
    allMistakes,
    correctCount,
    wrongCount,
    makeMove,
    nextMistake,
    skipMistake,
    showHint,
    pendingPromotion,
    completePromotion,
    cancelPromotion,
    clearAllMistakes,
  } = useMistakesReview({ study, onMistakeCompleted })

  if (allMistakes.length === 0) {
    return (
      <div className="flex justify-center p-4 md:p-6">
        <div className="max-w-md text-center">
          <Target className="mx-auto h-12 w-12 md:h-16 md:w-16 text-zinc-600 mb-4" />
          <h2 className="text-lg md:text-xl font-bold text-white mb-2">No Mistakes Yet!</h2>
          <p className="text-sm md:text-base text-zinc-400 mb-4">
            Practice your opening and any mistakes you make will appear here for review.
          </p>
          <p className="text-xs md:text-sm text-zinc-500">
            Mistakes are tracked with spaced repetition - harder positions will appear more frequently.
          </p>
        </div>
      </div>
    )
  }

  if (isComplete || totalMistakes === 0) {
    return (
      <div className="flex justify-center p-4 md:p-6">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto h-12 w-12 md:h-16 md:w-16 text-green-500 mb-4" />
          <h2 className="text-lg md:text-xl font-bold text-white mb-2">All Caught Up!</h2>
          <p className="text-sm md:text-base text-zinc-400">
            No mistakes due for review right now. Keep practicing!
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={study.color}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      )}

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-full">
        {/* Info & Progress */}
        <div className="px-3 py-3 bg-orange-500/10 border-b border-orange-500/30">
          <div className="flex items-center justify-between mb-2 h-8">
            <span className="text-xs font-medium text-orange-400">Mistakes Review</span>
            <span className="text-xs text-zinc-400">{currentIndex + 1}/{totalMistakes}</span>
          </div>
          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${((currentIndex + (isCorrect ? 1 : 0)) / totalMistakes) * 100}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className="chess-board-container rounded-sm" key={boardKey}>
            <Chessground ref={chessgroundRef} config={config} onMove={makeMove} />
          </div>
        </div>

        {/* Position Info */}
        {parentNode && (
          <div className="px-3 py-2 bg-zinc-800/50">
            <p className="text-xs text-zinc-400">Find the move after: <span className="text-white font-bold">{parentNode.san}</span></p>
          </div>
        )}

        {/* Status */}
        <div className="px-3 py-2">
          {isCorrect ? (
            <div className="rounded-lg bg-green-500/20 px-4 py-2 text-center">
              <p className="text-green-400 font-medium text-sm flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Correct!
              </p>
            </div>
          ) : showWrongMove ? (
            <div className="rounded-lg bg-red-500/20 px-4 py-2 text-center">
              <p className="text-red-400 font-medium text-sm flex items-center justify-center gap-2">
                <XCircle className="h-4 w-4" />
                Wrong move! Try again.
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-blue-500/20 px-4 py-2 text-center">
              <p className="text-blue-400 font-medium text-sm">
                Find the correct move!
                {wrongAttempts > 0 && ` (${wrongAttempts} wrong)`}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="px-3 py-2 flex justify-center gap-6">
          <div className="text-center">
            <p className="text-lg font-bold text-green-400">{correctCount}</p>
            <p className="text-xs text-zinc-500">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">{wrongCount}</p>
            <p className="text-xs text-zinc-500">Wrong</p>
          </div>
        </div>

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-zinc-800 border-t border-zinc-700 mt-auto">
          <div className="flex gap-2">
            {!isCorrect ? (
              <>
                <button
                  onClick={showHint}
                  disabled={hintLevel >= 2}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-700 py-2.5 text-sm font-medium text-white disabled:opacity-50 touch-target"
                >
                  <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-yellow-400' : ''}`} />
                  <span className="sr-only sm:not-sr-only">Hint</span>
                </button>
                <button
                  onClick={skipMistake}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-700 py-2.5 text-sm font-medium text-white touch-target"
                >
                  <SkipForward className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Skip</span>
                </button>
              </>
            ) : currentIndex < totalMistakes - 1 ? (
              <button
                onClick={nextMistake}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white touch-target"
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={nextMistake}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white touch-target"
              >
                <Trophy className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Finish</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-8 p-6">
        {/* Board */}
        <div className="h-[600px] w-[600px] shrink-0 overflow-hidden" key={boardKey}>
          <Chessground
            ref={chessgroundRef}
            config={config}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-lg bg-zinc-800 overflow-hidden flex flex-col">
          {/* Info Header */}
          <div className="p-4 border-b border-zinc-700 bg-orange-500/10">
            <h3 className="text-sm font-medium text-orange-400 mb-1">Mistakes Review</h3>
            <p className="text-xs text-zinc-400">
              Practice positions where you made mistakes. Spaced repetition helps you remember.
            </p>
          </div>

          {/* Progress */}
          <div className="p-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-zinc-400">Progress</h3>
              <span className="text-sm text-zinc-500">
                {currentIndex + 1} / {totalMistakes}
              </span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300 progress-bar-striped"
                style={{ width: `${((currentIndex + (isCorrect ? 1 : 0)) / totalMistakes) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Position Info */}
          {parentNode && (
            <div className="p-4 border-b border-zinc-700">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Find the move after:</h3>
              <p className="text-lg font-bold text-white">{parentNode.san}</p>
              {currentMistake && (
                <p className="text-xs text-zinc-500 mt-1">
                  Wrong attempts: {currentMistake.wrongAttempts} | Streak: {currentMistake.streak}
                </p>
              )}
            </div>
          )}

          {/* Status */}
          <div className="p-4 border-b border-zinc-700">
            {isCorrect ? (
              <div className="rounded-md bg-green-500/20 p-4 text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
                <p className="text-green-400 font-medium">Correct!</p>
              </div>
            ) : showWrongMove ? (
              <div className="rounded-md bg-red-500/20 p-4 text-center">
                <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                <p className="text-red-400 font-medium">Wrong move! Try again.</p>
              </div>
            ) : (
              <div className="rounded-md bg-blue-500/20 p-4 text-center">
                <p className="text-blue-400 font-medium">Find the correct move!</p>
                {wrongAttempts > 0 && (
                  <p className="text-xs text-zinc-400 mt-1">
                    {wrongAttempts} wrong {wrongAttempts === 1 ? 'attempt' : 'attempts'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-4 border-b border-zinc-700">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{correctCount}</p>
                <p className="text-xs text-zinc-500">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{wrongCount}</p>
                <p className="text-xs text-zinc-500">Wrong</p>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Controls */}
          <div className="p-4 border-t border-zinc-700 space-y-2">
            <div className="flex gap-2">
              {!isCorrect ? (
                <>
                  <button
                    onClick={showHint}
                    disabled={hintLevel >= 2}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-zinc-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50"
                  >
                    <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-yellow-400' : ''}`} />
                    Hint
                  </button>
                  <button
                    onClick={skipMistake}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-zinc-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </button>
                </>
              ) : currentIndex < totalMistakes - 1 ? (
                <button
                  onClick={nextMistake}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-500 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={nextMistake}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-500 transition-colors"
                >
                  <Trophy className="h-4 w-4" />
                  Finish Review
                </button>
              )}
            </div>

            {/* Clear mistakes button */}
            <button
              onClick={clearAllMistakes}
              className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Clear all mistakes for this study
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Edit View - Wraps OpeningEditor for inline editing
interface EditViewProps {
  study: OpeningStudy
  onSave: (study: OpeningStudy) => void
}

function EditView({ study, onSave }: EditViewProps) {
  const handleSave = (updatedStudy: OpeningStudy) => {
    onSave(updatedStudy)
  }

  // When used inline, cancel just stays on the same view (no navigation needed)
  const handleCancel = () => {
    // No-op when used inline - user can just switch tabs
  }

  return (
    <div>
      <OpeningEditor
        initialStudy={study}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
