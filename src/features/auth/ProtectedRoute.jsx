import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'

export function ProtectedRoute({ role }) {
  const { session, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fizzia-500"></div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRole = user?.role || session.user?.user_metadata?.role || 'client'

  if (role === 'admin' && !['admin', 'manager'].includes(userRole)) {
    return <Navigate to="/cliente" replace />
  }

  if (role === 'client' && ['admin', 'manager'].includes(userRole)) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
