import { useState, useEffect } from 'react'
import { StatusBadge, EmptyState, Skeleton } from '../../components/ui/'
import { formatMoney, formatDate } from '../../utils/format'
import { getAllProjects } from '../../services/adminData'

export function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      try {
        const data = await getAllProjects()
        setProjects(data || [])
      } catch (err) {
        console.error('Error loading projects:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

  const filtered = statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter)

  const summary = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    delivered: projects.filter(p => p.status === 'delivered').length,
    budget: projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Proyectos</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Proyectos', value: summary.total },
          { label: 'Activos', value: summary.active },
          { label: 'Entregados', value: summary.delivered },
          { label: 'Presupuesto Total', value: formatMoney(summary.budget), isMoney: false }
        ].map((item, i) => (
          <div key={i} className="rounded-lg border border-dark-700 bg-dark-900 p-4">
            <p className="text-sm text-dark-400">{item.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'active', 'paused', 'delivered', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-fizzia-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:text-white'
            }`}
          >
            {status === 'all' ? 'Todos' : status}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-dark-700 bg-dark-900 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}
          </div>
        ) : filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left p-3 text-sm text-dark-400 font-medium">Proyecto</th>
                <th className="text-left p-3 text-sm text-dark-400 font-medium">Cliente</th>
                <th className="text-left p-3 text-sm text-dark-400 font-medium">Estado</th>
                <th className="text-right p-3 text-sm text-dark-400 font-medium">Presupuesto</th>
                <th className="text-right p-3 text-sm text-dark-400 font-medium">Fecha Entrega</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-dark-800 hover:bg-dark-800 cursor-pointer transition-colors"
                >
                  <td className="p-3 text-white font-medium">{project.name}</td>
                  <td className="p-3 text-dark-300">{project.client_name}</td>
                  <td className="p-3"><StatusBadge status={project.status} /></td>
                  <td className="p-3 text-right text-white">{formatMoney(project.budget || 0)}</td>
                  <td className="p-3 text-right text-dark-300">{project.due_date ? formatDate(project.due_date) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8">
            <EmptyState message="No hay proyectos" />
          </div>
        )}
      </div>
    </div>
  )
}
