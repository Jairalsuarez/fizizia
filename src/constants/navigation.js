export const adminNav = [
  { to: '/admin', label: 'Resumen', icon: 'dashboard', end: true, preload: () => import('../pages/admin/DashboardPage') },
  { to: '/admin/potenciales', label: 'Potenciales', icon: 'person_search', preload: () => import('../pages/admin/LeadsPage') },
  { to: '/admin/clientes', label: 'Clientes', icon: 'groups', preload: () => import('../pages/admin/ClientsPage') },
  { to: '/admin/proyectos', label: 'Proyectos', icon: 'folder', preload: () => import('../pages/admin/ProjectRequestsPage') },
  { to: '/admin/mensajes', label: 'Mensajes', icon: 'chat', preload: () => import('../pages/admin/MessagesPage') },
  { to: '/admin/pagos', label: 'Pagos', icon: 'payments', preload: () => import('../pages/admin/PaymentsPage') },
  { to: '/admin/finanzas', label: 'Finanzas', icon: 'account_balance_wallet', preload: () => import('../pages/admin/FinancePage') },
]

export const clientNav = [
  { to: '/cliente', label: 'Resumen', icon: 'dashboard', end: true, preload: () => import('../pages/client/DashboardPage') },
  { to: '/cliente/finanzas', label: 'Finanzas', icon: 'payments', preload: () => import('../pages/client/FinancesPage') },
]

export const developerNav = [
  { to: '/dev', label: 'Resumen', icon: 'dashboard', end: true, preload: () => import('../pages/developer/DashboardPage') },
  { to: '/dev/mensajes', label: 'Mensajes', icon: 'chat', preload: () => import('../pages/developer/MessagesPage') },
  { to: '/dev/finanzas', label: 'Finanzas', icon: 'account_balance_wallet', preload: () => import('../pages/developer/FinancePage') },
]
