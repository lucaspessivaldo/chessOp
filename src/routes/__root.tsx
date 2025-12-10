import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Navbar } from '@/components/navbar'

export const Route = createRootRoute({
  component: () => (
    <>
      <Navbar />
      <main className="pt-14">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  ),
})
