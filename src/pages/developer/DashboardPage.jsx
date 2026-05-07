import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/authContext'
import { supabase } from '../../services/supabase'
import { formatDate, formatMoney } from '../../utils/format'
import { PROJECT_STATUS, getProjectStatusColor, getProjectStatusLabel } from '../../domain/projects'
import { mergeRealtimeProject, useRealtimeProjects } from '../../hooks/useRealtimeProjects'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const handleRealtimeProject = useCallback((payload) => {
    if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(project => project.id !== payload.old.id))
    else setProjects(prev => prev.some(project => project.id === payload.new.id) ? mergeRealtimeProject(prev, payload.new) : prev)
  }, [])

  useRealtimeProjects(handleRealtimeProject)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      const { data: assignments } = await supabase
        .from('project_developers')
        .select('project_id')
        .eq('developer_id', user.id)

      if (assignments?.length) {
        const ids = assignments.map(a => a.project_id)
        const { data: projs } = await supabase
          .from('projects')
          .select('*, clients(name)')
          .in('id', ids)
          .order('created_at', { ascending: false })
        setProjects(projs || [])
      }
      setLoading(false)
    }
    load()
  }, [user?.id])

  if (loading) return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-dark-800 rounded-xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-dark-800 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => [PROJECT_STATUS.PREPARING, PROJECT_STATUS.WORKING].includes(p.status)).length

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bienvenido, {user?.full_name?.split(' ')[0] || user?.first_name || 'Developer'}, es hora de trabajar</h1>
        <p className="text-dark-400 text-sm mt-1">Estos son tus proyectos asignados</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
          <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">Proyectos asignados</p>
          <p className="text-2xl font-bold text-white">{totalProjects}</p>
        </div>
        <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
          <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">En progreso</p>
          <p className="text-2xl font-bold text-blue-400">{activeProjects}</p>
        </div>
        <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
          <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">Completados</p>
          <p className="text-2xl font-bold text-green-400">{projects.filter(p => p.status === PROJECT_STATUS.DELIVERED).length}</p>
        </div>
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
          <span className="material-symbols-rounded text-dark-600 text-5xl mb-3 block">folder_open</span>
          <p className="text-dark-400 text-sm">No tienes proyectos asignados aún</p>
          <p className="text-dark-600 text-xs mt-1">El administrador te asignará proyectos pronto</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => navigate(`/dev/proyecto/${project.id}`)}
              className="cursor-pointer text-left bg-dark-900/50 border border-dark-800 rounded-xl p-5 hover:border-dark-700 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-semibold truncate pr-3">{project.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-white shrink-0 ${getProjectStatusColor(project.status)}`}>
                  {getProjectStatusLabel(project.status)}
                </span>
              </div>
              <p className="text-sm text-dark-400 mb-3 truncate">{project.clients?.name || ''}</p>
              {project.repository_url && (
                <p className="text-xs text-purple-400 truncate">
                  <span className="material-symbols-rounded text-xs align-middle mr-0.5">code</span>
                  {project.repository_url}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dark-800 text-xs text-dark-500">
                <span>Creado: {formatDate(project.created_at)}</span>
                {project.final_price && <span>{formatMoney(project.final_price)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
