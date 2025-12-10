import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Navbar } from '@/components/navbar'

export const Route = createRootRoute({
  component: () => (
    <div className="h-dvh flex flex-col overflow-hidden bg-zinc-900 text-zinc-50">
      <Navbar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-16 flex flex-col">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
})
