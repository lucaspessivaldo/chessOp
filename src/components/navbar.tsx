import { Link, useRouterState } from '@tanstack/react-router'
import { Home, BookOpen } from 'lucide-react'

function ChessKnightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 22H5v-2h14v2M13 2c-1.25 0-2.42.62-3.11 1.66L7 8l2 2 2.06-2.06C11.28 8.72 12 9.81 12 11v5h2V11c0-1.06-.27-2.07-.75-2.94L17 4.5 15.5 3l-2.06 2.06C13.16 4.44 12.87 4 12.5 3.65 12.08 3.25 11.55 3 11 3h2V2z" />
    </svg>
  )
}

export function Navbar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/openings', label: 'Openings', icon: BookOpen },
  ]

  return (
    <nav className="shrink-0 fixed top-0 left-0 right-0 z-50 border-b border-border-subtle backdrop-blur-xl bg-surface-0/80 safe-top">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-3 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 md:gap-2 group">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent-blue flex items-center justify-center group-hover:bg-accent-blue-hover transition-colors shadow-sm">
            <ChessKnightIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="text-lg md:text-xl font-bold text-text-primary tracking-tight">ChessOp</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-0.5 md:gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = currentPath === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center justify-center gap-1.5 md:gap-2 rounded-lg px-3 md:px-4 py-2 text-sm font-medium transition-all duration-200 touch-target ${isActive
                  ? 'bg-accent-blue/15 text-accent-blue'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
