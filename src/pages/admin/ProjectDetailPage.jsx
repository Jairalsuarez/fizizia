import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { updateProject, getAllProjectFiles, uploadProjectFileAdmin, deleteProjectFile, getProjectInvoicesWithPayments, getProjectPayments, getProjectMilestones, createMilestone, updateMilestone, deleteMilestone } from '../../services/adminData'
import { getProjectMessages, sendProjectMessage, subscribeToMessages } from '../../services/clientData'
import { sendAdminMessage, subscribeToAdminMessages } from '../../services/adminData'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/ui/Modal'
import { supabase } from '../../services/supabase'
import { formatDate, formatMoney } from '../../utils/format'

const statusLabels = {
  solicitado: 'Solicitado',
  preparando: 'Preparando',
  trabajando: 'Trabajando',
  pausado: 'Pausado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const statusColors = {
  solicitado: 'bg-fizzia-500',
  preparando: 'bg-purple-500',
  trabajando: 'bg-blue-500',
  pausado: 'bg-yellow-500',
  entregado: 'bg-green-500',
  cancelado: 'bg-red-500',
}

const statusOptions = ['preparando', 'trabajando', 'pausado', 'entregado']

const statusOptions = ['active', 'doing', 'paused', 'review', 'delivered']

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('general')
  const [saving, setSaving] = useState(false)

  // General tab state
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [repoUrl, setRepoUrl] = useState('')

  // Messages
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [myId, setMyId] = useState(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  // Files
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [fileNote, setFileNote] = useState('')
  const fileInputRef = useRef(null)

  // Invoices
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [milestones, setMilestones] = useState([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', status: 'todo' })

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '', invoice_number: '', subtotal: 0, discount: 0, tax: 0, total: 0,
    issued_at: new Date().toISOString().split('T')[0], due_at: '', notes: '',
  })

  // Action modals
  const [actionModal, setActionModal] = useState(null)
  const [cancelPassword, setCancelPassword] = useState('')
  const [cancelAgreed, setCancelAgreed] = useState(false)
  const [acting, setActing] = useState(false)
  const [statusChangeModal, setStatusChangeModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState('')

  useEffect(() => {
    const loadProject = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        setMyId(userData?.user?.id)

        const { data } = await supabase
          .from('projects')
          .select('*, clients(*)')
          .eq('id', projectId)
          .single()
        if (data) {
          setProject(data)
          setStartDate(data.start_date ? data.start_date.split('T')[0] : '')
          setDueDate(data.due_date ? data.due_date.split('T')[0] : '')
          setRepoUrl(data.repository_url || '')

          const [msgs, f, inv, pay, miles] = await Promise.all([
            getProjectMessages(data.id),
            getAllProjectFiles(data.id),
            getProjectInvoicesWithPayments(data.id),
            getProjectPayments(data.id),
            getProjectMilestones(data.id),
          ])
          setMessages(msgs)
          setFiles(f)
          setInvoices(inv)
          setPayments(pay)
          setMilestones(miles)
          setInvoiceForm(prev => ({ ...prev, client_id: data.client_id, invoice_number: `FACT-${Date.now()}` }))
        }
      } catch (err) {
        console.error('Error loading project:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProject()
  }, [projectId])

  useEffect(() => {
    if (project && tab === 'mensajes') {
      channelRef.current = subscribeToAdminMessages(project.id, (payload) => {
        setMessages(prev => [...prev, payload])
      })
    }
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [project, tab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveDates = async () => {
    setSaving(true)
    await updateProject(project.id, {
      start_date: startDate || null,
      due_date: dueDate || null,
      repository_url: repoUrl || null,
    })
    setSaving(false)
    toast.success('Datos guardados')
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !project) return
    const content = newMessage.trim()
    setNewMessage('')
    try {
      await sendAdminMessage(project.id, content)
    } catch {
      toast.error('Error enviando mensaje')
    }
  }

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length || !project) return
    setUploading(true)
    for (const file of selectedFiles) {
      const result = await uploadProjectFileAdmin(project.id, file, fileNote)
      if (result.error) {
        toast.error(`Error al subir ${file.name}`)
      } else {
        setFiles(prev => [result.data, ...prev])
      }
    }
    setUploading(false)
    setFileNote('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.success(`${selectedFiles.length > 1 ? `${selectedFiles.length} archivos subidos` : 'Archivo subido'}`)
  }

  const handleDeleteFile = async (fileId, storagePath) => {
    await deleteProjectFile(fileId, storagePath)
    setFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('Archivo eliminado')
  }

  const getFileIcon = (file) => {
    if (file?.file_type?.includes('image')) return 'image'
    if (file?.file_type?.includes('pdf')) return 'picture_as_pdf'
    if (file?.file_type?.includes('zip') || file?.file_type?.includes('rar')) return 'folder_zip'
    return 'attach_file'
  }

  const getFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleStatusChange = (newStatus) => {
    setPendingStatus(newStatus)
    setStatusChangeModal(true)
  }

  const confirmStatusChange = async () => {
    setActing(true)
    await updateProject(project.id, { status: pendingStatus })
    toast.success(`Estado cambiado a "${statusLabels[pendingStatus]}"`)
    setProject(prev => ({ ...prev, status: pendingStatus }))
    setStatusChangeModal(false)
    setActing(false)
  }

  const handleConfirmAction = async () => {
    if (actionModal === 'cancel') {
      if (!cancelPassword.trim()) { toast.error('Ingresa tu contraseña'); return }
      if (!cancelAgreed) { toast.error('Debes marcar la confirmación'); return }
      const { error } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email,
        password: cancelPassword,
      })
      if (error) { toast.error('Contraseña incorrecta'); return }
    }
    setActing(true)
    const newStatus = actionModal === 'accept' ? 'active' : 'cancelled'
    await updateProject(project.id, { status: newStatus })
    toast.success(actionModal === 'accept' ? 'Proyecto aceptado' : 'Proyecto rechazado')
    setProject(prev => ({ ...prev, status: newStatus }))
    setActionModal(null)
    setCancelPassword('')
    setCancelAgreed(false)
    setActing(false)
  }

  const handleCreateInvoice = async () => {
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({ ...invoiceForm, project_id: project.id, currency: project.currency || 'USD' })
      .select()
      .single()
    if (invoice) {
      setInvoices(prev => [invoice, ...prev])
      toast.success('Factura creada')
      setShowInvoiceForm(false)
    }
  }

  const handleCreateMilestone = async () => {
    const result = await createMilestone({ project_id: project.id, ...newMilestone })
    if (result.data) {
      setMilestones(prev => [...prev, result.data])
      toast.success('Hito creado')
      setShowMilestoneForm(false)
      setNewMilestone({ title: '', description: '', status: 'todo' })
    }
  }

  const updateMilestoneStatus = async (id, status) => {
    await updateMilestone(id, { status })
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status } : m))
  }

  const deleteMilestoneItem = async (id) => {
    await deleteMilestone(id)
    setMilestones(prev => prev.filter(m => m.id !== id))
    toast.success('Hito eliminado')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-96 bg-dark-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-dark-400">Proyecto no encontrado</p>
      </div>
    )
  }

  const tabs = [
    { id: 'general', label: 'General', icon: 'description' },
    { id: 'mensajes', label: 'Mensajes', icon: 'chat' },
    { id: 'archivos', label: 'Archivos', icon: 'folder' },
    { id: 'pagos', label: 'Facturas y Pagos', icon: 'payments' },
    { id: 'hitos', label: 'Hitos', icon: 'flag' },
  ]

  const isDiscovery = project.status === 'discovery'
  const isClosed = ['delivered', 'cancelled'].includes(project.status)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-dark-900/50 border-b border-dark-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium text-white ${statusColors[project.status]}`}>
                {statusLabels[project.status] || project.status}
              </span>
            </div>
            <p className="text-dark-400 text-sm">{project.clients?.name || 'Sin cliente'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin')}
              className="cursor-pointer px-3 py-2 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white hover:border-dark-600 transition-all"
            >
              <span className="material-symbols-rounded text-lg">arrow_back</span>
            </button>
            {!isDiscovery && !isClosed && (
              <button
                onClick={() => setActionModal('cancel')}
                className="cursor-pointer px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium rounded-lg hover:bg-amber-500/30 transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 rounded-lg p-0.5 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t.id ? 'bg-fizzia-500 text-white' : 'text-dark-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-rounded text-sm">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* General tab */}
      {tab === 'general' && (
        <div className="space-y-4">
          {/* Status change */}
          {!isDiscovery && !isClosed && (
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm text-dark-400 mb-1 block">Cambiar estado</label>
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                  >
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{statusLabels[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Dates and repo */}
          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-dark-400 mb-1 block">Fecha de inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="text-sm text-dark-400 mb-1 block">Fecha de entrega</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="text-sm text-dark-400 mb-1 block">Repositorio GitHub</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-600 focus:outline-none focus:border-fizzia-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={saveDates}
                disabled={saving}
                className="cursor-pointer px-4 py-2 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <p className="text-dark-400 text-sm">Presupuesto</p>
              <p className="text-xl font-bold text-white mt-1">${Number(project.budget || 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <p className="text-dark-400 text-sm">Moneda</p>
              <p className="text-xl font-bold text-white mt-1">{project.currency || 'USD'}</p>
            </div>
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <p className="text-dark-400 text-sm">Creado</p>
              <p className="text-xl font-bold text-white mt-1">{formatDate(project.created_at)}</p>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-2">Descripción</h3>
              <p className="text-dark-300 text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Action buttons for discovery */}
          {isDiscovery && (
            <div className="flex gap-3">
              <button
                onClick={() => setActionModal('accept')}
                className="cursor-pointer px-6 py-2.5 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-sm font-medium rounded-lg hover:bg-fizzia-500/30 transition-all"
              >
                Aceptar proyecto
              </button>
              <button
                onClick={() => setActionModal('reject')}
                className="cursor-pointer px-6 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/30 transition-all"
              >
                Rechazar proyecto
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages tab */}
      {tab === 'mensajes' && (
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-dark-400 text-sm">No hay mensajes aún. Inicia la conversación.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.sender_id === myId || msg.is_admin_sender
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-sm lg:max-w-md px-4 py-3 rounded-2xl text-sm ${
                      isAdmin ? 'bg-fizzia-500/20 text-fizzia-300 rounded-br-md' : 'bg-dark-800 text-dark-200 rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isAdmin ? 'text-fizzia-500/60' : 'text-dark-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        {isAdmin && <span className="ml-1">(tú)</span>}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="p-3 border-t border-dark-800 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 text-sm"
              placeholder="Responder..."
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="cursor-pointer px-4 py-2.5 bg-fizzia-500 text-white rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Files tab */}
      {tab === 'archivos' && (
        <div className="space-y-4">
          <div className="bg-dark-800/50 rounded-xl p-4">
            <h4 className="text-white text-sm font-medium mb-3">Enviar archivos al cliente</h4>
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
              className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-fizzia-500 resize-none transition-all mb-2"
              rows={2}
              placeholder="Nota opcional (ej: versión final del diseño...)"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="cursor-pointer w-full py-2.5 bg-fizzia-500/10 border border-fizzia-500/30 text-fizzia-400 text-sm font-medium rounded-lg hover:bg-fizzia-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {uploading ? 'Subiendo...' : (
                <>
                  <span className="material-symbols-rounded text-base">cloud_upload</span>
                  Seleccionar archivos
                </>
              )}
            </button>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-12 bg-dark-900/50 border border-dark-800 rounded-xl">
              <p className="text-dark-400 text-sm">No hay archivos en este proyecto</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(file => (
                <div key={file.id} className="flex items-center gap-3 bg-dark-900/50 border border-dark-800 rounded-xl p-3 group">
                  <div className="w-9 h-9 bg-dark-700 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded text-fizzia-400 text-lg">{getFileIcon(file)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-dark-500 text-xs">
                      {getFileSize(file.file_size)}
                      {file.note && ` · ${file.note}`}
                    </p>
                  </div>
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="cursor-pointer p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-700 transition-all">
                    <span className="material-symbols-rounded text-lg">download</span>
                  </a>
                  <button onClick={() => handleDeleteFile(file.id, file.storage_path)} className="cursor-pointer p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-700 transition-all opacity-0 group-hover:opacity-100">
                    <span className="material-symbols-rounded text-lg">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoices tab */}
      {tab === 'pagos' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <p className="text-dark-400 text-sm">Total facturado</p>
              <p className="text-xl font-bold text-white mt-1">${invoices.reduce((s, i) => s + Number(i.total || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <p className="text-dark-400 text-sm">Total pagado</p>
              <p className="text-xl font-bold text-green-400 mt-1">${payments.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
              <p className="text-dark-400 text-sm">Pendiente</p>
              <p className="text-xl font-bold text-amber-400 mt-1">${(invoices.reduce((s, i) => s + Number(i.total || 0), 0) - payments.reduce((s, p) => s + Number(p.amount || 0), 0)).toLocaleString()}</p>
            </div>
          </div>

          {/* Invoices list */}
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Facturas</h3>
            <button onClick={() => setShowInvoiceForm(true)} className="cursor-pointer px-3 py-1.5 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-sm font-medium rounded-lg hover:bg-fizzia-500/30 transition-all">
              + Nueva factura
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8 bg-dark-900/50 border border-dark-800 rounded-xl">
              <p className="text-dark-400 text-sm">No hay facturas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{inv.invoice_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <span className="text-white font-bold">{formatMoney(inv.total)}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-dark-500">
                    <span>Emitida: {formatDate(inv.issued_at)}</span>
                    <span>Vence: {formatDate(inv.due_at)}</span>
                  </div>
                  {inv.payments && inv.payments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dark-800">
                      <p className="text-dark-400 text-xs mb-2">Pagos:</p>
                      {inv.payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="text-green-400">+ {formatMoney(p.amount)}</span>
                          <span className="text-dark-500">{formatDate(p.paid_at)} {p.method ? `· ${p.method}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Milestones tab */}
      {tab === 'hitos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Hitos del proyecto</h3>
            <button onClick={() => setShowMilestoneForm(true)} className="cursor-pointer px-3 py-1.5 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-sm font-medium rounded-lg hover:bg-fizzia-500/30 transition-all">
              + Nuevo hito
            </button>
          </div>

          {milestones.length === 0 ? (
            <div className="text-center py-8 bg-dark-900/50 border border-dark-800 rounded-xl">
              <p className="text-dark-400 text-sm">No hay hitos creados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="bg-dark-900/50 border border-dark-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium">{m.title}</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.status}
                        onChange={(e) => updateMilestoneStatus(m.id, e.target.value)}
                        className="px-2 py-1 bg-dark-950 border border-dark-700 rounded text-dark-300 text-xs focus:outline-none focus:border-fizzia-500"
                      >
                        <option value="todo">Por hacer</option>
                        <option value="doing">En progreso</option>
                        <option value="blocked">Bloqueado</option>
                        <option value="review">En revisión</option>
                        <option value="done">Completado</option>
                      </select>
                      <button onClick={() => deleteMilestoneItem(m.id)} className="p-1 text-dark-500 hover:text-red-400 transition-colors">
                        <span className="material-symbols-rounded text-lg">close</span>
                      </button>
                    </div>
                  </div>
                  {m.description && <p className="text-dark-400 text-sm">{m.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status change confirm modal */}
      <Modal isOpen={statusChangeModal} onClose={() => setStatusChangeModal(false)} title="Cambiar estado" size="sm">
        <p className="text-dark-300 text-sm mb-4">
          ¿Cambiar el estado de <span className="text-white font-medium">{project.name}</span> a <span className="text-fizzia-400 font-medium">{statusLabels[pendingStatus]}</span>?
        </p>
        <div className="flex gap-2">
          <button onClick={() => setStatusChangeModal(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={confirmStatusChange} disabled={acting} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">
            {acting ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </Modal>

      {/* Invoice form modal */}
      <Modal isOpen={showInvoiceForm} onClose={() => setShowInvoiceForm(false)} title="Nueva factura" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Número</label>
              <input type="text" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
            </div>
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Total</label>
              <input type="number" value={invoiceForm.total} onChange={(e) => setInvoiceForm(prev => ({ ...prev, total: Number(e.target.value) }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Fecha emisión</label>
              <input type="date" value={invoiceForm.issued_at} onChange={(e) => setInvoiceForm(prev => ({ ...prev, issued_at: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
            </div>
            <div>
              <label className="text-sm text-dark-400 mb-1 block">Fecha vencimiento</label>
              <input type="date" value={invoiceForm.due_at} onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_at: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
            </div>
          </div>
          <div>
            <label className="text-sm text-dark-400 mb-1 block">Notas</label>
            <textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowInvoiceForm(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
            <button onClick={handleCreateInvoice} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 transition-all">Crear factura</button>
          </div>
        </div>
      </Modal>

      {/* Milestone form modal */}
      <Modal isOpen={showMilestoneForm} onClose={() => setShowMilestoneForm(false)} title="Nuevo hito" size="md">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-dark-400 mb-1 block">Título</label>
            <input type="text" value={newMilestone.title} onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" placeholder="Ej: Diseño UI completado" />
          </div>
          <div>
            <label className="text-sm text-dark-400 mb-1 block">Descripción</label>
            <textarea value={newMilestone.description} onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowMilestoneForm(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
            <button onClick={handleCreateMilestone} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 transition-all">Crear hito</button>
          </div>
        </div>
      </Modal>

      {/* Accept modal */}
      <Modal isOpen={actionModal === 'accept'} onClose={() => setActionModal(null)} title="Aceptar proyecto" size="sm">
        <p className="text-dark-300 text-sm mb-4">¿Confirmas que deseas aceptar <span className="text-white font-medium">{project.name}</span>? El proyecto pasará a estado <span className="text-fizzia-400 font-medium">En desarrollo</span>.</p>
        <div className="flex gap-2">
          <button onClick={() => setActionModal(null)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
          <button onClick={handleConfirmAction} disabled={acting} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">{acting ? 'Procesando...' : 'Confirmar'}</button>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={actionModal === 'reject'} onClose={() => setActionModal(null)} title="Rechazar proyecto" size="sm">
        <p className="text-dark-300 text-sm mb-4">¿Confirmas que deseas rechazar <span className="text-white font-medium">{project.name}</span>? El proyecto pasará a estado <span className="text-red-400 font-medium">Cancelado</span>.</p>
        <div className="flex gap-2">
          <button onClick={() => setActionModal(null)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
          <button onClick={handleConfirmAction} disabled={acting} className="cursor-pointer flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-400 disabled:opacity-50 transition-all">{acting ? 'Procesando...' : 'Confirmar'}</button>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal isOpen={actionModal === 'cancel'} onClose={() => { setActionModal(null); setCancelPassword(''); setCancelAgreed(false) }} title="Cancelar proyecto" size="sm">
        <p className="text-dark-300 text-sm mb-4">Estás por cancelar <span className="text-white font-medium">{project.name}</span>. Esta acción requiere confirmación con tu contraseña.</p>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-400 mb-1 block">Contraseña</label>
            <input type="password" value={cancelPassword} onChange={(e) => setCancelPassword(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" placeholder="Ingresa tu contraseña" />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={cancelAgreed} onChange={(e) => setCancelAgreed(e.target.checked)} className="mt-0.5 rounded border-dark-700 bg-dark-950 text-fizzia-500 focus:ring-fizzia-500" />
            <span className="text-sm text-dark-300">Entiendo que cancelar el proyecto afecta la relación con el cliente y los procesos en curso.</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => { setActionModal(null); setCancelPassword(''); setCancelAgreed(false) }} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cerrar</button>
            <button onClick={handleConfirmAction} disabled={acting} className="cursor-pointer flex-1 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-all">{acting ? 'Procesando...' : 'Confirmar cancelación'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
