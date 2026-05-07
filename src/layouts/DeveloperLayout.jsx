import { DashboardLayout } from '../components/app-shell/DashboardLayout'
import { developerNav } from '../constants/navigation'

export function DeveloperLayout() {
  return (
    <DashboardLayout
      navItems={developerNav}
      roleLabel="Developer"
      settingsPath="/dev/configuracion"
      theme="rose"
    />
  )
}
