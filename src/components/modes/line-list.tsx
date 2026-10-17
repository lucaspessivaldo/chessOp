import { CheckCircle2, Circle, CircleDot, Flag, XCircle } from 'lucide-react'
import { getLineLabel, formatMoves, fenPly, type StudyLine } from '@/lib/opening-utils'
import { cn } from '@/lib/utils'

export type LineStatus = 'none' | 'done' | 'perfect' | 'mistakes'

interface LineListProps {
  lines: StudyLine[]
  currentKey?: string
  onSelect: (key: string) => void
  statusOf?: (key: string) => LineStatus
  className?: string
}

const statusIcon = {
  none: { icon: Circle, className: 'text-text-muted' },
  done: { icon: CheckCircle2, className: 'text-accent-success' },
  perfect: { icon: CheckCircle2, className: 'text-accent-success' },
  mistakes: { icon: XCircle, className: 'text-accent-warning' },
}

/**
 * Selectable list of lines with their status
 */
export function LineList({ lines, currentKey, onSelect, statusOf, className }: LineListProps) {
  return (
    <ul className={cn('space-y-1', className)}>
      {lines.map((line, index) => {
        const isCurrent = line.key === currentKey
        const status = statusOf?.(line.key) ?? 'none'
        const { icon: Icon, className: iconClass } = isCurrent
          ? { icon: CircleDot, className: 'text-text-primary' }
          : statusIcon[status]

        return (
          <li key={line.key}>
            <button
              type="button"
              onClick={() => onSelect(line.key)}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left transition-colors flex items-start gap-2.5',
                isCurrent ? 'bg-surface-2 ring-1 ring-border-strong' : 'hover:bg-surface-2'
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                  <span className="text-text-muted tabular-nums">{index + 1}.</span>
                  <span className="truncate">{getLineLabel(line)}</span>
                  {line.isSetup && <Flag className="h-3 w-3 shrink-0 text-accent-success" />}
                </span>
                <span className="block truncate font-mono text-[11px] text-text-muted">
                  {formatMoves(line.nodes, fenPly(line.startFen), 8)}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
