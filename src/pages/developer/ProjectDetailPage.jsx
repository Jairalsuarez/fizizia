import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/authContext'
import { supabase } from '../../services/supabase'
import { fetchGitHubCommits, formatCommitTime, getCommitAuthorName } from '../../utils/github'
import { readStoredValue, writeStoredValue } from '../../utils/persistedState'
import { useRealtimeProject } from '../../hooks/useRealtimeProjects'

const statusLabels = {
  solicitado: 'Solicitado', preparando: 'Preparando', trabajando: 'Trabajando',
  pausado: 'Pausado', entregado: 'Entregado', cancelado: 'Cancelado',
}

const statusColors = {
  solicitado: 'bg-fizzia-500', preparando: 'bg-purple-500', trabajando: 'bg-blue-500',
  pausado: 'bg-yellow-500', entregado: 'bg-green-500', cancelado: 'bg-red-500',
}

export function ProjectDetailPage() {
  const { user } = useAuth()
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(() => {
    return readStoredValue(`dev-project-tab-${projectId}`, 'general', value => ['general', 'commits'].includes(value))
  })
  const [commits, setCommits] = useState([])
  const [commitsLoading, setCommitsLoading] = useState(false)

  const handleRealtimeProject = useCallback((updatedProject) => {
    if (!updatedProject) return navigate('/dev')
    setProject(prev => prev ? { ...prev, ...updatedProject } : prev)
  }, [navigate])

  useRealtimeProject(projectId, handleRealtimeProject)

  useEffect(() => {
    writeStoredValue(`dev-project-tab-${projectId}`, tab)
  }, [tab, projectId])

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return

      const { data: projectData } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', projectId)
        .single()

      if (projectData) {
        setProject(projectData)
        if (projectData.repository_url) {
          setCommitsLoading(true)
          const c = await fetchGitHubCommits(projectData.repository_url)
          setCommits(c)
          setCommitsLoading(false)
        }
      }
      setLoading(false)
    }
    load()
  }, [projectId, user])

  if (loading) return (
    <div className="p-6">
      <div className="h-96 bg-dark-800 rounded-xl animate-pulse" />
    </div>
  )
  if (!project) return (
    <div className="p-6">
      <button onClick={() => navigate('/dev')} className="cursor-pointer text-purple-400 hover:text-purple-300 text-sm mb-4 inline-flex items-center gap-1">
        <span className="material-symbols-rounded text-sm">arrow_back</span> Volver
      </button>
      <p className="text-dark-400">Proyecto no encontrado</p>
    </div>
  )

  const tabs = [
    { id: 'general', label: 'General', icon: 'dashboard' },
    { id: 'commits', label: 'Commits', icon: 'code' },
  ]

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="border-b border-dark-800 bg-dark-900/80 backdrop-blur-sm shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => navigate('/dev')} className="cursor-pointer p-2 text-dark-400 hover:text-white transition-colors shrink-0">
                <span className="material-symbols-rounded">arrow_back</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium text-white ${statusColors[project.status]}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                  <span className="text-sm text-dark-400">{project.clients?.name || ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-800 bg-dark-900/50 shrink-0">
        <div className="px-6">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`cursor-pointer flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  tab === t.id
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-dark-400 hover:text-white hover:border-dark-600'
                }`}
              >
                <span className="material-symbols-rounded text-lg">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        {/* General tab */}
        {tab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.repository_url && (
                <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-dark-400 mb-2 flex items-center gap-2">
                    <span className="material-symbols-rounded text-purple-400">code</span>
                    Repositorio
                  </h3>
                  <a
                    href={project.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors break-all"
                  >
                    {project.repository_url}
                  </a>
                </div>
              )}
              <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-dark-400 mb-2">Fecha límite</h3>
                <p className="text-white text-sm">
                  {project.due_date ? new Date(project.due_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin definir'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Commits tab */}
        {tab === 'commits' && (
          <div>
            {!project.repository_url ? (
              <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
                <span className="material-symbols-rounded text-dark-600 text-5xl mb-3 block">code</span>
                <p className="text-dark-400 text-sm">Sin repositorio configurado</p>
                <p className="text-dark-600 text-xs mt-1">El admin debe agregar la URL del repositorio</p>
              </div>
            ) : commitsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-dark-800 rounded-lg animate-pulse" />)}
              </div>
            ) : commits.length === 0 ? (
              <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
                <span className="material-symbols-rounded text-dark-600 text-5xl mb-3 block">commit</span>
                <p className="text-dark-400 text-sm">No hay commits aún</p>
                <p className="text-dark-600 text-xs mt-1">O el repositorio es privado y necesita un token</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commits.map(commit => (
                  <div key={commit.sha} className="flex items-start gap-3 p-4 bg-dark-900/50 border border-dark-800 rounded-lg hover:border-dark-700 transition-all">
                    <div className="w-8 h-8 rounded-full border border-dark-700 bg-dark-800 overflow-hidden flex items-center justify-center shrink-0">
                      {commit.author?.avatar_url ? (
                        <img src={commit.author.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="material-symbols-rounded text-purple-400 text-sm">terminal</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {commit.commit?.message || 'Sin mensaje'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                        <span>{getCommitAuthorName(commit)}</span>
                        <span>{formatCommitTime(commit.commit?.author?.date)}</span>
                      </div>
                    </div>
                    <a
                      href={commit.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-xs text-purple-400 hover:text-purple-300 font-mono shrink-0"
                    >
                      {commit.sha?.slice(0, 7)}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
