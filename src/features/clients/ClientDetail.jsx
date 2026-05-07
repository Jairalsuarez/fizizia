import { useState, useEffect, useCallback } from 'react'
import { Button, StatusBadge, Modal } from '../../components/ui/'
import { formatMoney } from '../../utils/format'
import { deleteClient, updateClient, getAllClientProjects } from '../../api/clientsApi'
import ProjectForm from './ProjectForm'
import { useToast } from '../../components/Toast'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../features/auth/authContext'

export default function ClientDetail({ client, onUpdate }) {
  const { session } = useAuth()
  const myId = session?.user?.id
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState(() => ({
    name: client.name || '',
    legal_name: client.legal_name || '',
    email: client.email || '',
    phone: client.phone || '',
    city: client.city || '',
    status: client.status || 'active',
    notes: client.notes || '',
  }))
  const [projects, setProjects] = useState([])
  const [developers, setDevelopers] = useState([])
  const [projectDevs, setProjectDevs] = useState({})
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const loadProjects = useCallback(async () => {
    const data = await getAllClientProjects(client.id)
    setProjects(data || [])
  }, [client.id])

  const loadDevelopers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, role')
    console.log('ALL PROFILES:', data, 'ERROR:', error)
    const devs = (data || []).filter(p => p?.role === 'developer')
    setDevelopers(devs)

    let assignments
    try {
      const { data: a } = await supabase
        .from('project_developers')
        .select('project_id, developer_id, profiles(id, full_name, email)')
      assignments = a
    } catch {
      assignments = []
    }
    if (assignments?.length) {
      const byProject = {}
      assignments.forEach(a => {
        if (!byProject[a.project_id]) byProject[a.project_id] = []
        byProject[a.project_id].push(a.profiles)
      })
      setProjectDevs(byProject)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadProjects()
    loadDevelopers()
    setEditData({
      name: client.name || '',
      legal_name: client.legal_name || '',
      email: client.email || '',
      phone: client.phone || '',
      city: client.city || '',
      status: client.status || 'active',
      notes: client.notes || '',
    })
  }, [client, loadProjects, loadDevelopers])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSaveEdit = async () => {
    if (!editData.name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    const { error } = await updateClient(client.id, editData)
    setSaving(false)
    if (error) {
      toast.error('Error al actualizar: ' + error.message)
      return
    }
    toast.success('Cliente actualizado')
    setShowEditModal(false)
    onUpdate()
  }

  const handleDelete = async () => {
    const { error } = await deleteClient(client.id)
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
      return
    }
    setShowDeleteModal(false)
    onUpdate()
    toast.success('Cliente eliminado')
  }

  const assignDeveloper = async (projectId, devId) => {
    const targetId = devId === 'me' ? myId : devId
    await supabase.from('project_developers').delete().eq('project_id', projectId)
    const { data, error: err } = await supabase
      .from('project_developers')
      .insert({ project_id: projectId, developer_id: targetId })
      .select('profiles(full_name, email)')
      .single()
    if (data && !err) {
      setProjectDevs(prev => ({ ...prev, [projectId]: [data.profiles] }))
      toast.success(devId === 'me' ? 'Te asignaste al proyecto' : 'Developer asignado')
    } else {
      toast.error('Error al asignar')
    }
  }

  return (
    <div className="rounded-lg border border-dark-700 bg-dark-900 p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{client.name}</h2>
          <p className="text-dark-400 text-sm">{client.email}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowProjectForm(true)} size="sm">Nuevo Proyecto</Button>
          <button
            onClick={() => setShowEditModal(true)}
            className="cursor-pointer px-3 py-1.5 rounded border border-dark-600 text-dark-300 text-sm hover:text-white hover:border-dark-500 transition-all flex items-center gap-1"
          >
            <span className="material-symbols-rounded text-sm">edit</span>
            Editar
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 rounded border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-all"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-dark-400">Nombre Legal</p>
          <p className="text-white">{client.legal_name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Teléfono</p>
          <p className="text-white">{client.phone || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Ciudad</p>
          <p className="text-white">{client.city || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Estado</p>
          <StatusBadge status={client.status} />
        </div>
      </div>

      {client.notes && (
        <div className="mb-6">
          <p className="text-sm text-dark-400 mb-1">Notas</p>
          <p className="text-white text-sm">{client.notes}</p>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-white font-semibold mb-3">Proyectos ({projects.length})</h3>
        {projects.length > 0 ? (
          <div className="space-y-2">
            {projects.map((project) => {
              const devs = projectDevs[project.id] || []
              const assignedDev = devs[0]
              const assignedId = assignedDev?.id
              const allOptions = [
                { id: 'me', label: 'Tu', icon: 'person' },
                ...developers.map(d => ({ id: d.id, label: d.full_name || d.email, icon: 'code' })),
              ]
              return (
                <div key={project.id} className="p-3 rounded bg-dark-800">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{project.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={project.status} size="sm" />
                        <span className="text-sm text-dark-400">{formatMoney(project.final_price || project.budget || 0)}{project.final_price && project.budget ? ' (presupuesto: ' + formatMoney(project.budget) + ')' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider font-medium mb-2">Developer asignado</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allOptions.map(opt => {
                        const isActive = (opt.id === 'me' && assignedId === myId) || opt.id === assignedId
                        return (
                          <button
                            key={opt.id}
                            onClick={() => assignDeveloper(project.id, opt.id)}
                            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              isActive
                                ? 'bg-fizzia-500/20 border-fizzia-500/40 text-fizzia-300'
                                : 'bg-dark-950 border-dark-700 text-dark-400 hover:text-white hover:border-dark-500'
                            }`}
                          >
                            <span className="material-symbols-rounded text-sm">{opt.icon}</span>
                            {opt.label}
                            {isActive && <span className="material-symbols-rounded text-xs text-fizzia-400">check</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-dark-500 text-sm">No hay proyectos</p>
        )}
      </div>

      <Modal open={showProjectForm} onClose={() => setShowProjectForm(false)}>
        <ProjectForm clientId={client.id} onSaved={() => { setShowProjectForm(false); onUpdate() }} />
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar cliente">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-400 mb-1 block">Nombre</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
            />
          </div>
          <div>
            <label className="text-sm text-dark-400 mb-1 block">Nombre Legal</label>
            <input
              type="text"
              value={editData.legal_name}
              onChange={(e) => setEditData(prev => ({ ...prev, legal_name: e.target.value }))}
              className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Email</label>
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
              />
            </div>
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Teléfono</label>
              <input
                type="text"
                value={editData.phone}
                onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Ciudad</label>
              <input
                type="text"
                value={editData.city}
                onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
              />
            </div>
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Estado</label>
              <select
                value={editData.status}
                onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-dark-400 mb-1 block">Notas</label>
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowEditModal(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
            <button onClick={handleSaveEdit} disabled={saving} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Eliminar Cliente</h3>
          <p className="text-dark-300 mb-4">¿Eliminar cliente "{client.name}"?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
