import { DashboardLayout } from '../components/app-shell/DashboardLayout'
import { adminNav } from '../constants/navigation'
import { DashboardDataProvider } from '../hooks/useDashboardData'

export function AdminLayout() {
  return (
    <DashboardDataProvider>
      <DashboardLayout
        navItems={adminNav}
        roleLabel="Admin"
        settingsPath="/admin/configuracion"
        theme="fizzia"
      />
    </DashboardDataProvider>
  )
}
