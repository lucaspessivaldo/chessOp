import { useState } from 'react'
import { ClipboardCopy, Download, FileUp } from 'lucide-react'
import type { OpeningMoveNode } from '@/types/opening'
import { exportTreeToPgn, getTreeSummary, mergeTrees, parsePgn } from '@/lib/opening-utils'
import { useToast } from '@/components/ui/toast'
import { ActionButton } from '@/components/training/training-ui'

interface PgnPanelProps {
  moves: OpeningMoveNode[]
  studyName: string
  rootFen: string
  onImport: (moves: OpeningMoveNode[], mode: 'merge' | 'replace') => void
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'repertoire'
}

/**
 * Import a PGN (merge or replace) and export the repertoire as PGN
 */
export function PgnPanel({ moves, studyName, rootFen, onImport }: PgnPanelProps) {
  const { addToast } = useToast()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const runImport = (mode: 'merge' | 'replace') => {
    try {
      const parsed = parsePgn(text)
      onImport(mode === 'merge' ? mergeTrees(moves, parsed.moves) : parsed.moves, mode)
      const { lines } = getTreeSummary(parsed.moves)
      setText('')
      setError(null)
      addToast(`${lines} line${lines === 1 ? '' : 's'} read from PGN`, 'info')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid PGN')
    }
  }

  const exportPgn = () => exportTreeToPgn(moves, { Event: studyName || 'ChessOp repertoire' }, rootFen)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportPgn())
      addToast('PGN copied to clipboard', 'success')
    } catch {
      addToast('Could not access the clipboard', 'error')
    }
  }

  const download = () => {
    const blob = new Blob([exportPgn()], { type: 'application/x-chess-pgn' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slugify(studyName)}.pgn`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 border-t border-border-subtle pt-4">
      <div>
        <label htmlFor="pgn-import" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-secondary">
          <FileUp className="h-4 w-4" /> Import PGN
        </label>
        <textarea
          id="pgn-import"
          value={text}
          onChange={e => {
            setText(e.target.value)
            setError(null)
          }}
          placeholder="Paste a PGN — variations, comments and annotations are kept. e.g. 1. e4 c6 2. d4 d5 (2... e5?!) 3. Nc3"
          rows={4}
          spellCheck={false}
          className="w-full resize-y rounded-lg border border-border-strong bg-surface-2 px-3 py-2 font-mono text-xs text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
        />
        {error && <p role="alert" className="mt-1 text-xs text-accent-danger">{error}</p>}
        <div className="mt-2 flex gap-2">
          <ActionButton size="sm" tone="primary" disabled={!text.trim()} onClick={() => runImport('merge')} className="flex-1">
            {moves.length > 0 ? 'Merge into repertoire' : 'Import'}
          </ActionButton>
          {moves.length > 0 && (
            <ActionButton size="sm" disabled={!text.trim()} onClick={() => runImport('replace')}>
              Replace all
            </ActionButton>
          )}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-text-secondary">Export</span>
        <div className="flex gap-2">
          <ActionButton size="sm" icon={ClipboardCopy} onClick={copy} disabled={moves.length === 0} className="flex-1">
            Copy PGN
          </ActionButton>
          <ActionButton size="sm" icon={Download} onClick={download} disabled={moves.length === 0} className="flex-1">
            Download
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
