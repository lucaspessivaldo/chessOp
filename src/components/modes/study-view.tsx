import { useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, ListTree, Lightbulb, MessageCircle, PartyPopper, RotateCcw, CheckCircle2 } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { Chessground } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { GameLayout } from '@/components/game-layout'
import { CompactMoveList } from '@/components/opening/move-list'
import { useOpeningStudy } from '@/hooks/use-opening-study'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { fenPly, getLineLabel } from '@/lib/opening-utils'
import { ActionButton, ProgressBar, SidebarSection, StatusBanner, TurnIndicator } from '@/components/training/training-ui'
import { LineList } from './line-list'
import { LinesDialog } from './lines-dialog'
import { EmptyStudy } from './empty-study'

/**
 * Study mode: guided walk-through of every line, with arrows and the author's comments
 */
export function StudyView({ study, onEdit, onPractice }: { study: OpeningStudy; onEdit: () => void; onPractice: () => void }) {
  if (study.moves.length === 0) return <EmptyStudy onEdit={onEdit} />
  return <StudyViewContent study={study} onPractice={onPractice} />
}

function StudyViewContent({ study, onPractice }: { study: OpeningStudy; onPractice: () => void }) {
  const [showLines, setShowLines] = useState(false)
  const s = useOpeningStudy({ study })

  const hasNext = s.lineIndex < s.lines.length - 1
  const progress = (s.completedKeys.size / Math.max(s.lines.length, 1)) * 100
  const startPly = fenPly(s.currentLine.startFen)

  useHotkeys({
    r: s.restartLine,
    ArrowRight: s.isLineComplete && hasNext ? s.nextLine : undefined,
    Enter: s.isLineComplete && hasNext ? s.nextLine : undefined,
    ArrowLeft: s.lineIndex > 0 ? s.previousLine : undefined,
    l: () => setShowLines(true),
  })

  const feedback = s.isStudyComplete && s.isLineComplete ? (
    <StatusBanner tone="success" icon={PartyPopper} title="You've studied every line!">
      Now test yourself without arrows in Practice mode.
    </StatusBanner>
  ) : s.isLineComplete ? (
    <StatusBanner tone="success" icon={CheckCircle2} title="Line completed">
      {hasNext ? 'Continue with the next line.' : 'That was the last line.'}
    </StatusBanner>
  ) : (
    <div className="space-y-2">
      {s.opponentComment && (
        <StatusBanner tone="neutral" icon={MessageCircle}>{s.opponentComment}</StatusBanner>
      )}
      {s.upcomingComment ? (
        <StatusBanner tone="warning" icon={Lightbulb}>{s.upcomingComment}</StatusBanner>
      ) : !s.opponentComment && (
        <StatusBanner tone="neutral" icon={BookOpen}>
          {s.isUserTurn ? 'Play the move shown by the green arrow.' : 'Watch the opponent’s reply…'}
        </StatusBanner>
      )}
    </div>
  )

  const controls = (
    <div className="flex gap-2">
      <ActionButton icon={RotateCcw} onClick={s.restartLine} className="flex-1" shortcut="R" compactLabel>
        Restart
      </ActionButton>
      {s.isStudyComplete && s.isLineComplete ? (
        <ActionButton tone="success" onClick={onPractice} className="flex-[2]" trailingIcon={ChevronRight}>
          Practice
        </ActionButton>
      ) : (
        <ActionButton
          tone={s.isLineComplete ? 'success' : 'neutral'}
          onClick={s.nextLine}
          disabled={!hasNext}
          className="flex-[2]"
          trailingIcon={ChevronRight}
          shortcut="→"
        >
          Next line
        </ActionButton>
      )}
    </div>
  )

  return (
    <>
      {s.pendingPromotion && (
        <PromotionDialog color={study.color} onSelect={s.completePromotion} onCancel={s.cancelPromotion} />
      )}

      <LinesDialog open={showLines} onOpenChange={setShowLines} title="Lines" description={`${s.lines.length} lines in this study`}>
        <LineList
          lines={s.lines}
          currentKey={s.currentLine.key}
          onSelect={key => {
            s.selectLine(s.lines.findIndex(l => l.key === key))
            setShowLines(false)
          }}
          statusOf={key => (s.completedKeys.has(key) ? 'done' : 'none')}
        />
      </LinesDialog>

      <GameLayout
        board={<Chessground config={s.chessgroundConfig} onMove={s.makeMove} />}
        mobileTopBar={
          <div className="space-y-2 border-b border-border-subtle bg-surface-1 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowLines(true)}
                className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-text-primary hover:bg-surface-2"
              >
                <ListTree className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="truncate">Line {s.lineIndex + 1}/{s.lines.length} · {getLineLabel(s.currentLine)}</span>
              </button>
              <TurnIndicator isUserTurn={s.isUserTurn} userColor={study.color} />
            </div>
            <ProgressBar value={progress} size="sm" label="Lines studied" />
          </div>
        }
        mobileContent={
          <div className="space-y-3 px-3 py-3">
            {feedback}
            <CompactMoveList line={s.currentLine.nodes} currentMoveIndex={s.moveIndex} startPly={startPly} />
          </div>
        }
        mobileFooter={controls}
        sidebar={
          <>
            <SidebarSection
              title="Study"
              action={<span className="text-xs tabular-nums text-text-secondary">{s.completedKeys.size}/{s.lines.length} lines</span>}
            >
              <ProgressBar value={progress} label="Lines studied" />
            </SidebarSection>

            <SidebarSection
              title={`Line ${s.lineIndex + 1}`}
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={s.previousLine}
                    disabled={s.lineIndex === 0}
                    className="rounded-md p-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
                    aria-label="Previous line"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={s.nextLine}
                    disabled={!hasNext}
                    className="rounded-md p-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
                    aria-label="Next line"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              }
            >
              <p className="mb-2 text-sm font-medium text-text-primary">{getLineLabel(s.currentLine)}</p>
              <CompactMoveList line={s.currentLine.nodes} currentMoveIndex={s.moveIndex} startPly={startPly} />
            </SidebarSection>

            <SidebarSection title="All lines" className="flex-1">
              <LineList
                lines={s.lines}
                currentKey={s.currentLine.key}
                onSelect={key => s.selectLine(s.lines.findIndex(l => l.key === key))}
                statusOf={key => (s.completedKeys.has(key) ? 'done' : 'none')}
              />
            </SidebarSection>

            <div className="sticky bottom-0 mt-auto space-y-3 border-t border-border-subtle bg-surface-1 p-4">
              {feedback}
              {controls}
            </div>
          </>
        }
      />
    </>
  )
}
