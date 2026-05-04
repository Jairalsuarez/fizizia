import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMyProjectMilestones, getProjectFiles, uploadProjectFile } from '../../services/clientData'
import { formatDate, formatMoney } from '../../utils/format'
import { useToast } from '../../components/Toast'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../features/auth/authContext'

const phases = [
  { key: 'discovery', label: 'Descubrimiento', color: 'bg-fizzia-500', textColor: 'text-fizzia-400', icon: '🔍' },
  { key: 'active', label: 'En desarrollo', color: 'bg-blue-500', textColor: 'text-blue-400', icon: '⚡' },
  { key: 'doing', label: 'En progreso', color: 'bg-blue-500', textColor: 'text-blue-400', icon: '🚀' },
  { key: 'paused', label: 'Pausado', color: 'bg-yellow-500', textColor: 'text-yellow-400', icon: '⏸️' },
  { key: 'delivered', label: 'Entregado', color: 'bg-green-500', textColor: 'text-green-400', icon: '✅' },
  { key: 'cancelled', label: 'Cancelado', color: 'bg-red-500', textColor: 'text-red-400', icon: '❌' },
]

const phaseOrder = ['discovery', 'design', 'active', 'doing', 'review', 'delivered']

function getPhaseIndex(status) {
  return phaseOrder.indexOf(status)
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { session } = useAuth()
  const [project, setProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState({ name: '', description: '', budget: '', repo_url: '', live_url: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileNote, setFileNote] = useState('')
  const fileInputRef = useRef(null)

  const canEdit = project?.status === 'discovery'

  useEffect(() => {
    const loadData = async () => {
      try {
        const { getMyProjects } = await import('../../services/clientData')
        const projects = await getMyProjects()
        const found = projects?.find(p => p.id === projectId)
        if (!found) {
          navigate('/cliente')
          return
        }
        setProject(found)
        setEditData({
          name: found.name || '',
          description: found.description || '',
          budget: found.budget ? String(found.budget) : '',
          repo_url: found.repo_url || '',
          live_url: found.live_url || '',
          notes: found.notes || '',
        })

        const [milestonesRes, filesRes] = await Promise.all([
          getMyProjectMilestones(projectId),
          getProjectFiles(projectId),
        ])
        setMilestones(milestonesRes || [])
        setFiles(filesRes || [])
      } catch (err) {
        console.error('Error loading project:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId, navigate])

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!canEdit || savingEdit) return
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editData.name.trim(),
          description: editData.description.trim(),
          budget: editData.budget ? Number(editData.budget) : 0,
          repo_url: editData.repo_url.trim() || null,
          live_url: editData.live_url.trim() || null,
          notes: editData.notes.trim() || null,
        })
        .eq('id', projectId)

      if (error) throw error

      setProject(prev => ({
        ...prev,
        name: editData.name.trim(),
        description: editData.description.trim(),
        budget: editData.budget ? Number(editData.budget) : 0,
        repo_url: editData.repo_url.trim() || null,
        live_url: editData.live_url.trim() || null,
        notes: editData.notes.trim() || null,
      }))
      setShowEdit(false)
      toast.success('Proyecto actualizado')
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!canEdit || deleting) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      toast.success('Proyecto eliminado')
      navigate('/cliente')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const phase = phases.find(p => p.key === project?.status) || phases[0]
  const progress = milestones.length > 0
    ? Math.round((milestones.filter(m => m.status === 'done').length / milestones.length) * 100)
    : 0

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length) return
    setUploading(true)
    for (const file of selectedFiles) {
      const result = await uploadProjectFile(projectId, file, null, fileNote)
      if (result.error) {
        toast.error(`Error al subir ${file.name}`)
      } else {
        setFiles(prev => [result.data, ...prev])
      }
    }
    setUploading(false)
    setFileNote('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.success(selectedFiles.length > 1 ? `${selectedFiles.length} archivos subidos` : 'Archivo subido')
  }

  const getFileIcon = (file) => {
    if (file.file_type?.includes('image')) return 'image'
    if (file.file_type?.includes('pdf')) return 'picture_as_pdf'
    if (file.file_type?.includes('zip') || file.file_type?.includes('rar')) return 'folder_zip'
    if (file.file_type?.includes('video')) return 'video_file'
    if (file.file_type?.includes('figma') || file.file_type?.includes('design')) return 'design_services'
    return 'attach_file'
  }

  const getFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-dark-800 rounded animate-pulse" />
        <div className="h-64 bg-dark-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/cliente')} className="cursor-pointer text-dark-400 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className={`text-sm font-medium ${phase.textColor}`}>{phase.icon} {phase.label}</span>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-dark-800 text-dark-300 rounded-lg hover:text-white hover:bg-dark-700 transition-all text-sm"
            >
              <span className="material-symbols-rounded text-base">edit</span>
              Editar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm"
            >
              <span className="material-symbols-rounded text-base">delete</span>
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Editar proyecto</h3>
              <button onClick={() => setShowEdit(false)} className="cursor-pointer text-dark-400 hover:text-white">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Descripción</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 resize-none transition-all"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Presupuesto (USD)</label>
                <input
                  type="number"
                  value={editData.budget}
                  onChange={(e) => setEditData({ ...editData, budget: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Repositorio (GitHub, GitLab, etc.)</label>
                <input
                  type="url"
                  value={editData.repo_url}
                  onChange={(e) => setEditData({ ...editData, repo_url: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 transition-all"
                  placeholder="https://github.com/usuario/proyecto"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">URL en vivo / Demo</label>
                <input
                  type="url"
                  value={editData.live_url}
                  onChange={(e) => setEditData({ ...editData, live_url: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 transition-all"
                  placeholder="https://mi-proyecto.com"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Notas adicionales</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 resize-none transition-all"
                  rows={3}
                  placeholder="Instrucciones, accesos, comentarios..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="cursor-pointer flex-1 py-3 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={savingEdit} className="cursor-pointer flex-1 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 transition-all">
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="material-symbols-rounded text-red-400 text-3xl">delete</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar proyecto?</h3>
            <p className="text-dark-400 text-sm mb-6">Esta acción no se puede deshacer</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="cursor-pointer flex-1 py-3 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="cursor-pointer flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-400 disabled:opacity-50 transition-all">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase progress */}
      <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-dark-400">Progreso general</span>
          <span className="text-sm text-white font-semibold">{progress}%</span>
        </div>
        <div className="w-full bg-dark-800 rounded-full h-2">
          <div className="bg-fizzia-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-1.5 mt-4">
          {phaseOrder.map((pKey) => {
            const p = phases.find(ph => ph.key === pKey)
            const currentIdx = getPhaseIndex(project.status)
            const idx = getPhaseIndex(pKey)
            if (idx === -1) return null
            return (
              <div key={pKey} className="flex-1 text-center">
                <div className={`h-1.5 rounded-full ${idx <= currentIdx ? 'bg-fizzia-500' : 'bg-dark-700'}`} />
                {p && <span className="text-xs text-dark-500 mt-1 block">{p.label.split(' ')[0]}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900/50 border border-dark-800 rounded-xl p-1">
        {[
          { key: 'info', label: 'Detalles' },
          { key: 'milestones', label: 'Fases' },
          { key: 'files', label: 'Archivos' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium cursor-pointer transition-all ${
              activeTab === tab.key
                ? 'bg-fizzia-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6 space-y-4">
          {project.description && (
            <div>
              <h3 className="text-sm font-semibold text-dark-400 mb-2">Descripción</h3>
              <p className="text-white text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {project.budget && (
              <div>
                <p className="text-xs text-dark-500 mb-1">Presupuesto</p>
                <p className="text-white font-semibold">{formatMoney(project.budget)}</p>
              </div>
            )}
            {project.start_date && (
              <div>
                <p className="text-xs text-dark-500 mb-1">Inicio</p>
                <p className="text-white font-semibold">{formatDate(project.start_date)}</p>
              </div>
            )}
            {project.due_date && (
              <div>
                <p className="text-xs text-dark-500 mb-1">Entrega</p>
                <p className="text-white font-semibold">{formatDate(project.due_date)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-dark-500 mb-1">Creado</p>
              <p className="text-white font-semibold">{formatDate(project.created_at)}</p>
            </div>
          </div>
          {(project.repo_url || project.live_url || project.notes) && (
            <div className="pt-4 border-t border-dark-700 space-y-4">
              {project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-all group"
                >
                  <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-rounded text-fizzia-400">code</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">Repositorio</p>
                    <p className="text-dark-400 text-xs truncate">{project.repo_url}</p>
                  </div>
                  <span className="material-symbols-rounded text-dark-500 group-hover:text-white transition-colors">open_in_new</span>
                </a>
              )}
              {project.live_url && (
                <a
                  href={project.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-all group"
                >
                  <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-rounded text-green-400">language</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">Sitio en vivo</p>
                    <p className="text-dark-400 text-xs truncate">{project.live_url}</p>
                  </div>
                  <span className="material-symbols-rounded text-dark-500 group-hover:text-white transition-colors">open_in_new</span>
                </a>
              )}
              {project.notes && (
                <div className="p-3 bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-rounded text-yellow-400 text-lg">sticky_note_2</span>
                    <p className="text-white text-sm font-medium">Notas</p>
                  </div>
                  <p className="text-dark-300 text-sm whitespace-pre-wrap">{project.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-3">
          {milestones.length === 0 ? (
            <div className="text-center py-12 bg-dark-900/50 border border-dark-800 rounded-xl">
              <p className="text-dark-400 text-sm">Las fases del proyecto se definirán pronto</p>
            </div>
          ) : (
            milestones.map((milestone, i) => (
              <div key={milestone.id} className="flex items-start gap-4 bg-dark-900/50 border border-dark-800 rounded-xl p-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  milestone.status === 'done' ? 'bg-fizzia-500' :
                  milestone.status === 'in_progress' ? 'bg-blue-500' : 'bg-dark-700'
                }`}>
                  {milestone.status === 'done' ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{milestone.title}</h4>
                  {milestone.description && <p className="text-dark-400 text-sm mt-1">{milestone.description}</p>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  milestone.status === 'done' ? 'bg-fizzia-500/20 text-fizzia-400' :
                  milestone.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-dark-700 text-dark-400'
                }`}>
                  {milestone.status === 'done' ? 'Completado' : milestone.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Subir archivos</h3>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.zip,.rar,.psd,.ai,.fig,.sketch,.mp4,.mov,.svg"
            />
            <textarea
              value={fileNote}
              onChange={(e) => setFileNote(e.target.value)}
              className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white text-sm placeholder-dark-500 focus:outline-none focus:border-fizzia-500 resize-none transition-all mb-3"
              rows={2}
              placeholder="Nota opcional (ej: logo en alta resolución, referencias...)"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="cursor-pointer w-full py-3 bg-fizzia-500/10 border border-fizzia-500/30 text-fizzia-400 font-medium rounded-xl hover:bg-fizzia-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Subiendo...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-lg">cloud_upload</span>
                  Seleccionar archivos
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-semibold px-1">Archivos del proyecto</h3>
            {files.length === 0 ? (
              <div className="text-center py-12 bg-dark-900/50 border border-dark-800 rounded-xl">
                <div className="text-3xl mb-3">📁</div>
                <p className="text-dark-400 text-sm">Los archivos del proyecto aparecerán aquí</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {files.map(file => (
                  <div
                    key={file.id}
                    className="group flex items-start gap-3 bg-dark-900/50 border border-dark-800 rounded-xl p-4 hover:border-dark-700 transition-all"
                  >
                    <div className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-rounded text-fizzia-400">{getFileIcon(file)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{file.file_name}</p>
                      <p className="text-dark-500 text-xs">{formatDate(file.created_at)} · {getFileSize(file.file_size)}</p>
                      {file.note && <p className="text-dark-400 text-xs mt-1">{file.note}</p>}
                      <p className="text-dark-500 text-xs mt-0.5">
                        {file.uploader_id === session?.user?.id ? 'Tú' : 'Equipo Fizzia'}
                      </p>
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-800 transition-all"
                    >
                      <span className="material-symbols-rounded text-lg">download</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
