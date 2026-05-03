import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { LandingLayout } from './layouts/LandingLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { ClientLayout } from './layouts/ClientLayout'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { DashboardPage as AdminDashboardPage } from './pages/admin/DashboardPage'
import { LeadsPage as AdminLeadsPage } from './pages/admin/LeadsPage'
import { ClientsPage as AdminClientsPage } from './pages/admin/ClientsPage'
import { FinancePage as AdminFinancePage } from './pages/admin/FinancePage'
import { ProjectsPage as AdminProjectsPage } from './pages/admin/ProjectsPage'
import { DashboardPage as ClientDashboardPage } from './pages/client/DashboardPage'
import { ProjectPage as ClientProjectPage } from './pages/client/ProjectPage'
import { FinancesPage as ClientFinancesPage } from './pages/client/FinancesPage'
import { FilesPage as ClientFilesPage } from './pages/client/FilesPage'
import { ProfilePage as ClientProfilePage } from './pages/client/ProfilePage'
import { LandingPage } from './pages/LandingPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingLayout />}>
          <Route index element={<LandingPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/potenciales" element={<AdminLeadsPage />} />
            <Route path="/admin/clientes" element={<AdminClientsPage />} />
            <Route path="/admin/finanzas" element={<AdminFinancePage />} />
            <Route path="/admin/proyectos" element={<AdminProjectsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="client" />}>
          <Route element={<ClientLayout />}>
            <Route path="/cliente" element={<ClientDashboardPage />} />
            <Route path="/cliente/mi-proyecto" element={<ClientProjectPage />} />
            <Route path="/cliente/finanzas" element={<ClientFinancesPage />} />
            <Route path="/cliente/archivos" element={<ClientFilesPage />} />
            <Route path="/cliente/perfil" element={<ClientProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<LandingLayout />}>
          <Route path="*" element={<LandingPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
