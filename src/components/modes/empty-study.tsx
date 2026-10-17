import { Edit, GitBranch } from 'lucide-react'
import { ActionButton } from '@/components/training/training-ui'

/**
 * Shown by training modes when the study has no moves yet
 */
export function EmptyStudy({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-1 border border-border-subtle">
          <GitBranch className="h-7 w-7 text-text-muted" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-text-primary">This study has no moves yet</h2>
        <p className="mb-6 text-sm text-text-secondary">
          Add your lines in the editor — play moves on the board, use the Lichess explorer or paste a PGN.
        </p>
        <ActionButton tone="primary" icon={Edit} onClick={onEdit}>
          Open editor
        </ActionButton>
      </div>
    </div>
  )
}
