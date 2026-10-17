import { useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Flag,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Shuffle,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { Chessground } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { GameLayout } from '@/components/game-layout'
import { CompactMoveList } from '@/components/opening/move-list'
import { useOpeningPractice } from '@/hooks/use-opening-practice'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { fenPly, getLineLabel } from '@/lib/opening-utils'
import { cn } from '@/lib/utils'
import { ActionButton, ProgressBar, SidebarSection, StatusBanner, TurnIndicator } from '@/components/training/training-ui'
import { LineList, type LineStatus } from './line-list'
import { LinesDialog } from './lines-dialog'
import { LineSelectionDialog } from './line-selection-dialog'
import { EmptyStudy } from './empty-study'

interface PracticeViewProps {
  study: OpeningStudy
  onMistakeMade?: () => void
  onEdit: () => void
  onReviewMistakes: () => void
}

/**
 * Practice mode: play the lines from memory
 */
export function PracticeView(props: PracticeViewProps) {
  if (props.study.moves.length === 0) return <EmptyStudy onEdit={props.onEdit} />
  return <PracticeViewContent {...props} />
}

function PracticeViewContent({ study, onMistakeMade, onReviewMistakes }: PracticeViewProps) {
  const [showLines, setShowLines] = useState(false)
  const [showSelection, setShowSelection] = useState(false)
  const p = useOpeningPractice({ study, onMistake: onMistakeMade })

  const progress = (p.completedCount / Math.max(p.totalCount, 1)) * 100
  const startPly = fenPly(p.currentLine.startFen)
  const playing = p.status === 'playing'

  const statusOf = (key: string): LineStatus => {
    const stats = p.progress.lineStats[key]
    if (!p.progress.completedLineKeys.includes(key)) return 'none'
    return stats?.lastPerfect ? 'perfect' : 'mistakes'
  }

  useHotkeys({
    h: playing ? p.increaseHint : undefined,
    r: p.retryLine,
    Enter: p.status === 'line-complete' ? p.nextLine : undefined,
    ArrowRight: p.status === 'line-complete' ? p.nextLine : undefined,
    l: () => setShowLines(true),
  })

  const perfectRound = p.orderedLines.filter(line => statusOf(line.key) === 'perfect').length

  const feedback = p.showWrongMove ? (
    <StatusBanner tone="danger" icon={XCircle} title="Not in your repertoire">
      {p.hintLevel >= 2 ? 'Follow the arrow.' : 'The highlighted piece moves next — try again.'}
    </StatusBanner>
  ) : p.status === 'round-complete' ? (
    <StatusBanner tone="success" icon={Trophy} title="Round complete!">
      {perfectRound}/{p.totalCount} lines without mistakes.{' '}
      {perfectRound < p.totalCount && 'Review your mistakes to fix the weak spots.'}
    </StatusBanner>
  ) : p.status === 'line-complete' ? (
    <StatusBanner
      tone={p.wrongAttempts === 0 ? 'success' : 'warning'}
      icon={CheckCircle2}
      title={p.wrongAttempts === 0 ? 'Line completed!' : `Line completed with ${p.wrongAttempts} mistake${p.wrongAttempts === 1 ? '' : 's'}`}
    >
      {p.wrongAttempts > 0 ? 'The positions you missed were added to Mistakes review.' : 'Clean run — keep going.'}
    </StatusBanner>
  ) : p.currentLine.isSetup ? (
    <StatusBanner tone="neutral" icon={Flag}>Setup line: play the moves leading to your entry point.</StatusBanner>
  ) : (
    <StatusBanner tone="neutral" icon={Swords}>
      {p.isUserTurn ? 'Play your repertoire move.' : 'Opponent is thinking…'}
    </StatusBanner>
  )

  const controls = (
    <div className="flex gap-2">
      <ActionButton icon={RotateCcw} onClick={p.retryLine} className="flex-1" shortcut="R" compactLabel>
        Retry
      </ActionButton>
      {playing ? (
        <ActionButton
          icon={Lightbulb}
          onClick={p.increaseHint}
          disabled={p.hintLevel >= 2 || !p.isUserTurn}
          className={cn('flex-1', p.hintLevel > 0 && '[&_svg]:text-accent-warning')}
          shortcut="H"
        >
          Hint{p.hintLevel > 0 ? ` ${p.hintLevel}/2` : ''}
        </ActionButton>
      ) : p.status === 'round-complete' ? (
        <>
          {perfectRound < p.totalCount && (
            <ActionButton tone="danger" onClick={onReviewMistakes} className="flex-1" compactLabel icon={XCircle}>
              Mistakes
            </ActionButton>
          )}
          <ActionButton tone="warning" icon={RotateCcw} onClick={p.resetRound} className="flex-[1.5]">
            New round
          </ActionButton>
        </>
      ) : (
        <ActionButton tone="success" onClick={p.nextLine} trailingIcon={ChevronRight} className="flex-[1.5]" shortcut="↵">
          Next line
        </ActionButton>
      )}
    </div>
  )

  const options = (
    <div className="flex gap-2">
      <ActionButton size="sm" icon={ListChecks} onClick={() => setShowSelection(true)} className="flex-1">
        {p.isSelectionActive ? `${p.totalCount} of ${p.allLines.length} lines` : 'Choose lines'}
      </ActionButton>
      <ActionButton
        size="sm"
        tone={p.randomOrder ? 'primary' : 'neutral'}
        icon={Shuffle}
        onClick={() => p.setRandomOrder(!p.randomOrder)}
        aria-pressed={p.randomOrder}
        title="Random order"
      >
        Shuffle
      </ActionButton>
    </div>
  )

  const lineList = (onPicked?: () => void) => (
    <LineList
      lines={p.orderedLines}
      currentKey={p.currentLine.key}
      onSelect={key => {
        p.startLine(key)
        onPicked?.()
      }}
      statusOf={statusOf}
    />
  )

  return (
    <>
      {p.pendingPromotion && (
        <PromotionDialog color={study.color} onSelect={p.completePromotion} onCancel={p.cancelPromotion} />
      )}

      <LinesDialog
        open={showLines}
        onOpenChange={setShowLines}
        title="Practice lines"
        description={`${p.completedCount}/${p.totalCount} completed this round`}
        footer={options}
      >
        {lineList(() => setShowLines(false))}
      </LinesDialog>

      <LineSelectionDialog
        open={showSelection}
        onOpenChange={setShowSelection}
        lines={p.allLines}
        initialSelection={p.selectedKeys}
        onConfirm={keys => {
          p.selectLines(keys)
          setShowSelection(false)
        }}
      />

      <GameLayout
        board={<Chessground config={p.chessgroundConfig} onMove={p.makeMove} />}
        boardClassName={cn(
          p.showWrongMove && 'ring-4 ring-accent-danger animate-shake',
          p.status !== 'playing' && !p.showWrongMove && 'ring-4 ring-accent-success/70 animate-correct'
        )}
        mobileTopBar={
          <div className="space-y-2 border-b border-border-subtle bg-surface-1 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowLines(true)}
                className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-text-primary hover:bg-surface-2"
              >
                <ListChecks className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="truncate">
                  {p.completedCount}/{p.totalCount} · {getLineLabel(p.currentLine)}
                </span>
              </button>
              {playing && <TurnIndicator isUserTurn={p.isUserTurn} userColor={study.color} />}
            </div>
            <ProgressBar value={progress} tone="success" size="sm" label="Practice progress" />
          </div>
        }
        mobileContent={
          <div className="space-y-3 px-3 py-3">
            {feedback}
            {p.moveIndex > 0 && (
              <CompactMoveList
                line={p.currentLine.nodes}
                currentMoveIndex={p.moveIndex}
                startPly={startPly}
                hideFuture={p.status === 'playing'}
              />
            )}
          </div>
        }
        mobileFooter={controls}
        sidebar={
          <>
            <SidebarSection
              title="Practice"
              action={<span className="text-xs tabular-nums text-text-secondary">{p.completedCount}/{p.totalCount} lines</span>}
            >
              <ProgressBar value={progress} tone="success" label="Practice progress" />
              <div className="mt-3">{options}</div>
            </SidebarSection>

            <SidebarSection
              title={`Line ${p.currentLineNumber}`}
              action={playing && <TurnIndicator isUserTurn={p.isUserTurn} userColor={study.color} />}
            >
              <p className="mb-2 text-sm font-medium text-text-primary">
                {p.status === 'playing' ? 'Moves so far' : getLineLabel(p.currentLine)}
              </p>
              <CompactMoveList
                line={p.currentLine.nodes}
                currentMoveIndex={p.moveIndex}
                startPly={startPly}
                hideFuture={p.status === 'playing'}
              />
            </SidebarSection>

            <SidebarSection title="Lines" className="flex-1">
              {lineList()}
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
