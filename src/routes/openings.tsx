import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Chessground, type ChessgroundRef } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useOpeningPractice } from '@/hooks/use-opening-practice'
import { useOpeningStudy } from '@/hooks/use-opening-study'
import { useSpeedDrill, type SpeedDrillStats } from '@/hooks/use-speed-drill'
import { useMistakesReview, getMistakesDueForReview } from '@/hooks/use-mistakes-review'
import type { OpeningStudy } from '@/types/opening'
import { getLineName, loadOpeningStudyById } from '@/lib/opening-utils'
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
  Circle,
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

// Search params schema for URL-based navigation
type OpeningsSearch = {
  studyId?: string
  mode?: 'study' | 'practice' | 'speed' | 'mistakes' | 'edit'
  new?: boolean
  newName?: string
  newDesc?: string
  newColor?: 'white' | 'black'
}

export const Route = createFileRoute('/openings')({
  component: OpeningsPage,
  validateSearch: (search: Record<string, unknown>): OpeningsSearch => ({
    studyId: search.studyId as string | undefined,
    mode: search.mode as OpeningsSearch['mode'],
    new: search.new === true || search.new === 'true',
    newName: search.newName as string | undefined,
    newDesc: search.newDesc as string | undefined,
    newColor: search.newColor as 'white' | 'black' | undefined,
  }),
})

type PageView = 'selector' | 'study' | 'editor'

interface NewStudyData {
  name: string
  description: string
  color: 'white' | 'black'
}

function OpeningsPage() {
  const navigate = useNavigate({ from: '/openings' })
  const search = useSearch({ from: '/openings' })

  // Load study from ID in search params
  const [selectedStudy, setSelectedStudy] = useState<OpeningStudy | null>(() => {
    if (search.studyId) {
      return loadOpeningStudyById(search.studyId)
    }
    return null
  })

  // Sync study when URL changes
  useEffect(() => {
    if (search.studyId) {
      const study = loadOpeningStudyById(search.studyId)
      setSelectedStudy(study)
    } else {
      setSelectedStudy(null)
    }
  }, [search.studyId])

  // Derive new study data from URL params
  const newStudyData: NewStudyData | null = search.new
    ? {
      name: search.newName || 'New Opening',
      description: search.newDesc || '',
      color: search.newColor || 'white',
    }
    : null

  // Determine current view from URL
  const getView = (): PageView => {
    if (search.new) return 'editor'
    if (search.studyId && search.mode) return 'study'
    return 'selector'
  }

  const view = getView()

  const handleSelectStudy = useCallback((study: OpeningStudy) => {
    navigate({
      search: () => ({ studyId: study.id, mode: 'study' as const }),
    })
  }, [navigate])

  const handleCreateNew = useCallback((data: NewStudyData) => {
    navigate({
      search: () => ({
        new: true,
        newName: data.name,
        newDesc: data.description,
        newColor: data.color,
      }),
    })
  }, [navigate])

  const handleSaveEditor = useCallback((study: OpeningStudy) => {
    setSelectedStudy(study)
    navigate({
      search: () => ({ studyId: study.id, mode: 'study' as const }),
    })
  }, [navigate])

  const handleCancelEditor = useCallback(() => {
    if (selectedStudy) {
      navigate({
        search: () => ({ studyId: selectedStudy.id, mode: 'study' as const }),
      })
    } else {
      navigate({
        search: () => ({}),
      })
    }
  }, [navigate, selectedStudy])

  const handleBackToSelector = useCallback(() => {
    navigate({
      search: () => ({}),
    })
  }, [navigate])

  // Render based on current view
  if (view === 'selector') {
    return (
      <div className="min-h-screen bg-surface-0 pt-14 md:pt-16 px-3 py-4 md:p-6">
        <Navbar />
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-1 md:mb-2">Opening Studies</h1>
          <p className="text-sm md:text-base text-text-secondary mb-4 md:mb-8">
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

  return (
    <StudyPageContent
      study={selectedStudy}
      mode={search.mode || 'study'}
      onBack={handleBackToSelector}
      onStudyUpdate={handleSaveEditor}
    />
  )
}

type StudyMode = 'practice' | 'study' | 'speed' | 'mistakes' | 'edit'

interface StudyPageContentProps {
  study: OpeningStudy
  mode: StudyMode
  onBack: () => void
  onStudyUpdate: (study: OpeningStudy) => void
}

function StudyPageContent({ study, mode, onBack, onStudyUpdate }: StudyPageContentProps) {
  const navigate = useNavigate({ from: '/openings' })
  const [mistakesCount, setMistakesCount] = useState(() => getMistakesDueForReview(study.id).length)

  // Navigate to a mode
  const setMode = useCallback((newMode: StudyMode) => {
    navigate({
      search: () => ({ studyId: study.id, mode: newMode }),
    })
  }, [navigate, study.id])

  // Refresh mistakes count when switching to mistakes tab or periodically
  const refreshMistakesCount = () => {
    setMistakesCount(getMistakesDueForReview(study.id).length)
  }

  return (
    <div className="min-h-full bg-surface-0 flex flex-col">
      {/* Mode Tabs - Sticky within scroll container */}
      <div className="sticky top-0 z-40 border-b border-border-subtle bg-surface-0/90 backdrop-blur-md px-3 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-0.5 md:gap-1 overflow-x-auto scroll-tabs -mx-3 px-3 md:mx-0 md:px-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all whitespace-nowrap touch-target my-1"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span className="hidden sm:inline">{study.name}</span>
            </button>
            <div className="w-px bg-border-subtle my-2" />
            <button
              onClick={() => setMode('study')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'study'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Study</span>
            </button>
            <button
              onClick={() => setMode('practice')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'practice'
                ? 'border-accent-success text-accent-success'
                : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
            >
              <Play className="h-4 w-4" />
              <span>Practice</span>
            </button>
            <button
              onClick={() => setMode('speed')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'speed'
                ? 'border-accent-warning text-accent-warning'
                : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
            >
              <Zap className="h-4 w-4" />
              Speed
            </button>
            <button
              onClick={() => setMode('mistakes')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'mistakes'
                ? 'border-accent-danger text-accent-danger'
                : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Mistakes</span>
              <span className="sm:hidden">Fix</span>
              {mistakesCount > 0 && (
                <span className="bg-accent-danger text-white text-xs px-1.5 py-0.5 rounded-full">
                  {mistakesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-target ${mode === 'edit'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-secondary hover:text-text-primary'
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
        <div className="px-3 py-3 bg-surface-1 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-2 h-8">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">
                {progressInfo.completedLines}/{progressInfo.totalLines} lines
              </span>
              {skippedLines.size > 0 && (
                <span className="text-xs text-accent-warning">({skippedLines.size} skipped)</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVariationSelector(true)}
                className="px-2 py-1.5 rounded-lg text-xs bg-surface-2 text-text-secondary touch-target border-b-2 border-surface-0 active:border-b-0 active:translate-y-px transition-all"
              >
                Lines
              </button>
              <button
                onClick={() => setRandomOrder(!randomOrder)}
                className={`p-1.5 rounded-lg transition-all touch-target border-b-2 active:border-b-0 active:translate-y-px ${randomOrder ? 'bg-accent-blue text-white border-accent-blue/60' : 'bg-surface-2 text-text-muted border-surface-0'}`}
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-accent-success h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(progressInfo.completedLines / progressInfo.totalLines) * 100}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className={`chess-board-container board-wrapper transition-all duration-200 ${showWrongMove ? 'ring-4 ring-accent-danger animate-shake' : ''}`}>
            <Chessground
              key={boardKey}
              ref={chessgroundRef}
              config={chessgroundConfig}
              onMove={makeMove}
            />
          </div>
        </div>

        {/* Status */}
        {(showWrongMove || status === 'line-complete') && (
          <div className="px-3 py-2 animate-slide-up">
            {showWrongMove && (
              <div className="rounded-xl bg-accent-danger/15 px-4 py-2 text-center border border-accent-danger/20">
                <p className="text-accent-danger font-medium text-sm flex items-center justify-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Wrong move! Try again.
                </p>
              </div>
            )}
            {status === 'line-complete' && !showWrongMove && (
              <div className="rounded-xl bg-accent-success/15 px-4 py-2 text-center border border-accent-success/20">
                <p className="text-accent-success font-medium text-sm flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Line completed!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-surface-1 border-t border-border-subtle mt-auto">
          <div className="flex gap-2">
            <button
              onClick={resetLine}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 py-2.5 text-sm font-medium text-text-primary touch-target border-b-4 border-surface-0 active:border-b-0 active:translate-y-0.5 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Restart</span>
            </button>
            <button
              onClick={increaseHint}
              disabled={hintLevel >= 3 || status !== 'playing'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 py-2.5 text-sm font-medium text-text-primary disabled:opacity-50 touch-target border-b-4 border-surface-0 active:border-b-0 active:translate-y-0.5 transition-all"
            >
              <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-accent-warning' : ''}`} />
              <span className="sr-only sm:not-sr-only">Hint</span>
              {hintLevel > 0 && <span className="text-xs">({hintLevel})</span>}
            </button>
            {status === 'line-complete' && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-success py-2.5 text-sm font-medium text-white touch-target border-b-4 border-accent-success/60 active:border-b-0 active:translate-y-0.5 transition-all"
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {progressInfo.completedLines === progressInfo.totalLines && (
              <button
                onClick={resetProgress}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-warning py-2.5 text-sm font-medium text-white touch-target border-b-4 border-accent-warning/60 active:border-b-0 active:translate-y-0.5 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-6 p-6">
        {/* Chessboard */}
        <div className={`h-[600px] w-[600px] shrink-0 board-wrapper transition-all duration-200 ${showWrongMove ? 'ring-4 ring-accent-danger animate-shake' : ''}`}>
          <Chessground
            key={boardKey}
            ref={chessgroundRef}
            config={chessgroundConfig}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-xl bg-surface-1 border border-border-subtle overflow-hidden flex flex-col">
          {/* Practice Options */}
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-secondary">Options</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowVariationSelector(true)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-surface-2 text-text-secondary hover:bg-surface-3 transition-all border-b-2 border-surface-0 active:border-b-0 active:translate-y-px"
                >
                  Select Lines
                </button>
                <button
                  onClick={() => setRandomOrder(!randomOrder)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border-b-2 active:border-b-0 active:translate-y-px ${randomOrder
                    ? 'bg-accent-blue text-white border-accent-blue/60'
                    : 'bg-surface-2 text-text-muted hover:text-text-primary border-surface-0'
                    }`}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
              </div>
            </div>
            {selectedLineIndices && selectedLineIndices.length < allLines.length && (
              <p className="text-xs text-accent-blue mt-2">
                Practicing {selectedLineIndices.length} of {allLines.length + (allLines.length - selectedLineIndices.length)} lines
              </p>
            )}
          </div>

          {/* Progress Overview */}
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">Progress</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-primary">
                  {progressInfo.completedLines} / {progressInfo.totalLines} lines
                  {skippedLines.size > 0 && (
                    <span className="text-accent-warning ml-1">({skippedLines.size} skipped)</span>
                  )}
                </span>
                {(progressInfo.completedLines > 0 || skippedLines.size > 0) && (
                  <button
                    onClick={resetProgress}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text-primary transition-all border-b-2 border-surface-0 active:border-b-0 active:translate-y-px"
                    title="Reset all progress"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent-success h-2 rounded-full transition-all duration-300 progress-bar-striped"
                style={{ width: `${(progressInfo.completedLines / progressInfo.totalLines) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Line Selector */}
          <div className="p-4 border-b border-border-subtle">
            <button
              onClick={() => setShowLineSelector(!showLineSelector)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">Current Line</span>
                  {hasPracticeStartMarker && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${isCurrentLineSetup
                      ? 'bg-accent-warning/20 text-accent-warning'
                      : 'bg-accent-success/20 text-accent-success'
                      }`}>
                      {isCurrentLineSetup ? 'Setup' : 'Variation'}
                    </span>
                  )}
                </div>
                <p className="text-text-primary font-medium">
                  Line {currentLineIndex + 1}: {getLineName(currentLine, currentLineIndex)}
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-text-muted transition-transform ${showLineSelector ? 'rotate-180' : ''
                }`} />
            </button>

            {showLineSelector && (
              <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto sidebar-scroll">
                {allLines.map((line, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      selectLine(index)
                      setShowLineSelector(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${index === currentLineIndex
                      ? 'bg-accent-blue text-white'
                      : completedLines.has(index)
                        ? 'bg-accent-success/15 text-accent-success'
                        : skippedLines.has(index)
                          ? 'bg-accent-warning/15 text-accent-warning'
                          : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
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
            <div className="p-4 border-t border-border-subtle animate-slide-up">
              {showWrongMove && (
                <div className="rounded-xl p-4 text-center bg-accent-danger/15 border border-accent-danger/20">
                  <XCircle className="mx-auto mb-2 h-8 w-8 text-accent-danger" />
                  <p className="text-accent-danger font-medium">Wrong move! Try again.</p>
                </div>
              )}

              {status === 'line-complete' && !showWrongMove && (
                <div className="rounded-xl bg-accent-success/15 p-4 text-center border border-accent-success/20">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-accent-success" />
                  <p className="text-accent-success font-medium">Line completed!</p>
                  {wrongAttempts > 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      With {wrongAttempts} wrong {wrongAttempts === 1 ? 'attempt' : 'attempts'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-t border-border-subtle space-y-3">
            {/* Main controls row */}
            <div className="flex gap-2">
              <button
                onClick={resetLine}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-3 transition-all border-b-4 border-surface-0 active:border-b-0 active:translate-y-0.5"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
              <button
                onClick={increaseHint}
                disabled={hintLevel >= 3 || status !== 'playing'}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-surface-0 active:border-b-0 active:translate-y-0.5"
                title={`Hint level: ${hintLevel}/3`}
              >
                <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-accent-warning' : ''}`} />
                Hint {hintLevel > 0 && `(${hintLevel})`}
              </button>
            </div>

            {/* Next line button when complete */}
            {status === 'line-complete' && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-success px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all border-b-4 border-accent-success/60 active:border-b-0 active:translate-y-0.5"
              >
                Next Line
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* All lines completed - Reset practice button */}
            {progressInfo.completedLines === progressInfo.totalLines && (
              <button
                onClick={resetProgress}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-warning px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all border-b-4 border-accent-warning/60 active:border-b-0 active:translate-y-0.5"
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
        <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-md" showCloseButton={false}>
          <div className="rounded-xl bg-surface-1 p-4 border border-border-subtle shadow-2xl">
            <h3 className="text-sm font-medium text-text-primary mb-3">Select Line</h3>

            <div className="space-y-1 overflow-y-auto min-h-0 max-h-[60vh] mb-4 sidebar-scroll">
              {allLineNodes.map((lineNodes, index) => (
                <button
                  key={index}
                  onClick={() => { selectLine(index); setShowLinesModal(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${index === currentLineIndex
                    ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/20'
                    : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                    }`}
                >
                  {index === currentLineIndex ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">Line {index + 1}: {getLineName(lineNodes, index, 6)}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowLinesModal(false)}
                className="w-full rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-3 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-full">
        {/* Progress Bar */}
        <div className="px-3 py-3 bg-surface-1 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-2 h-8">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Move {moveInfo.current}/{moveInfo.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Line {currentLineIndex + (isComplete ? 1 : 0)}/{allLines.length}</span>
              <button
                onClick={() => setShowLinesModal(true)}
                className="px-2 py-1.5 rounded-lg text-xs bg-surface-2 text-text-secondary touch-target hover:bg-surface-3 transition-all"
              >
                Lines
              </button>
            </div>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-accent-blue h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentLineIndex + (isComplete ? 1 : 0)) / allLines.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className="chess-board-container board-wrapper">
            <Chessground
              ref={chessgroundRef}
              config={chessgroundConfig}
              onMove={makeMove}
            />
          </div>
        </div>

        {/* Comment / Status */}
        {isComplete ? (
          <div className="mx-3 mt-2 rounded-xl bg-accent-success/15 px-4 py-2 text-center border border-accent-success/20 animate-slide-up">
            <p className="text-accent-success font-medium text-sm flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {isStudyComplete ? 'Study completed!' : 'Line completed!'}
            </p>
          </div>
        ) : currentComment ? (
          <div className="mx-3 mt-2 rounded-xl bg-accent-warning/10 px-3 py-2 border border-accent-warning/20 animate-slide-up">
            <p className="text-sm text-text-primary flex items-start gap-2">
              <OctagonAlert className="h-4 w-4 mt-0.5 shrink-0 text-accent-warning" />
              {currentComment}
            </p>
          </div>
        ) : null}

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-surface-1 border-t border-border-subtle mt-auto">
          <div className="flex gap-2">
            <button
              onClick={goToStart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 py-2.5 text-sm font-medium text-text-primary touch-target hover:bg-surface-3 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Restart</span>
            </button>
            {isComplete && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-success py-2.5 text-sm font-medium text-white touch-target hover:brightness-110 transition-all"
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {isStudyComplete && (
              <button
                onClick={restartStudy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-warning py-2.5 text-sm font-medium text-white touch-target hover:brightness-110 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-6 p-6">

        {/* Board */}
        <div className="h-[600px] w-[600px] shrink-0 board-wrapper">
          <Chessground
            ref={chessgroundRef}
            config={chessgroundConfig}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-xl bg-surface-1 border border-border-subtle overflow-hidden flex flex-col">
          {/* Progress Overview */}
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">Progress</span>
              <span className="text-sm text-text-primary">
                {currentLineIndex + (isComplete ? 1 : 0)} / {allLines.length} lines
              </span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent-blue h-2 rounded-full transition-all duration-300 progress-bar-striped"
                style={{ width: `${((currentLineIndex + (isComplete ? 1 : 0)) / allLines.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2">
              Move {moveInfo.current} of {moveInfo.total}
            </p>
          </div>

          {/* Current Line Selector */}
          <div className="p-4 border-b border-border-subtle">
            <button
              onClick={() => setShowLineSelector(!showLineSelector)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <span className="text-sm text-text-secondary">Current Line</span>
                <p className="text-text-primary font-medium">
                  Line {currentLineIndex + 1}: {getLineName(currentLine, currentLineIndex)}
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-text-muted transition-transform ${showLineSelector ? 'rotate-180' : ''}`} />
            </button>

            {showLineSelector && (
              <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto sidebar-scroll">
                {allLineNodes.map((lineNodes, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      selectLine(index)
                      setShowLineSelector(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${index === currentLineIndex
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
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
          <div className="p-4 flex-1 overflow-y-auto sidebar-scroll">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Moves</h3>
            <CompactMoveList
              line={currentLine}
              currentMoveIndex={moveInfo.current}
              startColor={study.color === 'white' ? 'white' : 'black'}
            />
          </div>

          {/* Status / Comment Area */}
          {isComplete ? (
            <div className="bg-accent-success/15 p-4 text-center border-t border-border-subtle animate-slide-up">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-accent-success" />
              <p className="text-accent-success font-medium">
                {isStudyComplete ? 'Study completed!' : 'Line completed!'}
              </p>
            </div>
          ) : currentComment ? (
            <div className="bg-accent-warning/10 p-4 border-t border-accent-warning/20 animate-slide-up">
              <div className="flex items-start gap-3">
                <OctagonAlert className="h-5 w-5 text-accent-warning mt-0.5 shrink-0" />
                <p className="text-sm text-text-primary">{currentComment}</p>
              </div>
            </div>
          ) : null}

          {/* Controls */}
          <div className="p-4 border-t border-border-subtle space-y-2">
            <button
              onClick={goToStart}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-surface-2 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-3 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Line
            </button>

            {/* Next Line Button */}
            {isComplete && currentLineIndex < allLines.length - 1 && (
              <button
                onClick={nextLine}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-success px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all"
              >
                Next Line
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* Restart Study Button */}
            {isStudyComplete && (
              <button
                onClick={restartStudy}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-warning px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all"
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
        <div className="px-3 py-3 bg-surface-1 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-2 h-8">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-warning" />
              <span className="text-2xl font-mono font-bold text-text-primary">{formatTime(elapsedMs)}</span>
            </div>
            <span className="text-xs text-text-secondary">Line {progress.currentLine}/{progress.totalLines}</span>
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-warning transition-all duration-150"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className="chess-board-container board-wrapper" key={boardKey}>
            <Chessground ref={chessgroundRef} config={config} onMove={makeMove} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-3 py-2 grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-accent-success">{(finalStats ?? stats).correctMoves}</p>
            <p className="text-xs text-text-muted">Correct</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent-danger">{(finalStats ?? stats).wrongMoves}</p>
            <p className="text-xs text-text-muted">Wrong</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent-blue">{(finalStats ?? stats).accuracy.toFixed(0)}%</p>
            <p className="text-xs text-text-muted">Accuracy</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent-warning">
              {(finalStats ?? stats).correctMoves > 0 ? ((finalStats ?? stats).averageTimePerMove / 1000).toFixed(1) : '0'}s
            </p>
            <p className="text-xs text-text-muted">Avg</p>
          </div>
        </div>

        {/* Results */}
        {showResults && finalStats && (
          <div className="mx-3 rounded-xl bg-accent-warning/10 px-4 py-3 text-center border border-accent-warning/20 animate-slide-up">
            <Trophy className="mx-auto h-8 w-8 text-accent-warning mb-2" />
            <p className="font-bold text-text-primary">Drill Complete!</p>
            <p className="text-xs text-text-secondary mt-1">Time: {formatTime(finalStats.timeMs)} | Accuracy: {finalStats.accuracy.toFixed(0)}%</p>
          </div>
        )}

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-surface-1 border-t border-border-subtle mt-auto">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-warning py-2.5 text-sm font-medium text-white touch-target hover:brightness-110 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              {isComplete ? 'Try Again' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-6 p-6">
        {/* Board */}
        <div className="h-[600px] w-[600px] shrink-0 board-wrapper" key={boardKey}>
          <Chessground
            ref={chessgroundRef}
            config={config}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-xl bg-surface-1 border border-border-subtle overflow-hidden flex flex-col">
          {/* Timer Display */}
          <div className="p-4 border-b border-border-subtle text-center">
            <Clock className="mx-auto h-8 w-8 text-accent-warning mb-2" />
            <p className="text-4xl font-mono font-bold text-text-primary">
              {formatTime(elapsedMs)}
            </p>
            {!isRunning && !isComplete && (
              <p className="text-xs text-text-muted mt-2">Make a move to start</p>
            )}
          </div>

          {/* Progress */}
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary">Progress</h3>
              <span className="text-sm text-text-muted">
                Line {progress.currentLine} / {progress.totalLines}
              </span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-warning transition-all duration-150 progress-bar-striped"
                style={{ width: `${progress.overallProgress}%` }}
              />
            </div>
          </div>

          {/* Live Stats */}
          <div className="p-4 border-b border-border-subtle">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-success">{(finalStats ?? stats).correctMoves}</p>
                <p className="text-xs text-text-muted">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-danger">{(finalStats ?? stats).wrongMoves}</p>
                <p className="text-xs text-text-muted">Wrong</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-blue">
                  {(finalStats ?? stats).accuracy.toFixed(0)}%
                </p>
                <p className="text-xs text-text-muted">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-warning">
                  {(finalStats ?? stats).correctMoves > 0 ? ((finalStats ?? stats).averageTimePerMove / 1000).toFixed(1) : '0.0'}s
                </p>
                <p className="text-xs text-text-muted">Avg/Move</p>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          {showResults && finalStats && (
            <div className="p-4 border-b border-border-subtle bg-accent-warning/10 animate-slide-up">
              <Trophy className="mx-auto h-10 w-10 text-accent-warning mb-3" />
              <h3 className="text-lg font-bold text-text-primary text-center mb-2">Drill Complete!</h3>
              <div className="space-y-1 text-sm">
                <p className="text-text-secondary">Time: <span className="text-text-primary font-medium">{formatTime(finalStats.timeMs)}</span></p>
                <p className="text-text-secondary">Accuracy: <span className="text-text-primary font-medium">{finalStats.accuracy.toFixed(1)}%</span></p>
                <p className="text-text-secondary">Avg per move: <span className="text-text-primary font-medium">{(finalStats.averageTimePerMove / 1000).toFixed(2)}s</span></p>
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Controls */}
          <div className="p-4 border-t border-border-subtle">
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-warning px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all"
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
          <Target className="mx-auto h-12 w-12 md:h-16 md:w-16 text-text-muted mb-4" />
          <h2 className="text-lg md:text-xl font-bold text-text-primary mb-2">No Mistakes Yet!</h2>
          <p className="text-sm md:text-base text-text-secondary mb-4">
            Practice your opening and any mistakes you make will appear here for review.
          </p>
          <p className="text-xs md:text-sm text-text-muted">
            Mistakes are tracked with spaced repetition — harder positions will appear more frequently.
          </p>
        </div>
      </div>
    )
  }

  if (isComplete || totalMistakes === 0) {
    return (
      <div className="flex justify-center p-4 md:p-6">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto h-12 w-12 md:h-16 md:w-16 text-accent-success mb-4" />
          <h2 className="text-lg md:text-xl font-bold text-text-primary mb-2">All Caught Up!</h2>
          <p className="text-sm md:text-base text-text-secondary">
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
        <div className="px-3 py-3 bg-accent-danger/8 border-b border-accent-danger/15">
          <div className="flex items-center justify-between mb-2 h-8">
            <span className="text-xs font-medium text-accent-danger">Mistakes Review</span>
            <span className="text-xs text-text-secondary">{currentIndex + 1}/{totalMistakes}</span>
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-danger transition-all duration-300"
              style={{ width: `${((currentIndex + (isCorrect ? 1 : 0)) / totalMistakes) * 100}%` }}
            />
          </div>
        </div>

        {/* Chessboard */}
        <div className="flex items-start justify-center">
          <div className="chess-board-container board-wrapper" key={boardKey}>
            <Chessground ref={chessgroundRef} config={config} onMove={makeMove} />
          </div>
        </div>

        {/* Position Info */}
        {parentNode && (
          <div className="px-3 py-2 bg-surface-1/50">
            <p className="text-xs text-text-secondary">Find the move after: <span className="text-text-primary font-bold">{parentNode.san}</span></p>
          </div>
        )}

        {/* Status */}
        <div className="px-3 py-2">
          {isCorrect ? (
            <div className="rounded-xl bg-accent-success/15 px-4 py-2 text-center border border-accent-success/20 animate-slide-up">
              <p className="text-accent-success font-medium text-sm flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Correct!
              </p>
            </div>
          ) : showWrongMove ? (
            <div className="rounded-xl bg-accent-danger/15 px-4 py-2 text-center border border-accent-danger/20 animate-slide-up">
              <p className="text-accent-danger font-medium text-sm flex items-center justify-center gap-2">
                <XCircle className="h-4 w-4" />
                Wrong move! Try again.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-accent-blue/15 px-4 py-2 text-center border border-accent-blue/20">
              <p className="text-accent-blue font-medium text-sm">
                Find the correct move!
                {wrongAttempts > 0 && ` (${wrongAttempts} wrong)`}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="px-3 py-2 flex justify-center gap-6">
          <div className="text-center">
            <p className="text-lg font-bold text-accent-success">{correctCount}</p>
            <p className="text-xs text-text-muted">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent-danger">{wrongCount}</p>
            <p className="text-xs text-text-muted">Wrong</p>
          </div>
        </div>

        {/* Sticky Footer Controls */}
        <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-surface-1 border-t border-border-subtle mt-auto">
          <div className="flex gap-2">
            {!isCorrect ? (
              <>
                <button
                  onClick={showHint}
                  disabled={hintLevel >= 2}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 py-2.5 text-sm font-medium text-text-primary disabled:opacity-50 touch-target hover:bg-surface-3 transition-all"
                >
                  <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-accent-warning' : ''}`} />
                  <span className="sr-only sm:not-sr-only">Hint</span>
                </button>
                <button
                  onClick={skipMistake}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 py-2.5 text-sm font-medium text-text-primary touch-target hover:bg-surface-3 transition-all"
                >
                  <SkipForward className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Skip</span>
                </button>
              </>
            ) : currentIndex < totalMistakes - 1 ? (
              <button
                onClick={nextMistake}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-success py-2.5 text-sm font-medium text-white touch-target hover:brightness-110 transition-all"
              >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={nextMistake}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-success py-2.5 text-sm font-medium text-white touch-target hover:brightness-110 transition-all"
              >
                <Trophy className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Finish</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex justify-center gap-6 p-6">
        {/* Board */}
        <div className="h-[600px] w-[600px] shrink-0 board-wrapper" key={boardKey}>
          <Chessground
            ref={chessgroundRef}
            config={config}
            onMove={makeMove}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[350px] rounded-xl bg-surface-1 border border-border-subtle overflow-hidden flex flex-col">
          {/* Info Header */}
          <div className="p-4 border-b border-border-subtle bg-accent-danger/8">
            <h3 className="text-sm font-medium text-accent-danger mb-1">Mistakes Review</h3>
            <p className="text-xs text-text-secondary">
              Practice positions where you made mistakes. Spaced repetition helps you remember.
            </p>
          </div>

          {/* Progress */}
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary">Progress</h3>
              <span className="text-sm text-text-muted">
                {currentIndex + 1} / {totalMistakes}
              </span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-danger transition-all duration-300 progress-bar-striped"
                style={{ width: `${((currentIndex + (isCorrect ? 1 : 0)) / totalMistakes) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Position Info */}
          {parentNode && (
            <div className="p-4 border-b border-border-subtle">
              <h3 className="text-sm font-medium text-text-secondary mb-2">Find the move after:</h3>
              <p className="text-lg font-bold text-text-primary">{parentNode.san}</p>
              {currentMistake && (
                <p className="text-xs text-text-muted mt-1">
                  Wrong attempts: {currentMistake.wrongAttempts} | Streak: {currentMistake.streak}
                </p>
              )}
            </div>
          )}

          {/* Status */}
          <div className="p-4 border-b border-border-subtle">
            {isCorrect ? (
              <div className="rounded-xl bg-accent-success/15 p-4 text-center border border-accent-success/20 animate-slide-up">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-accent-success" />
                <p className="text-accent-success font-medium">Correct!</p>
              </div>
            ) : showWrongMove ? (
              <div className="rounded-xl bg-accent-danger/15 p-4 text-center border border-accent-danger/20 animate-slide-up">
                <XCircle className="mx-auto mb-2 h-8 w-8 text-accent-danger" />
                <p className="text-accent-danger font-medium">Wrong move! Try again.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-accent-blue/15 p-4 text-center border border-accent-blue/20">
                <p className="text-accent-blue font-medium">Find the correct move!</p>
                {wrongAttempts > 0 && (
                  <p className="text-xs text-text-secondary mt-1">
                    {wrongAttempts} wrong {wrongAttempts === 1 ? 'attempt' : 'attempts'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-4 border-b border-border-subtle">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-accent-success">{correctCount}</p>
                <p className="text-xs text-text-muted">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent-danger">{wrongCount}</p>
                <p className="text-xs text-text-muted">Wrong</p>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Controls */}
          <div className="p-4 border-t border-border-subtle space-y-2">
            <div className="flex gap-2">
              {!isCorrect ? (
                <>
                  <button
                    onClick={showHint}
                    disabled={hintLevel >= 2}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-3 transition-all disabled:opacity-50"
                  >
                    <Lightbulb className={`h-4 w-4 ${hintLevel > 0 ? 'text-accent-warning' : ''}`} />
                    Hint
                  </button>
                  <button
                    onClick={skipMistake}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-3 transition-all"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </button>
                </>
              ) : currentIndex < totalMistakes - 1 ? (
                <button
                  onClick={nextMistake}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-success px-3 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={nextMistake}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-success px-3 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all"
                >
                  <Trophy className="h-4 w-4" />
                  Finish Review
                </button>
              )}
            </div>

            {/* Clear mistakes button */}
            <button
              onClick={clearAllMistakes}
              className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors"
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
