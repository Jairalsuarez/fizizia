import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyProjects } from '../../api/projectsApi'
import { useAuth } from '../../features/auth/authContext'
import { ProjectCard, ProjectCardSkeleton, EmptyProjects } from '../../components/ProjectCard'

export function DashboardPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const openMessages = () => {
    window.dispatchEvent(new CustomEvent('fizzia-open-chat', {
      detail: { projectId: projects[0]?.id },
    }))
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const projectsRes = await getMyProjects()
        setProjects(projectsRes || [])
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-dark-800 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-dark-800 rounded animate-pulse" />
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-40 bg-dark-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bienvenido, {user?.full_name?.split(' ')[0] || 'Usuario'}, es hora de trabajar
          </h1>
          <p className="text-dark-400 text-sm mt-1">Aqui esta el estado de tus proyectos</p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <button
              type="button"
              onClick={openMessages}
              className="cursor-pointer group relative px-4 py-2.5 bg-dark-900 border border-dark-700 text-white font-semibold rounded-xl hover:border-fizzia-500/50 hover:bg-dark-800 transition-all inline-flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-lg text-fizzia-400">chat</span>
              Mensajes
              <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-64 rounded-xl border border-dark-700 bg-dark-950 px-3 py-2 text-left text-xs font-medium text-dark-200 shadow-xl group-hover:block">
                Preguntar al desarrollador sobre tu proyecto
              </span>
            </button>
          )}
          <Link
            to="/cliente/nuevo-proyecto"
            className="cursor-pointer px-4 py-2.5 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all shadow-lg shadow-fizzia-500/25 inline-flex items-center gap-2"
          >
            <span className="material-symbols-rounded text-lg">add_circle</span>
            Nuevo proyecto
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyProjects
          message="Aun no tienes proyectos"
          actionLabel="Crear mi primer proyecto"
          actionTo="/cliente/nuevo-proyecto"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              to={`/cliente/proyecto/${project.id}`}
              showDescription
              showBudget
              showDate
            />
          ))}
        </div>
      )}
    </div>
  )
}
