import { Link, useRouterState } from '@tanstack/react-router'
import { Puzzle, Home } from 'lucide-react'

export function Navbar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/puzzles', label: 'Puzzles', icon: Puzzle },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">ChessOp</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = currentPath === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
