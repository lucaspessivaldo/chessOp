import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="h-dvh flex flex-col overflow-hidden bg-surface-0 text-text-primary">
      <main className="flex-1 overflow-y-auto flex flex-col">
        <Outlet />
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-extrabold text-text-muted">404</p>
      <p className="text-text-secondary">This page doesn't exist.</p>
      <Link to="/openings" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90">
        Go to your repertoire
      </Link>
    </div>
  ),
})
