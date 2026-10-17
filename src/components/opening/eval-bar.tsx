import type { EngineLine } from '@/lib/engine'
import { formatScore, whiteWinPercent } from '@/lib/engine'
import { cn } from '@/lib/utils'

interface EvalBarProps {
  /** Best engine line (null while thinking or when the engine is off) */
  line: EngineLine | null
  /** Board orientation: White's share grows from this side's edge */
  orientation: 'white' | 'black'
  direction?: 'vertical' | 'horizontal'
  className?: string
}

/**
 * Evaluation bar (like chess.com / Lichess): the white share shows White's winning chances
 */
export function EvalBar({ line, orientation, direction = 'vertical', className }: EvalBarProps) {
  const percent = line ? whiteWinPercent(line) : 50
  const whiteAhead = percent >= 50
  const label = line ? formatScore(line).replace('+', '') : ''
  const vertical = direction === 'vertical'
  // White sits at the bottom (vertical) / left (horizontal) when the board is seen from White
  const whiteAtStart = orientation === 'white'

  return (
    <div
      role="meter"
      aria-label="Engine evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={line ? formatScore(line) : 'No evaluation'}
      className={cn(
        'relative overflow-hidden rounded-sm bg-[#403d39] ring-1 ring-[#403d39]/50',
        vertical ? 'h-full w-4' : 'h-3 w-full',
        className
      )}
    >
      <div
        className={cn(
          'absolute bg-[#f4f4f2] transition-all duration-500 ease-out',
          vertical
            ? cn('inset-x-0', whiteAtStart ? 'bottom-0' : 'top-0')
            : cn('inset-y-0', whiteAtStart ? 'left-0' : 'right-0')
        )}
        style={vertical ? { height: `${percent}%` } : { width: `${percent}%` }}
      />
      {/* Midline */}
      <div className={cn('absolute bg-[#8a8a8a]/60', vertical ? 'inset-x-0 top-1/2 h-px' : 'inset-y-0 left-1/2 w-px')} />

      {label && (
        <span
          className={cn(
            'absolute z-10 select-none font-semibold tabular-nums leading-none',
            vertical ? 'inset-x-0 text-center text-[9px]' : 'inset-y-0 flex items-center px-1 text-[9px]',
            whiteAhead ? 'text-[#403d39]' : 'text-[#f4f4f2]',
            // Label sits at the edge of the side that is ahead
            vertical
              ? (whiteAhead === whiteAtStart ? 'bottom-1' : 'top-1')
              : (whiteAhead === whiteAtStart ? 'left-0' : 'right-0')
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
