import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'
import { canAccessRoleArea, getRoleHome, normalizeRole, ROLES } from './roles'

export function ProtectedRoute({ role }) {
  const { session, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="text-center space-y-4">
          <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-12 w-auto mx-auto" />
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fizzia-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRole = normalizeRole(user?.role || session.user?.user_metadata?.role)

  if (!canAccessRoleArea(role, userRole)) {
    return <Navigate to={getRoleHome(userRole)} replace />
  }

  if (role === 'client' && userRole !== ROLES.CLIENT) {
    return <Navigate to={getRoleHome(userRole)} replace />
  }

  return <Outlet />
}
