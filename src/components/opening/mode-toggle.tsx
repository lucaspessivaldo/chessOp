import type { OpeningMode } from '@/types/opening'
import { BookOpen, Target } from 'lucide-react'

interface ModeToggleProps {
  mode: OpeningMode
  onModeChange: (mode: OpeningMode) => void
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-lg bg-zinc-800 p-1">
      <button
        onClick={() => onModeChange('study')}
        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === 'study'
            ? 'bg-blue-600 text-white'
            : 'text-zinc-400 hover:text-white'
          }`}
      >
        <BookOpen className="h-4 w-4" />
        Study
      </button>
      <button
        onClick={() => onModeChange('practice')}
        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === 'practice'
            ? 'bg-green-600 text-white'
            : 'text-zinc-400 hover:text-white'
          }`}
      >
        <Target className="h-4 w-4" />
        Practice
      </button>
    </div>
  )
}
