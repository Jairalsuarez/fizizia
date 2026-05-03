import { Outlet } from 'react-router-dom'

export function LandingLayout() {
  return (
    <div className="bg-dark-950 min-h-screen">
      <main>
        <Outlet />
      </main>
    </div>
  )
}
