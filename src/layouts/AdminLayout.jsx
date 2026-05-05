import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/authContext'
import { getMyProfile } from '../services/clientData'
import { DashboardDataProvider } from '../hooks/useDashboardData'

const navItems = [
  { to: '/admin', label: 'Panel', icon: 'dashboard' },
  { to: '/admin/potenciales', label: 'Potenciales', icon: 'person_search' },
  { to: '/admin/clientes', label: 'Clientes', icon: 'groups' },
  { to: '/admin/proyectos', label: 'Proyectos', icon: 'folder' },
  { to: '/admin/mensajes', label: 'Mensajes', icon: 'chat' },
  { to: '/admin/pagos', label: 'Pagos', icon: 'payments' },
  { to: '/admin/finanzas', label: 'Finanzas', icon: 'account_balance_wallet' },
]

export function AdminLayout() {
  const { signOut, session } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

  useEffect(() => {
    const loadProfile = async () => {
      if (session?.user) {
        const p = await getMyProfile()
        setProfile(p)
      }
    }
    loadProfile()
  }, [session])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile?.first_name
      ? profile.first_name[0].toUpperCase()
      : 'A'

  const email = session?.user?.email || ''

  return (
    <DashboardDataProvider>
    <div className="min-h-screen bg-dark-950">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-fizzia-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] bg-fizzia-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-fizzia-600/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-transparent to-dark-950/80" />
        </div>

        {/* Top nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-md border-b border-dark-800/50">
          <div className="absolute inset-0 bg-gradient-to-b from-dark-950/50 to-transparent" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex-shrink-0 flex items-center gap-2">
                <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-8 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
                <span className="text-fizzia-500 font-black text-xl">Fizzia</span>
              </div>

              <div className="hidden lg:flex items-center space-x-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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

              {/* Profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="cursor-pointer flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-fizzia-500/20 border border-fizzia-500/30 flex items-center justify-center text-fizzia-400 text-xs font-bold">
                    {initials}
                  </div>
                  <span className="material-symbols-rounded text-dark-400 text-lg">expand_more</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
                    <div className="p-4 border-b border-dark-700">
                      <p className="text-white text-sm font-semibold truncate">{profile?.full_name || profile?.first_name || 'Admin'}</p>
                      <p className="text-dark-400 text-xs truncate mt-0.5">{email}</p>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-fizzia-500/20 text-fizzia-400 font-medium">Admin</span>
                    </div>
                    <div className="py-1">
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

          {/* Mobile scrollable nav */}
          <div className="lg:hidden border-t border-dark-800/50 bg-black/60">
            <div className="flex overflow-x-auto px-4 py-2 gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
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

        {/* Content */}
        <main className="pt-20 lg:pt-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </DashboardDataProvider>
  )
}
