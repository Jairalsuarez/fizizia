import { Link } from 'react-router-dom'
import { formatDate } from '../utils/format'

const phases = [
  { key: 'solicitado', label: 'Solicitado', color: 'bg-fizzia-500', icon: '📋' },
  { key: 'preparando', label: 'Preparando', color: 'bg-purple-500', icon: '🔧' },
  { key: 'trabajando', label: 'Trabajando', color: 'bg-blue-500', icon: '⚡' },
  { key: 'pausado', label: 'Pausado', color: 'bg-yellow-500', icon: '⏸️' },
  { key: 'entregado', label: 'Entregado', color: 'bg-green-500', icon: '✅' },
  { key: 'cancelado', label: 'Cancelado', color: 'bg-red-500', icon: '❌' },
]

function getPhase(status) {
  return phases.find(p => p.key === status) || phases[0]
}

export function ProjectCard({ project, clientName, to, showClient = false, showDescription = false, showBudget = true, showDate = true }) {
  const phase = getPhase(project.status)

  return (
    <Link
      to={to}
      className="cursor-pointer bg-dark-900/50 border border-dark-800 rounded-xl p-5 hover:border-fizzia-500/50 hover:bg-dark-900 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{phase.icon}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium text-white ${phase.color}`}>
          {phase.label}
        </span>
      </div>
      <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-fizzia-400 transition-colors">
        {project.name}
      </h3>
      {showClient && clientName && (
        <p className="text-dark-400 text-sm mb-1">{clientName}</p>
      )}
      {showDescription && project.description && (
        <p className="text-dark-400 text-sm line-clamp-2 mb-3">
          {project.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-dark-500">
        {showBudget && (project.final_price || project.budget) && <span>${Number(project.final_price || project.budget).toLocaleString()}</span>}
        {showClient && clientName && (project.final_price || project.budget) && <span>•</span>}
        {showDate && project.due_date && <span>Entrega: {formatDate(project.due_date)}</span>}
        {showDate && project.created_at && !project.due_date && <span>{formatDate(project.created_at)}</span>}
      </div>
    </Link>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5 space-y-3">
      <div className="flex justify-between">
        <div className="h-8 w-8 bg-dark-800 rounded-full animate-pulse" />
        <div className="h-6 w-24 bg-dark-800 rounded-full animate-pulse" />
      </div>
      <div className="h-5 w-3/4 bg-dark-800 rounded animate-pulse" />
      <div className="h-4 w-full bg-dark-800 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-dark-800 rounded animate-pulse" />
      <div className="h-3 w-1/3 bg-dark-800 rounded animate-pulse" />
    </div>
  )
}

export function EmptyProjects({ message, actionLabel, actionTo }) {
  return (
    <div className="text-center py-20 bg-dark-900/50 border border-dark-800 rounded-2xl col-span-full">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-fizzia-500/20 flex items-center justify-center">
        <span className="material-symbols-rounded text-4xl text-fizzia-400">rocket_launch</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{message || 'No hay proyectos'}</h3>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all shadow-lg shadow-fizzia-500/25 mt-4"
        >
          <span className="material-symbols-rounded text-lg">add_circle</span>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
