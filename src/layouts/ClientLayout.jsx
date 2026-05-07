import { useState } from 'react'
import { DashboardLayout } from '../components/app-shell/DashboardLayout'
import { FloatingChat } from '../components/FloatingChat'
import { NotificationBell } from '../components/NotificationBell'
import { clientNav } from '../constants/navigation'

export function ClientLayout() {
  const [unreadCount, setUnreadCount] = useState(0)

  return (
    <>
      <DashboardLayout
        navItems={clientNav}
        roleLabel="Cliente"
        settingsPath="/cliente/configuracion"
        theme="fizzia"
        topActions={<NotificationBell unreadCount={unreadCount} />}
      />
      <FloatingChat onUnreadChange={setUnreadCount} />
    </>
  )
}
