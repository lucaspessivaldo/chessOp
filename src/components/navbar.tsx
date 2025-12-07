import { Link, useRouterState } from '@tanstack/react-router'
import { Puzzle, Home, BookOpen } from 'lucide-react'

export function Navbar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/puzzles', label: 'Puzzles', icon: Puzzle },
    { path: '/openings', label: 'Openings', icon: BookOpen },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center group-hover:bg-violet-500 transition-colors">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-bold text-slate-50 tracking-tight">ChessOp</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = currentPath === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${isActive
                  ? 'bg-violet-500/10 text-violet-400'
                  : 'text-slate-400 hover:text-slate-50 hover:bg-slate-900'
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
