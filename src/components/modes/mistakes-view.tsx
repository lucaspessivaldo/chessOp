import { useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  SkipForward,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  XCircle,
  Play,
} from 'lucide-react'
import type { OpeningMoveNode, OpeningStudy } from '@/types/opening'
import { Chessground } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { GameLayout } from '@/components/game-layout'
import { ConfirmDialog } from '@/components/ui/custom-dialog'
import { useMistakesReview } from '@/hooks/use-mistakes-review'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { clearMistakes, getNextReviewAt, getStudyMistakes } from '@/lib/mistakes-storage'
import { findNodeById, formatMoves, fenPly, getPathToNode } from '@/lib/opening-utils'
import { cn } from '@/lib/utils'
import { ActionButton, ProgressBar, SidebarSection, StatTile, StatusBanner, TurnIndicator } from '@/components/training/training-ui'

interface MistakesViewProps {
  study: OpeningStudy
  onChanged?: () => void
  onPractice: () => void
}

function formatRelative(timestamp: number): string {
  const minutes = Math.max(1, Math.round((timestamp - Date.now()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.round(hours / 24)} days`
}

/**
 * Mistakes review: positions you got wrong, scheduled with spaced repetition
 */
export function MistakesReviewView({ study, onChanged, onPractice }: MistakesViewProps) {
  const r = useMistakesReview({ study, onReviewed: onChanged })
  const [confirmClear, setConfirmClear] = useState(false)

  const totalTracked = getStudyMistakes(study).length
  const nextReviewAt = getNextReviewAt(study)

  useHotkeys({
    h: !r.solved && !r.isComplete ? r.showHint : undefined,
    s: !r.solved && !r.isComplete ? r.skip : undefined,
    Enter: r.solved ? r.next : undefined,
    ArrowRight: r.solved ? r.next : undefined,
  })

  const clearDialog = (
    <ConfirmDialog
      isOpen={confirmClear}
      title="Clear all mistakes?"
      message="This removes the review history of this study. Your lines are not affected."
      confirmLabel="Clear"
      variant="danger"
      onConfirm={() => {
        clearMistakes(study.id)
        setConfirmClear(false)
        onChanged?.()
        r.startSession(false)
      }}
      onCancel={() => setConfirmClear(false)}
    />
  )

  // ===== Empty / finished states =====
  if (r.queue.length === 0 || r.isComplete) {
    const reviewed = r.results.clean + r.results.withErrors
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        {clearDialog}
        <div className="w-full max-w-md text-center">
          {r.queue.length > 0 ? (
            <>
              <Trophy className="mx-auto mb-4 h-14 w-14 text-accent-warning" />
              <h2 className="mb-2 text-xl font-bold text-text-primary">Review finished</h2>
              <div className="my-5 grid grid-cols-3 gap-2">
                <StatTile value={r.results.clean} label="First try" tone="success" />
                <StatTile value={r.results.withErrors} label="With errors" tone="danger" />
                <StatTile value={r.results.mastered} label="Mastered" tone="primary" />
              </div>
              {reviewed > 0 && r.results.withErrors > 0 && (
                <p className="mb-4 text-sm text-text-secondary">Positions you missed will come back in an hour.</p>
              )}
            </>
          ) : totalTracked === 0 ? (
            <>
              <Target className="mx-auto mb-4 h-14 w-14 text-text-muted" />
              <h2 className="mb-2 text-xl font-bold text-text-primary">No mistakes yet</h2>
              <p className="mb-6 text-sm text-text-secondary">
                Every wrong move you make in Practice or Speed drill is saved here and scheduled for review —
                harder positions come back more often.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-accent-success" />
              <h2 className="mb-2 text-xl font-bold text-text-primary">All caught up!</h2>
              <p className="mb-6 text-sm text-text-secondary">
                {totalTracked} position{totalTracked === 1 ? '' : 's'} scheduled.
                {nextReviewAt && <> Next review in <span className="text-text-primary">{formatRelative(nextReviewAt)}</span>.</>}
              </p>
            </>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <ActionButton tone="success" icon={Play} onClick={onPractice}>Practice</ActionButton>
            {totalTracked > 0 && (
              <ActionButton icon={Sparkles} onClick={() => r.startSession(true)}>
                Review all {totalTracked} now
              </ActionButton>
            )}
          </div>
          {totalTracked > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear mistake history
            </button>
          )}
        </div>
      </div>
    )
  }

  // ===== Reviewing =====
  const item = r.current
  const progress = ((r.index + (r.solved ? 1 : 0)) / r.queue.length) * 100
  const contextPath = item ? getPathToNode(study.moves, item.target.id) : []
  const contextNodes = contextPath
    .slice(-6, -1)
    .map(id => findNodeById(study.moves, id))
    .filter((node): node is OpeningMoveNode => node !== null)
  const contextPly = fenPly(study.rootFen) + Math.max(0, contextPath.length - 1 - contextNodes.length)

  const feedback = r.solved ? (
    <StatusBanner
      tone={r.wrongAttempts === 0 ? 'success' : 'warning'}
      icon={CheckCircle2}
      title={r.wrongAttempts === 0 ? 'Correct!' : 'Found it'}
    >
      {r.wrongAttempts === 0 ? 'The interval grows — you will see it less often.' : 'It will come back soon for another try.'}
      {item?.target.comment && <span className="mt-1 block text-text-primary">{item.target.comment}</span>}
    </StatusBanner>
  ) : r.showWrongMove ? (
    <StatusBanner tone="danger" icon={XCircle} title="Not the repertoire move">Try again{r.hintLevel > 0 ? ' — follow the hint.' : '.'}</StatusBanner>
  ) : (
    <StatusBanner tone="primary" icon={Target} title="Find your move">
      {contextNodes.length > 0 ? <span className="font-mono">{formatMoves(contextNodes, contextPly)}</span> : 'From the starting position.'}
    </StatusBanner>
  )

  const controls = (
    <div className="flex gap-2">
      {r.solved ? (
        <ActionButton tone="success" onClick={r.next} trailingIcon={ChevronRight} className="flex-1" shortcut="↵">
          {r.index < r.queue.length - 1 ? 'Next position' : 'Finish'}
        </ActionButton>
      ) : (
        <>
          <ActionButton
            icon={Lightbulb}
            onClick={r.showHint}
            disabled={r.hintLevel >= 2 || !r.isUserTurn}
            className={cn('flex-1', r.hintLevel > 0 && '[&_svg]:text-accent-warning')}
            shortcut="H"
          >
            Hint
          </ActionButton>
          <ActionButton icon={RotateCcw} onClick={r.retry} compactLabel>Replay</ActionButton>
          <ActionButton icon={SkipForward} onClick={r.skip} className="flex-1" shortcut="S">Skip</ActionButton>
        </>
      )}
    </div>
  )

  return (
    <>
      {clearDialog}
      {r.pendingPromotion && (
        <PromotionDialog color={study.color} onSelect={r.completePromotion} onCancel={r.cancelPromotion} />
      )}

      <GameLayout
        board={<Chessground config={r.chessgroundConfig} onMove={r.makeMove} />}
        boardClassName={cn(
          r.showWrongMove && 'ring-4 ring-accent-danger animate-shake',
          r.solved && 'ring-4 ring-accent-success/70 animate-correct'
        )}
        mobileTopBar={
          <div className="space-y-2 border-b border-border-subtle bg-surface-1 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent-danger">Mistakes review</span>
              <span className="text-xs tabular-nums text-text-secondary">{r.index + 1}/{r.queue.length}</span>
            </div>
            <ProgressBar value={progress} tone="danger" size="sm" label="Review progress" />
          </div>
        }
        mobileContent={<div className="px-3 py-3">{feedback}</div>}
        mobileFooter={controls}
        sidebar={
          <>
            <SidebarSection
              title="Mistakes review"
              action={<span className="text-xs tabular-nums text-text-secondary">{r.index + 1}/{r.queue.length}</span>}
            >
              <ProgressBar value={progress} tone="danger" label="Review progress" />
              <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                Clean answers push a position further out (1h → 4h → 12h → 1d …). Mistakes bring it back.
              </p>
            </SidebarSection>

            {item && (
              <SidebarSection title="This position" action={<TurnIndicator isUserTurn={r.isUserTurn} userColor={study.color} />}>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-surface-2/50 p-2">
                    <dt className="text-text-muted">Times missed</dt>
                    <dd className="text-base font-semibold text-text-primary tabular-nums">{item.mistake.wrongAttempts}</dd>
                  </div>
                  <div className="rounded-lg bg-surface-2/50 p-2">
                    <dt className="text-text-muted">Clean streak</dt>
                    <dd className="text-base font-semibold text-text-primary tabular-nums">{item.mistake.streak}</dd>
                  </div>
                </dl>
              </SidebarSection>
            )}

            <SidebarSection title="This session">
              <div className="grid grid-cols-3 gap-2">
                <StatTile value={r.results.clean} label="First try" tone="success" />
                <StatTile value={r.results.withErrors} label="With errors" tone="danger" />
                <StatTile value={r.results.skipped} label="Skipped" />
              </div>
            </SidebarSection>

            <div className="mt-auto space-y-3 border-t border-border-subtle p-4">
              {feedback}
              {controls}
            </div>
          </>
        }
      />
    </>
  )
}

