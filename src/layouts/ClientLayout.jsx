import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { FloatingChat } from '../components/FloatingChat'
import { NotificationBell } from '../components/NotificationBell'
import { AvatarIcon } from '../data/avatars.jsx'

const navItems = [
  { to: '/cliente', label: 'Mi Panel', icon: 'dashboard' },
  { to: '/cliente/finanzas', label: 'Finanzas', icon: 'payments' },
]

export function ClientLayout() {
  const { signOut, session, user } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const avatarId = user?.avatar_id || '1'
  const email = session?.user?.email || ''

  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-dark-800/50">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center gap-2">
              <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-8 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
              <span className="text-fizzia-500 font-black text-xl">Fizzia</span>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/cliente'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'text-fizzia-400 bg-fizzia-500/10'
                        : 'text-dark-300 hover:text-white hover:bg-dark-800'
                    }`
                  }
                >
                  <span className="material-symbols-rounded text-lg">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <NotificationBell unreadCount={unreadCount} />

              <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="cursor-pointer flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-dark-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white">
                  <AvatarIcon id={avatarId} size={32} />
                </div>
                <span className="material-symbols-rounded text-dark-400 text-lg">expand_more</span>
              </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
                    <div className="p-4 border-b border-dark-700 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white">
                        <AvatarIcon id={avatarId} size={40} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{user?.full_name || user?.first_name || 'Usuario'}</p>
                        <p className="text-dark-400 text-xs truncate mt-0.5">{email}</p>
                      </div>
                    </div>
                    <div className="py-1">
                      <NavLink
                        to="/cliente/configuracion"
                        onClick={() => setDropdownOpen(false)}
                        className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
                      >
                        <span className="material-symbols-rounded text-base">settings</span>
                        Configuración
                      </NavLink>
                      <div className="border-t border-dark-700 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="cursor-pointer flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-dark-800 transition-colors"
                      >
                        <span className="material-symbols-rounded text-base">logout</span>
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden border-t border-dark-800/50 bg-black/60">
          <div className="flex overflow-x-auto px-4 py-2 gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/cliente'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'text-fizzia-400 bg-fizzia-500/10'
                      : 'text-dark-400 hover:text-white'
                  }`
                }
              >
                <span className="material-symbols-rounded text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <main className="pt-20 md:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <FloatingChat onUnreadChange={setUnreadCount} />
    </div>
  )
}
