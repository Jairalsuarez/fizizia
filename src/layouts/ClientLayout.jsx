import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { Icon } from '../components/ui/Icon'

const navItems = [
  { to: '/cliente', label: 'Mi Panel', icon: 'dashboard' },
  { to: '/cliente/mi-proyecto', label: 'Mi Proyecto', icon: 'folder' },
  { to: '/cliente/finanzas', label: 'Finanzas', icon: 'payments' },
  { to: '/cliente/archivos', label: 'Archivos', icon: 'attach_file' },
  { to: '/cliente/perfil', label: 'Mi Perfil', icon: 'person' },
]

export function ClientLayout() {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-dark-950">
      <aside className="fixed left-0 top-0 w-64 h-screen bg-dark-900 border-r border-dark-700 flex flex-col">
        <div className="p-6">
          <span className="text-fizzia-500 font-bold text-xl">Fizzia</span>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-fizzia-500/10 text-fizzia-400'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-700">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <Icon name="logout" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
