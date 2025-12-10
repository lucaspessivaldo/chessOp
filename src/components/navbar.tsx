import { Link, useRouterState } from '@tanstack/react-router'
import { Home, BookOpen } from 'lucide-react'

export function Navbar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/openings', label: 'Openings', icon: BookOpen },
  ]

  return (
    <nav className="shrink-0 fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950 safe-top">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-3 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 md:gap-2 group">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-sm bg-blue-600 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
            <span className="text-white font-bold text-base md:text-lg">C</span>
          </div>
          <span className="text-lg md:text-xl font-bold text-zinc-50 tracking-tight">ChessOp</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-0.5 md:gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = currentPath === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center justify-center gap-1.5 md:gap-2 rounded-sm px-3 md:px-4 py-2 text-sm font-medium transition-all duration-300 touch-target ${isActive
                  ? 'bg-blue-500/10 text-blue-300'
                  : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
                  }`}
              >
                <Icon className="h-4 w-4 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
