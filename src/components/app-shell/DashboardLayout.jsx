import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/authContext'
import { getMyProfile } from '../../api/profilesApi'
import { AvatarIcon } from '../../data/avatars.jsx'
import { useAppTheme } from '../../theme/appTheme'

export function DashboardLayout({
  navItems,
  roleLabel,
  settingsPath,
  theme = 'fizzia',
  topActions = null,
  children,
}) {
  const { signOut, session, user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(user)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { palette } = useAppTheme(theme)
  const preloadRoute = (item) => item.preload?.()

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
    let cancelled = false
    async function loadProfile() {
      if (!session?.user) return
      const p = await getMyProfile()
      if (!cancelled) setProfile(p || user)
    }
    loadProfile()
    return () => { cancelled = true }
  }, [session, user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const avatarId = profile?.avatar_id || user?.avatar_id || '1'
  const email = session?.user?.email || ''
  const displayName = profile?.full_name || profile?.first_name || roleLabel || 'Usuario'

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute -top-24 -left-24 w-[500px] h-[500px] ${palette.glow} rounded-full blur-3xl`} />
        <div className={`absolute top-1/2 -right-24 w-[400px] h-[400px] ${palette.glowSoft} rounded-full blur-3xl`} />
        <img
          src="/images/Solo la figura del logo.png"
          alt=""
          className="absolute bottom-[-8rem] left-1/2 h-[28rem] -translate-x-1/2 opacity-[0.035] blur-[1px]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-transparent to-dark-950/80" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-md border-b border-dark-800/50">
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NavLink to={navItems[0]?.to || '/'} className="cursor-pointer flex-shrink-0 flex items-center gap-2" title="Ir al resumen">
              <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-8 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
              <span className="text-fizzia-500 font-black text-xl">Fizzia</span>
            </NavLink>

            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onMouseEnter={() => preloadRoute(item)}
                  onFocus={() => preloadRoute(item)}
                  onTouchStart={() => preloadRoute(item)}
                  end={item.end ?? item.to.endsWith('/admin') ?? item.to.endsWith('/dev') ?? item.to.endsWith('/cliente')}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? `${palette.activeText} ${palette.activeBg}`
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
              {topActions}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="cursor-pointer flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full bg-white border ${palette.avatarBorder} overflow-hidden shrink-0`}>
                    <AvatarIcon id={avatarId} size={32} />
                  </div>
                  <span className="material-symbols-rounded text-dark-400 text-lg">expand_more</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
                    <div className="p-4 border-b border-dark-700">
                      <p className="text-white text-sm font-semibold truncate">{displayName}</p>
                      <p className="text-dark-400 text-xs truncate mt-0.5">{email}</p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${palette.badgeBg} ${palette.badgeText} font-medium`}>{roleLabel}</span>
                    </div>
                    <div className="py-1">
                      <NavLink
                        to={settingsPath}
                        onClick={() => setDropdownOpen(false)}
                        className={({ isActive }) =>
                          `cursor-pointer flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? `${palette.activeText} ${palette.activeBg}`
                              : 'text-dark-300 hover:text-white hover:bg-dark-800'
                          }`
                        }
                      >
                        <span className="material-symbols-rounded text-base">settings</span>
                        Configuracion
                      </NavLink>
                      <button
                        onClick={handleSignOut}
                        className="cursor-pointer flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-dark-800 transition-colors"
                      >
                        <span className="material-symbols-rounded text-base">logout</span>
                        Cerrar sesion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:hidden border-t border-dark-800/50 bg-black/60">
          <div className="flex overflow-x-auto px-4 py-2 gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => preloadRoute(item)}
                onFocus={() => preloadRoute(item)}
                onTouchStart={() => preloadRoute(item)}
                end={item.end ?? item.to.endsWith('/admin') ?? item.to.endsWith('/dev') ?? item.to.endsWith('/cliente')}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? `${palette.activeText} ${palette.activeBg}`
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

      <main className="pt-20 lg:pt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  )
}
