import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GameLayoutProps {
  /** The chessboard element (rendered exactly once) */
  board: ReactNode
  /** Content right below the board (all screen sizes) */
  belowBoard?: ReactNode
  /** Sidebar content for desktop */
  sidebar: ReactNode
  /** Mobile-only content between board and sticky footer */
  mobileContent?: ReactNode
  /** Mobile sticky footer controls */
  mobileFooter?: ReactNode
  /** Mobile top bar (progress, options) */
  mobileTopBar?: ReactNode
  /** Extra class on the board wrapper (e.g., ring for wrong move) */
  boardClassName?: string
}

/**
 * Shared responsive layout for all chess game modes (Study, Practice, Speed, Mistakes, Editor).
 *
 * Mobile: stacked column (top bar, board, content, sticky footer).
 * Desktop: board + sidebar side by side; the sidebar is height-matched to the board column.
 */
export function GameLayout({
  board,
  belowBoard,
  sidebar,
  mobileContent,
  mobileFooter,
  mobileTopBar,
  boardClassName,
}: GameLayoutProps) {
  return (
    <div
      className={cn(
        'game-layout flex min-h-full flex-1 flex-col lg:flex-row lg:items-stretch lg:justify-center lg:gap-6 lg:p-6',
        belowBoard && 'has-below-board'
      )}
    >
      {mobileTopBar && <div className="lg:hidden">{mobileTopBar}</div>}

      <div className="flex shrink-0 flex-col items-center gap-3">
        <div className={cn('game-board board-wrapper transition-shadow duration-200', boardClassName)}>
          {board}
        </div>
        {belowBoard && <div className="w-full game-board-width">{belowBoard}</div>}
      </div>

      {mobileContent && <div className="lg:hidden">{mobileContent}</div>}

      {/* The inner absolute wrapper keeps the sidebar exactly as tall as the board column */}
      <aside className="relative hidden lg:block w-[360px] xl:w-[380px] min-h-[420px] shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-1">
        <div className="absolute inset-0 flex flex-col overflow-y-auto sidebar-scroll">{sidebar}</div>
      </aside>

      {mobileFooter && (
        <div className="sticky bottom-0 z-10 mt-auto border-t border-border-subtle bg-surface-1/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {mobileFooter}
        </div>
      )}
    </div>
  )
}
