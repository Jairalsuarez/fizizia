import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect } from 'react'

const phases = [
  { key: 'solicitado', label: 'Solicitado', color: 'bg-fizzia-500', icon: '📋' },
]

export function ProjectCreatedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const project = location.state?.project

  useEffect(() => {
    if (!project) {
      navigate('/cliente', { replace: true })
    }
  }, [project, navigate])

  if (!project) return null

  return (
    <div className="p-6 max-w-2xl mx-auto text-center">
      {/* Success animation */}
      <div className="mb-8 relative">
        <div className="w-24 h-24 mx-auto rounded-full bg-fizzia-500/20 flex items-center justify-center animate-pulse">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fizzia-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-32 h-32 bg-fizzia-500/10 rounded-full blur-3xl" />
      </div>

      <h1 className="text-3xl font-bold text-white mb-3">¡Proyecto creado!</h1>
      <p className="text-dark-300 text-lg mb-8 max-w-md mx-auto leading-relaxed">
        Gracias por crear un proyecto. El equipo de Fizzia se pondrá en contacto contigo a través de este medio.
      </p>

      {/* Project card */}
      <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-6 mb-8 text-left">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{project.name}</h2>
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-fizzia-500/20 text-fizzia-400 font-medium">
            {phases[0].icon} {phases[0].label}
          </span>
        </div>
        {project.description && (
          <p className="text-dark-400 text-sm line-clamp-3 mb-4 whitespace-pre-wrap">{project.description}</p>
        )}
        {project.budget && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-dark-500">Presupuesto:</span>
            <span className="text-white font-semibold">${Number(project.budget).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={`/cliente/proyecto/${project.id}`}
          className="cursor-pointer px-6 py-3.5 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all shadow-lg shadow-fizzia-500/25"
        >
          Ver mi proyecto
        </Link>
        <button
          onClick={() => navigate('/cliente')}
          className="cursor-pointer px-6 py-3.5 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all"
        >
          Volver al dashboard
        </button>
      </div>

      {/* Info */}
      <div className="mt-12 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
        <p className="text-yellow-400/80 text-sm leading-relaxed">
          Mientras tanto, puedes explorar tu proyecto, ver el estado y chatear con el equipo.
          Pronto te contactaremos para discutir los detalles.
        </p>
      </div>
    </div>
  )
}
