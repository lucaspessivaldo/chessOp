import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-ink-foreground">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M19 22H5v-2h14v2M13 2c-1.25 0-2.42.62-3.11 1.66L7 8l2 2 2.06-2.06C11.28 8.72 12 9.81 12 11v5h2V11c0-1.06-.27-2.07-.75-2.94L17 4.5 15.5 3l-2.06 2.06C13.16 4.44 12.87 4 12.5 3.65 12.08 3.25 11.55 3 11 3h2V2z" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-text-primary">ChessOp</span>
    </span>
  )
}

export function Navbar() {
  const linkClass =
    'rounded-md px-3 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary data-[status=active]:text-text-primary data-[status=active]:font-medium'

  return (
    <nav className="safe-top fixed inset-x-0 top-0 z-50 border-b border-border-subtle bg-surface-0/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" aria-label="ChessOp home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/" className={linkClass} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/openings" className={linkClass}>
            Repertoire
          </Link>
          <div className="mx-1 h-5 w-px bg-border-subtle" />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
