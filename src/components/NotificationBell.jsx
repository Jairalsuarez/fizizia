import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../features/auth/authContext'
import { getMyProjects } from '../api/projectsApi'
import { getProjectStatusLabel } from '../domain/projects'

export function NotificationBell({ unreadCount }) {
  const { session } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!session?.user) return

    const loadNotifications = async () => {
      try {
        const projects = await getMyProjects()
        const notifs = (projects || []).map(p => ({
          id: p.id,
          title: p.name,
          message: `Proyecto en fase: ${getProjectStatusLabel(p.status)}`,
          time: p.created_at,
          type: p.status === 'solicitado' ? 'info' : 'success',
          read: p.status !== 'solicitado',
        }))

        notifs.push({
          id: 'welcome',
          title: 'Bienvenido a Fizzia',
          message: 'Tu cuenta ha sido creada exitosamente',
          time: new Date().toISOString(),
          type: 'success',
          read: true,
        })

        setNotifications(notifs)
      } catch { /* ignore */ }
    }
    loadNotifications()
  }, [session])

  const getRelativeTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `Hace ${diffDays}d`
  }

  const getNotifIcon = (type) => {
    switch (type) {
      case 'info': return 'info'
      case 'success': return 'check_circle'
      case 'warning': return 'warning'
      default: return 'notifications'
    }
  }

  const getNotifColor = (type) => {
    switch (type) {
      case 'info': return 'text-blue-400'
      case 'success': return 'text-fizzia-400'
      case 'warning': return 'text-yellow-400'
      default: return 'text-dark-400'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer relative p-2 rounded-lg hover:bg-dark-800 transition-colors"
      >
        <span className="material-symbols-rounded text-dark-400 text-xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
          <div className="p-4 border-b border-dark-700">
            <h3 className="text-white text-sm font-semibold">Notificaciones</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-rounded text-dark-600 text-3xl">notifications_none</span>
                <p className="text-dark-500 text-sm mt-2">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-dark-800 last:border-b-0 ${
                    !notif.read ? 'bg-fizzia-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-rounded text-lg mt-0.5 ${getNotifColor(notif.type)}`}>
                      {getNotifIcon(notif.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{notif.title}</p>
                      <p className="text-dark-400 text-xs mt-0.5">{notif.message}</p>
                      <p className="text-dark-600 text-[10px] mt-1">{getRelativeTime(notif.time)}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-fizzia-500 mt-1.5 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
