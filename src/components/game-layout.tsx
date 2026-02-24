import type { ReactNode } from 'react'

interface GameLayoutProps {
  /** The chessboard element */
  board: ReactNode
  /** Content below the board (e.g., navigation bar in editor) */
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
 * Shared responsive layout for all chess game modes (Study, Practice, Speed, Mistakes).
 *
 * Desktop: side-by-side board + sidebar, responsive board sizing with CSS min().
 * Mobile: stacked column with optional sticky footer.
 *
 * The sidebar is height-matched to the board via CSS custom property --board-size.
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
    <>
      {/* ===== Mobile Layout ===== */}
      <div className="lg:hidden flex flex-col min-h-full">
        {mobileTopBar}

        {/* Board */}
        <div className="flex items-start justify-center">
          <div className={`chess-board-container board-wrapper ${boardClassName ?? ''}`}>
            {board}
          </div>
        </div>

        {mobileContent}

        {mobileFooter && (
          <div className="sticky bottom-0 lg:hidden px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-surface-1 border-t border-border-subtle mt-auto">
            {mobileFooter}
          </div>
        )}
      </div>

      {/* ===== Desktop Layout ===== */}
      <div className="hidden lg:flex justify-center gap-6 p-4">
        <div className="game-layout-root flex gap-6 max-w-[1100px] w-full justify-center">
          {/* Board column */}
          <div className="flex flex-col gap-3 shrink-0">
            <div className={`game-board shrink-0 board-wrapper ${boardClassName ?? ''}`}>
              {board}
            </div>
            {belowBoard}
          </div>

          {/* Sidebar */}
          <div className="game-sidebar min-w-[320px] max-w-[400px] flex-1 rounded-xl bg-surface-1 border border-border-subtle overflow-hidden flex flex-col">
            {sidebar}
          </div>
        </div>
      </div>
    </>
  )
}
