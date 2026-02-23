import { useState, useMemo } from 'react'
import type { OpeningMoveNode } from '@/types/opening'
import { getAllLines, getLineName } from '@/lib/opening-utils'
import { CheckCircle, Circle } from 'lucide-react'

interface VariationSelectorProps {
  moves: OpeningMoveNode[]
  onStart: (selectedIndices: number[]) => void
  onCancel: () => void
}

export function VariationSelector({ moves, onStart, onCancel }: VariationSelectorProps) {
  const allLines = useMemo(() => getAllLines(moves), [moves])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(allLines.map((_, i) => i)) // All selected by default
  )

  const toggleLine = (index: number) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedIndices(new Set(allLines.map((_, i) => i)))
  }

  const selectNone = () => {
    setSelectedIndices(new Set())
  }

  const handleStart = () => {
    if (selectedIndices.size === 0) {
      alert('Please select at least one line to practice')
      return
    }
    onStart(Array.from(selectedIndices).sort((a, b) => a - b))
  }

  return (
    <div className="rounded-xl bg-surface-1 p-4 border border-border-subtle">
      <h3 className="text-sm font-medium text-text-primary mb-3">Select Lines to Practice</h3>

      {/* Quick actions */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={selectAll}
          className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors"
        >
          Select All
        </button>
        <button
          onClick={selectNone}
          className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors"
        >
          Select None
        </button>
        <span className="ml-auto text-xs text-text-secondary">
          {selectedIndices.size} / {allLines.length} selected
        </span>
      </div>

      {/* Lines list */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto mb-4 sidebar-scroll">
        {allLines.map((line, index) => {
          const isSelected = selectedIndices.has(index)
          return (
            <button
              key={index}
              onClick={() => toggleLine(index)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${isSelected
                ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/20'
                : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                }`}
            >
              {isSelected ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">Line {index + 1}: {getLineName(line, index, 6)}</span>
            </button>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-3 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleStart}
          disabled={selectedIndices.size === 0}
          className="flex-1 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Practice ({selectedIndices.size} lines)
        </button>
      </div>
    </div>
  )
}
