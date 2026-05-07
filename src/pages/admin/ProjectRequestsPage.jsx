import { useState, useEffect } from 'react'
import { createClient } from '../../api/clientsApi'
import { getAllProjects, updateProject } from '../../api/projectsApi'
import { formatDate, formatMoney } from '../../utils/format'
import { PROJECT_STATUS, getProjectStatusTone } from '../../domain/projects'

export function ProjectRequestsPage() {
  const [requests, setRequests] = useState([])
  const [activeProjects, setActiveProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    budget: '',
    startDate: '',
    dueDate: '',
    notes: '',
    clientName: '',
    projectType: ''
  })
  const [updating, setUpdating] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllProjects()
        setRequests(data.filter(p => p.status === PROJECT_STATUS.REQUESTED))
        setActiveProjects(data.filter(p => p.status !== PROJECT_STATUS.REQUESTED))
      } catch {
        setRequests([])
        setActiveProjects([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAccept = async () => {
    if (!selectedRequest) return
    setUpdating(true)
    try {
      let clientId = selectedRequest.client_id
      if (reviewForm.clientName && !clientId) {
        const { data } = await createClient({
          name: reviewForm.clientName,
          status: 'preparando'
        })
        if (data) clientId = data.id
      }

      await updateProject(selectedRequest.id, {
        status: reviewForm.projectType || 'preparando',
        budget: selectedRequest.budget,
        final_price: reviewForm.budget ? Number(reviewForm.budget) : selectedRequest.final_price,
        start_date: reviewForm.startDate || null,
        due_date: reviewForm.dueDate || null,
        notes: reviewForm.notes || selectedRequest.notes,
        client_id: clientId,
      })

      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
      const updated = await getAllProjects()
      setActiveProjects(updated.filter(p => p.status !== PROJECT_STATUS.REQUESTED))
      setShowModal(false)
      setSelectedRequest(null)
      setReviewForm({ budget: '', startDate: '', dueDate: '', notes: '', clientName: '', projectType: '' })
    } catch {
      console.error('Error accepting request')
    } finally {
      setUpdating(false)
    }
  }

  const handleReject = async (request) => {
    if (!confirm('¿Rechazar esta solicitud?')) return
    try {
      await updateProject(request.id, { status: 'cancelado' })
      setRequests(prev => prev.filter(r => r.id !== request.id))
    } catch {
      console.error('Error rejecting request')
    }
  }

  const openReview = (request) => {
    setSelectedRequest(request)
    setReviewForm({
      budget: request.final_price || request.budget || '',
      startDate: request.start_date || '',
      dueDate: request.due_date || '',
      notes: request.notes || '',
      clientName: '',
        projectType: PROJECT_STATUS.PREPARING
    })
    setShowModal(true)
  }

  const displayProjects = filter === 'requests' ? requests : filter === PROJECT_STATUS.PREPARING ? activeProjects : [...requests, ...activeProjects]

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-dark-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proyectos y Solicitudes</h1>
          <p className="text-dark-400 text-sm mt-1">{requests.length} solicitudes pendientes · {activeProjects.length} proyectos activos</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'requests', label: `Solicitudes (${requests.length})` },
          { key: PROJECT_STATUS.PREPARING, label: `En curso (${activeProjects.length})` }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-fizzia-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {displayProjects.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-dark-400 text-sm">No hay proyectos que mostrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayProjects.map(project => (
            <div
              key={project.id}
              className={`bg-dark-900/50 border rounded-xl p-5 transition-all ${
                project.status === PROJECT_STATUS.REQUESTED
                  ? 'border-fizzia-500/30 hover:border-fizzia-500/50'
                  : 'border-dark-800 hover:border-dark-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-semibold text-lg">{project.name}</h3>
                    {project.status === PROJECT_STATUS.REQUESTED && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-fizzia-500/20 text-fizzia-400 font-medium">
                        Solicitud
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-dark-400">
                    {project.clients?.name && <span>{project.clients.name}</span>}
                    {(project.final_price || project.budget) && <span>· {formatMoney(project.final_price || project.budget)}</span>}
                    <span>· {formatDate(project.created_at)}</span>
                  </div>
                  {project.description && (
                    <p className="text-dark-300 text-sm mt-2 line-clamp-2">{project.description}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {project.status === PROJECT_STATUS.REQUESTED ? (
                    <>
                      <button
                        onClick={() => handleReject(project)}
                        className="cursor-pointer px-3 py-2 bg-dark-800 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-all"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => openReview(project)}
                        className="cursor-pointer px-4 py-2 bg-fizzia-500 text-white rounded-lg text-sm font-medium hover:bg-fizzia-400 transition-all"
                      >
                        Revisar y aceptar
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${getProjectStatusTone(project.status)}`}>
                      {project.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Revisar solicitud</h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer text-dark-400 hover:text-white">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-dark-800/50 rounded-xl p-4 mb-6 border border-dark-700">
              <h4 className="text-white font-medium">{selectedRequest.name}</h4>
              {selectedRequest.description && (
                <p className="text-dark-300 text-sm mt-2 whitespace-pre-wrap">{selectedRequest.description}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Estado del proyecto</label>
                <select
                  value={reviewForm.projectType}
                  onChange={(e) => setReviewForm({ ...reviewForm, projectType: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 transition-all"
                >
                  <option value="preparando">Preparando</option>
                  <option value="trabajando">Trabajando</option>
                  <option value="pausado">Pausado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Nombre del cliente (para crear perfil)</label>
                <input
                  type="text"
                  value={reviewForm.clientName}
                  onChange={(e) => setReviewForm({ ...reviewForm, clientName: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 transition-all"
                  placeholder="Nombre de la empresa o persona"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-dark-300 mb-1.5">Presupuesto (USD)</label>
                  <input
                    type="number"
                    value={reviewForm.budget}
                    onChange={(e) => setReviewForm({ ...reviewForm, budget: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 transition-all"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1.5">Fecha de entrega</label>
                  <input
                    type="date"
                    value={reviewForm.dueDate}
                    onChange={(e) => setReviewForm({ ...reviewForm, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Fecha de inicio</label>
                <input
                  type="date"
                  value={reviewForm.startDate}
                  onChange={(e) => setReviewForm({ ...reviewForm, startDate: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Notas internas</label>
                <textarea
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 transition-all resize-none"
                  placeholder="Notas solo visibles para el equipo"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer flex-1 py-3 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={updating}
                  className="cursor-pointer flex-1 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 transition-all"
                >
                  {updating ? 'Guardando...' : 'Aceptar proyecto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
