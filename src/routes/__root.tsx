import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <div className="h-dvh flex flex-col overflow-hidden bg-zinc-900 text-zinc-50">
      <main className="flex-1 overflow-y-auto flex flex-col">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
})
