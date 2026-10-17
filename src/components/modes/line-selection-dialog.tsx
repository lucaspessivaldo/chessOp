import { useState } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { fenPly, formatMoves, getLineLabel, type StudyLine } from '@/lib/opening-utils'
import { cn } from '@/lib/utils'
import { ActionButton } from '@/components/training/training-ui'
import { LinesDialog } from './lines-dialog'

interface LineSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lines: StudyLine[]
  /** Currently selected keys (null = all lines) */
  initialSelection: string[] | null
  onConfirm: (keys: string[] | null) => void
}

/**
 * Pick which lines to include in practice
 */
export function LineSelectionDialog(props: LineSelectionDialogProps) {
  // Remount the content each time the dialog opens so the selection starts from the current one
  return props.open ? <LineSelectionContent {...props} /> : null
}

function LineSelectionContent({ open, onOpenChange, lines, initialSelection, onConfirm }: LineSelectionDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelection ?? lines.map(line => line.key))
  )

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allSelected = selected.size === lines.length

  return (
    <LinesDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Choose lines to practice"
      description={`${selected.size} of ${lines.length} selected`}
      footer={
        <div className="flex gap-2">
          <ActionButton
            size="sm"
            onClick={() => setSelected(allSelected ? new Set() : new Set(lines.map(line => line.key)))}
          >
            {allSelected ? 'Select none' : 'Select all'}
          </ActionButton>
          <ActionButton
            size="sm"
            tone="primary"
            className="flex-1"
            disabled={selected.size === 0}
            onClick={() => onConfirm(allSelected ? null : lines.map(l => l.key).filter(k => selected.has(k)))}
          >
            Practice {selected.size} line{selected.size === 1 ? '' : 's'}
          </ActionButton>
        </div>
      }
    >
      <ul className="space-y-1">
        {lines.map((line, index) => {
          const isSelected = selected.has(line.key)
          const Icon = isSelected ? CheckSquare : Square
          return (
            <li key={line.key}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggle(line.key)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                  isSelected ? 'bg-surface-2' : 'hover:bg-surface-2'
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', isSelected ? 'text-text-primary' : 'text-text-muted')} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    <span className="text-text-muted tabular-nums">{index + 1}.</span> {getLineLabel(line)}
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
    </LinesDialog>
  )
}
