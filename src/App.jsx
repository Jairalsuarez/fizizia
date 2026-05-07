import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { ToastProvider } from './components/Toast'
import { ProtectedRoute } from './features/auth/ProtectedRoute'

const LandingLayout = lazy(() => import('./layouts/LandingLayout').then(module => ({ default: module.LandingLayout })))
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then(module => ({ default: module.AdminLayout })))
const ClientLayout = lazy(() => import('./layouts/ClientLayout').then(module => ({ default: module.ClientLayout })))
const DeveloperLayout = lazy(() => import('./layouts/DeveloperLayout').then(module => ({ default: module.DeveloperLayout })))
const LoginPage = lazy(() => import('./features/auth/LoginPage').then(module => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./features/auth/RegisterPage').then(module => ({ default: module.RegisterPage })))
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })))

const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage').then(module => ({ default: module.DashboardPage })))
const AdminProjectDetailPage = lazy(() => import('./pages/admin/ProjectDetailPage').then(module => ({ default: module.ProjectDetailPage })))
const AdminLeadsPage = lazy(() => import('./pages/admin/LeadsPage').then(module => ({ default: module.LeadsPage })))
const AdminClientsPage = lazy(() => import('./pages/admin/ClientsPage').then(module => ({ default: module.ClientsPage })))
const AdminFinancePage = lazy(() => import('./pages/admin/FinancePage').then(module => ({ default: module.FinancePage })))
const AdminMessagesPage = lazy(() => import('./pages/admin/MessagesPage').then(module => ({ default: module.MessagesPage })))
const AdminProjectRequestsPage = lazy(() => import('./pages/admin/ProjectRequestsPage').then(module => ({ default: module.ProjectRequestsPage })))
const AdminPaymentsPage = lazy(() => import('./pages/admin/PaymentsPage').then(module => ({ default: module.PaymentsPage })))
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage').then(module => ({ default: module.SettingsPage })))

const DeveloperDashboardPage = lazy(() => import('./pages/developer/DashboardPage').then(module => ({ default: module.DashboardPage })))
const DeveloperProjectDetailPage = lazy(() => import('./pages/developer/ProjectDetailPage').then(module => ({ default: module.ProjectDetailPage })))
const DeveloperMessagesPage = lazy(() => import('./pages/developer/MessagesPage').then(module => ({ default: module.MessagesPage })))
const DeveloperFinancePage = lazy(() => import('./pages/developer/FinancePage').then(module => ({ default: module.FinancePage })))
const DeveloperSettingsPage = lazy(() => import('./pages/developer/SettingsPage').then(module => ({ default: module.SettingsPage })))

const ClientDashboardPage = lazy(() => import('./pages/client/DashboardPage').then(module => ({ default: module.DashboardPage })))
const ClientNewProjectPage = lazy(() => import('./pages/client/NewProjectPage').then(module => ({ default: module.NewProjectPage })))
const ClientProjectCreatedPage = lazy(() => import('./pages/client/ProjectCreatedPage').then(module => ({ default: module.ProjectCreatedPage })))
const ClientProjectDetailPage = lazy(() => import('./pages/client/ProjectDetailPage').then(module => ({ default: module.ProjectDetailPage })))
const ClientProjectPage = lazy(() => import('./pages/client/ProjectPage').then(module => ({ default: module.ProjectPage })))
const ClientFinancesPage = lazy(() => import('./pages/client/FinancesPage').then(module => ({ default: module.FinancesPage })))
const ClientFilesPage = lazy(() => import('./pages/client/FilesPage').then(module => ({ default: module.FilesPage })))
const ClientProfilePage = lazy(() => import('./pages/client/ProfilePage').then(module => ({ default: module.ProfilePage })))
const ClientSettingsPage = lazy(() => import('./pages/client/SettingsPage').then(module => ({ default: module.SettingsPage })))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-950">
      <div className="text-center space-y-4">
        <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-12 w-auto mx-auto" />
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fizzia-500 mx-auto"></div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingLayout />}>
              <Route index element={<LandingPage />} />
            </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute role="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/proyecto/:projectId" element={<AdminProjectDetailPage />} />
              <Route path="/admin/potenciales" element={<AdminLeadsPage />} />
              <Route path="/admin/clientes" element={<AdminClientsPage />} />
              <Route path="/admin/proyectos" element={<AdminProjectRequestsPage />} />
              <Route path="/admin/mensajes" element={<AdminMessagesPage />} />
              <Route path="/admin/pagos" element={<AdminPaymentsPage />} />
              <Route path="/admin/finanzas" element={<AdminFinancePage />} />
              <Route path="/admin/configuracion" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="client" />}>
            <Route element={<ClientLayout />}>
              <Route path="/cliente" element={<ClientDashboardPage />} />
              <Route path="/cliente/nuevo-proyecto" element={<ClientNewProjectPage />} />
              <Route path="/cliente/proyecto-creado" element={<ClientProjectCreatedPage />} />
              <Route path="/cliente/proyecto/:projectId" element={<ClientProjectDetailPage />} />
              <Route path="/cliente/mi-proyecto" element={<ClientProjectPage />} />
              <Route path="/cliente/finanzas" element={<ClientFinancesPage />} />
              <Route path="/cliente/archivos" element={<ClientFilesPage />} />
              <Route path="/cliente/perfil" element={<ClientProfilePage />} />
              <Route path="/cliente/configuracion" element={<ClientSettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="developer" />}>
            <Route element={<DeveloperLayout />}>
              <Route path="/dev" element={<DeveloperDashboardPage />} />
              <Route path="/dev/proyecto/:projectId" element={<DeveloperProjectDetailPage />} />
              <Route path="/dev/mensajes" element={<DeveloperMessagesPage />} />
              <Route path="/dev/finanzas" element={<DeveloperFinancePage />} />
              <Route path="/dev/configuracion" element={<DeveloperSettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<LandingLayout />}>
            <Route path="*" element={<LandingPage />} />
          </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
