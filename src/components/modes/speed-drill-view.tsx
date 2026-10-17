import { Clock, Medal, RotateCcw, Timer, Trophy, Zap } from 'lucide-react'
import type { OpeningStudy } from '@/types/opening'
import { Chessground } from '@/components/chessground'
import { PromotionDialog } from '@/components/promotion-dialog'
import { GameLayout } from '@/components/game-layout'
import { useSpeedDrill, formatTime } from '@/hooks/use-speed-drill'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { cn } from '@/lib/utils'
import { ActionButton, ProgressBar, SidebarSection, StatTile, StatusBanner } from '@/components/training/training-ui'
import { EmptyStudy } from './empty-study'

/**
 * Speed drill: every line back to back, against the clock
 */
export function SpeedDrillView({ study, onEdit }: { study: OpeningStudy; onEdit: () => void }) {
  if (study.moves.length === 0) return <EmptyStudy onEdit={onEdit} />
  return <SpeedDrillContent study={study} />
}

function SpeedDrillContent({ study }: { study: OpeningStudy }) {
  const d = useSpeedDrill({ study })
  const stats = d.result?.stats ?? d.stats

  useHotkeys({ r: d.resetDrill, Enter: d.phase === 'finished' ? d.resetDrill : undefined })

  const statTiles = (
    <div className="grid grid-cols-4 gap-2">
      <StatTile value={stats.correctMoves} label="Correct" tone="success" />
      <StatTile value={stats.wrongMoves} label="Wrong" tone="danger" />
      <StatTile value={`${stats.accuracy.toFixed(0)}%`} label="Accuracy" tone="primary" />
      <StatTile value={`${(stats.averageTimePerMove / 1000).toFixed(1)}s`} label="Per move" tone="warning" />
    </div>
  )

  const feedback = d.phase === 'finished' && d.result ? (
    <StatusBanner
      tone={d.result.isNewBest ? 'success' : 'warning'}
      icon={d.result.isNewBest ? Trophy : Medal}
      title={d.result.isNewBest ? 'New personal best!' : 'Drill complete'}
    >
      {formatTime(d.result.stats.timeMs)} · {d.result.stats.accuracy.toFixed(0)}% accuracy
      {d.result.previousRecord?.bestTimeMs ? ` · best ${formatTime(d.result.previousRecord.bestTimeMs)}` : ''}
      {d.result.stats.accuracy < 80 && <span className="block text-xs text-text-muted">Records need at least 80% accuracy.</span>}
    </StatusBanner>
  ) : d.phase === 'ready' ? (
    <StatusBanner tone="neutral" icon={Zap}>
      The clock starts with your first move. {d.totalLines} lines, random order — go!
    </StatusBanner>
  ) : null

  const clock = (large: boolean) => (
    <div className={cn('flex items-center gap-2', large && 'flex-col gap-1')}>
      <Clock className={cn('text-accent-warning', large ? 'h-6 w-6' : 'h-5 w-5')} />
      <span className={cn('font-mono font-semibold tabular-nums text-text-primary', large ? 'text-5xl' : 'text-2xl')}>
        {formatTime(d.elapsedMs)}
      </span>
    </div>
  )

  const resetButton = (
    <ActionButton tone="warning" icon={RotateCcw} onClick={d.resetDrill} className="w-full" shortcut="R">
      {d.phase === 'finished' ? 'Try again' : 'Restart'}
    </ActionButton>
  )

  return (
    <>
      {d.pendingPromotion && (
        <PromotionDialog color={study.color} onSelect={d.completePromotion} onCancel={d.cancelPromotion} />
      )}

      <GameLayout
        board={<Chessground config={d.chessgroundConfig} onMove={d.makeMove} />}
        boardClassName={cn(d.flashWrong && 'ring-2 ring-accent-danger animate-shake')}
        mobileTopBar={
          <div className="space-y-2 border-b border-border-subtle bg-surface-1 px-3 py-2.5">
            <div className="flex items-center justify-between">
              {clock(false)}
              <span className="text-xs tabular-nums text-text-secondary">Line {d.lineNumber}/{d.totalLines}</span>
            </div>
            <ProgressBar value={d.overallProgress} tone="warning" size="sm" label="Drill progress" />
          </div>
        }
        mobileContent={
          <div className="space-y-3 px-3 py-3">
            {feedback}
            {statTiles}
          </div>
        }
        mobileFooter={resetButton}
        sidebar={
          <>
            <SidebarSection className="py-6 text-center">
              {clock(true)}
              <p className="mt-2 text-xs text-text-muted">
                {d.record?.bestTimeMs
                  ? <>Personal best <span className="font-mono text-text-secondary">{formatTime(d.record.bestTimeMs)}</span> · {d.record.runs} run{d.record.runs === 1 ? '' : 's'}</>
                  : 'No record yet'}
              </p>
            </SidebarSection>

            <SidebarSection
              title="Progress"
              action={<span className="text-xs tabular-nums text-text-secondary">Line {d.lineNumber}/{d.totalLines}</span>}
            >
              <ProgressBar value={d.overallProgress} tone="warning" label="Drill progress" />
            </SidebarSection>

            <SidebarSection title="Stats">{statTiles}</SidebarSection>

            <div className="mt-auto space-y-3 border-t border-border-subtle p-4">
              {feedback}
              {resetButton}
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
                <Timer className="h-3 w-3" /> Wrong moves are added to Mistakes review
              </p>
            </div>
          </>
        }
      />
    </>
  )
}
