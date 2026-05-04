import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { updateProject, getAllProjectFiles, uploadProjectFileAdmin, deleteProjectFile, getProjectInvoicesWithPayments, getProjectPayments, getProjectMilestones, createMilestone, updateMilestone, deleteMilestone, sendAdminMessage, subscribeToAdminMessages } from '../../services/adminData'
import { getProjectMessages } from '../../services/clientData'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/ui/Modal'
import { supabase } from '../../services/supabase'
import { formatDate, formatMoney } from '../../utils/format'

const statusLabels = {
  solicitado: 'Solicitado', preparando: 'Preparando', trabajando: 'Trabajando',
  pausado: 'Pausado', entregado: 'Entregado', cancelado: 'Cancelado',
}

const statusColors = {
  solicitado: 'bg-fizzia-500', preparando: 'bg-purple-500', trabajando: 'bg-blue-500',
  pausado: 'bg-yellow-500', entregado: 'bg-green-500', cancelado: 'bg-red-500',
}

const statusOptions = ['preparando', 'trabajando', 'pausado', 'entregado']

const milestoneLabels = { todo: 'Por hacer', doing: 'En progreso', blocked: 'Bloqueado', review: 'En revisión', done: 'Completado' }

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [showEditDates, setShowEditDates] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [myId, setMyId] = useState(null)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [fileNote, setFileNote] = useState('')
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [milestones, setMilestones] = useState([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', status: 'todo' })
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '', invoice_number: '', subtotal: 0, discount: 0, tax: 0, total: 0,
    issued_at: new Date().toISOString().split('T')[0], due_at: '', notes: '',
  })
  const [actionModal, setActionModal] = useState(null)
  const [cancelPassword, setCancelPassword] = useState('')
  const [cancelAgreed, setCancelAgreed] = useState(false)
  const [acting, setActing] = useState(false)
  const [statusChangeModal, setStatusChangeModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState('')

  // File requests
  const [fileRequests, setFileRequests] = useState([])
  const [showFileRequestForm, setShowFileRequestForm] = useState(false)
  const [newFileRequest, setNewFileRequest] = useState('')
  const [requestSaving, setRequestSaving] = useState(false)

  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const fileInputRef = useRef(null)

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
          setShowEditDates(!data.start_date && !data.due_date && !data.repository_url)
          const [msgs, f, inv, pay, miles, fileReqs] = await Promise.all([
            getProjectMessages(data.id),
            getAllProjectFiles(data.id),
            getProjectInvoicesWithPayments(data.id),
            getProjectPayments(data.id),
            getProjectMilestones(data.id),
            supabase.from('project_file_requests').select('*').eq('project_id', data.id).order('created_at', { ascending: false }),
          ])
          setMessages(msgs)
          setFiles(f)
          setInvoices(inv)
          setPayments(pay)
          setMilestones(miles)
          setFileRequests(fileReqs.data || [])
          setInvoiceForm(prev => ({ ...prev, client_id: data.client_id, invoice_number: `FACT-${Date.now()}` }))
        }
      } catch (err) { console.error('Error loading project:', err) }
      finally { setLoading(false) }
    }
    loadProject()
  }, [projectId])

  useEffect(() => {
    if (project && tab === 'mensajes') {
      channelRef.current = subscribeToAdminMessages(project.id, (payload) => setMessages(prev => [...prev, payload]))
    }
    return () => { if (channelRef.current) channelRef.current.unsubscribe() }
  }, [project, tab])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const saveDates = async () => {
    setSaving(true)
    await updateProject(project.id, { start_date: startDate || null, due_date: dueDate || null, repository_url: repoUrl || null })
    setSaving(false)
    setShowEditDates(false)
    toast.success('Datos guardados')
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !project) return
    const content = newMessage.trim()
    setNewMessage('')
    try { await sendAdminMessage(project.id, content) } catch { toast.error('Error enviando mensaje') }
  }

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length || !project) return
    setUploading(true)
    for (const file of selectedFiles) {
      const result = await uploadProjectFileAdmin(project.id, file, fileNote)
      if (result.error) toast.error(`Error al subir ${file.name}`)
      else setFiles(prev => [result.data, ...prev])
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

  const handleStatusChange = (newStatus) => { setPendingStatus(newStatus); setStatusChangeModal(true) }

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
        email: (await supabase.auth.getUser()).data.user?.email, password: cancelPassword,
      })
      if (error) { toast.error('Contraseña incorrecta'); return }
    }
    setActing(true)
    const newStatus = actionModal === 'accept' ? 'preparando' : 'cancelado'
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
      .select().single()
    if (invoice) { setInvoices(prev => [invoice, ...prev]); toast.success('Factura creada'); setShowInvoiceForm(false) }
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

  const handleCreateFileRequest = async () => {
    if (!newFileRequest.trim()) return
    setRequestSaving(true)
    const { data } = await supabase
      .from('project_file_requests')
      .insert({ project_id: project.id, request_text: newFileRequest.trim() })
      .select().single()
    if (data) {
      setFileRequests(prev => [data, ...prev])
      toast.success('Solicitud enviada al cliente')
      setNewFileRequest('')
      setShowFileRequestForm(false)
    }
    setRequestSaving(false)
  }

  const handleDeleteFileRequest = async (id) => {
    await supabase.from('project_file_requests').delete().eq('id', id)
    setFileRequests(prev => prev.filter(r => r.id !== id))
    toast.success('Solicitud eliminada')
  }

  if (loading) return <div className="p-6"><div className="h-96 bg-dark-800 rounded-xl animate-pulse" /></div>
  if (!project) return <div className="p-6"><p className="text-dark-400">Proyecto no encontrado</p></div>

  const isSolicitado = project.status === 'solicitado'
  const isClosed = ['entregado', 'cancelado'].includes(project.status)
  const hasDates = startDate || dueDate || repoUrl

  const tabs = [
    { id: 'general', label: 'General', icon: 'description' },
    { id: 'mensajes', label: 'Mensajes', icon: 'chat' },
    { id: 'archivos', label: 'Archivos', icon: 'folder' },
    { id: 'pagos', label: 'Pagos', icon: 'payments' },
    { id: 'hitos', label: 'Hitos', icon: 'flag' },
  ]

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-900/80 border-b border-dark-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/admin')} className="cursor-pointer p-1 text-dark-400 hover:text-white transition-colors shrink-0">
            <span className="material-symbols-rounded text-lg">arrow_back</span>
          </button>
          <h1 className="text-sm font-bold text-white truncate">{project.name}</h1>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-white shrink-0 ${statusColors[project.status]}`}>
            {statusLabels[project.status] || project.status}
          </span>
          <span className="text-xs text-dark-500 truncate">{project.clients?.name || ''}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isSolicitado && (
            <>
              <button onClick={() => setActionModal('accept')} className="cursor-pointer px-2.5 py-1 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-xs font-medium rounded-md hover:bg-fizzia-500/30 transition-all">Aceptar</button>
              <button onClick={() => setActionModal('reject')} className="cursor-pointer px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium rounded-md hover:bg-red-500/30 transition-all">Rechazar</button>
            </>
          )}
          {!isSolicitado && !isClosed && (
            <button onClick={() => setActionModal('cancel')} className="cursor-pointer px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium rounded-md hover:bg-amber-500/30 transition-all">Cancelar</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-dark-900/50 border-b border-dark-800 shrink-0">
        <div className="flex gap-0.5 bg-dark-800 rounded-md p-0.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${tab === t.id ? 'bg-fizzia-500 text-white' : 'text-dark-400 hover:text-white'}`}>
              <span className="material-symbols-rounded text-sm">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-dark-600">{project.currency || 'USD'} · ${Number(project.budget || 0).toLocaleString()}</span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {/* General tab */}
        {tab === 'general' && (
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {/* Status change */}
            {!isSolicitado && !isClosed && (
              <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-dark-400 shrink-0">Estado:</span>
                  <select value={project.status} onChange={(e) => handleStatusChange(e.target.value)} className="flex-1 px-2 py-1.5 bg-dark-950 border border-dark-700 rounded text-white text-xs focus:outline-none focus:border-fizzia-500">
                    {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Dates/repo - collapsed chips or edit form */}
            {hasDates && !showEditDates ? (
              <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dark-400">Información del proyecto</span>
                  <button onClick={() => setShowEditDates(true)} className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 transition-colors">Editar</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {startDate && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-dark-950 border border-dark-700 rounded-md text-dark-300">
                      <span className="material-symbols-rounded text-xs">calendar_today</span>
                      Inicio: {formatDate(startDate)}
                    </span>
                  )}
                  {dueDate && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-dark-950 border border-dark-700 rounded-md text-dark-300">
                      <span className="material-symbols-rounded text-xs">event_available</span>
                      Entrega: {formatDate(dueDate)}
                    </span>
                  )}
                  {repoUrl && (
                    <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-dark-950 border border-dark-700 rounded-md text-fizzia-400 hover:border-fizzia-500/50 transition-colors truncate max-w-[200px]">
                      <span className="material-symbols-rounded text-xs">code</span>
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-dark-400">Fechas y repositorio</span>
                  {hasDates && <button onClick={() => setShowEditDates(false)} className="cursor-pointer text-xs text-dark-500 hover:text-white transition-colors">Cancelar</button>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1.5 bg-dark-950 border border-dark-700 rounded text-white text-xs focus:outline-none focus:border-fizzia-500" />
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-2 py-1.5 bg-dark-950 border border-dark-700 rounded text-white text-xs focus:outline-none focus:border-fizzia-500" />
                  <div className="flex gap-1.5">
                    <input type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="GitHub URL" className="flex-1 px-2 py-1.5 bg-dark-950 border border-dark-700 rounded text-white text-xs placeholder-dark-600 focus:outline-none focus:border-fizzia-500" />
                    <button onClick={saveDates} disabled={saving} className="cursor-pointer px-2.5 py-1.5 bg-fizzia-500 text-white text-xs font-medium rounded hover:bg-fizzia-400 disabled:opacity-50 transition-all shrink-0">
                      {saving ? '...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {project.description && (
              <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-3">
                <p className="text-xs text-dark-500 mb-1">Descripción</p>
                <p className="text-dark-300 text-xs whitespace-pre-wrap line-clamp-6">{project.description}</p>
              </div>
            )}

            {/* Created date */}
            <p className="text-[10px] text-dark-600">Creado el {formatDate(project.created_at)}</p>
          </div>
        )}

        {/* Messages tab */}
        {tab === 'mensajes' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-dark-500 text-xs">No hay mensajes aún</p></div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_id === myId || msg.is_admin_sender
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-xl text-xs ${isAdmin ? 'bg-fizzia-500/20 text-fizzia-300 rounded-br-sm' : 'bg-dark-800 text-dark-200 rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-0.5 ${isAdmin ? 'text-fizzia-500/50' : 'text-dark-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-2 border-t border-dark-800 flex gap-2 shrink-0">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 text-xs" placeholder="Escribir mensaje..." />
              <button type="submit" disabled={!newMessage.trim()} className="cursor-pointer px-3 py-2 bg-fizzia-500 text-white rounded-lg hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <span className="material-symbols-rounded text-sm">send</span>
              </button>
            </form>
          </div>
        )}

        {/* Files tab */}
        {tab === 'archivos' && (
          <div className="h-full overflow-y-auto p-3 space-y-3">
            {/* Upload section */}
            <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-3">
              <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.zip,.rar,.psd,.ai,.fig,.sketch,.mp4,.mov,.svg" />
              <textarea value={fileNote} onChange={(e) => setFileNote(e.target.value)} className="w-full px-2 py-1.5 bg-dark-950 border border-dark-700 rounded text-white text-xs placeholder-dark-500 focus:outline-none focus:border-fizzia-500 resize-none mb-2" rows={1} placeholder="Nota opcional..." />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="cursor-pointer w-full py-1.5 bg-fizzia-500/10 border border-fizzia-500/30 text-fizzia-400 text-xs font-medium rounded hover:bg-fizzia-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                {uploading ? 'Subiendo...' : <><span className="material-symbols-rounded text-sm">cloud_upload</span>Subir archivos</>}
              </button>
            </div>

            {/* File requests section */}
            <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-400 font-medium">Solicitar archivos al cliente</span>
                <button onClick={() => setShowFileRequestForm(!showFileRequestForm)} className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 transition-colors">
                  <span className="material-symbols-rounded text-sm">{showFileRequestForm ? 'close' : 'add'}</span>
                </button>
              </div>
              {showFileRequestForm && (
                <div className="flex gap-1.5 mt-2">
                  <input type="text" value={newFileRequest} onChange={(e) => setNewFileRequest(e.target.value)} className="flex-1 px-2 py-1.5 bg-dark-950 border border-dark-700 rounded text-white text-xs placeholder-dark-600 focus:outline-none focus:border-fizzia-500" placeholder="Ej: Logo en alta resolución, imágenes del equipo..." />
                  <button onClick={handleCreateFileRequest} disabled={requestSaving || !newFileRequest.trim()} className="cursor-pointer px-2.5 py-1.5 bg-fizzia-500 text-white text-xs font-medium rounded hover:bg-fizzia-400 disabled:opacity-50 transition-all shrink-0">
                    {requestSaving ? '...' : 'Enviar'}
                  </button>
                </div>
              )}
              {fileRequests.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {fileRequests.map(req => (
                    <div key={req.id} className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs ${req.fulfilled ? 'bg-green-500/10 border border-green-500/20' : 'bg-dark-950 border border-dark-700'}`}>
                      <div className="flex-1 min-w-0 mr-2">
                        <p className={`truncate ${req.fulfilled ? 'text-green-400' : 'text-dark-300'}`}>{req.request_text}</p>
                        <p className="text-[10px] text-dark-500">{formatDate(req.created_at)}</p>
                      </div>
                      <button onClick={() => handleDeleteFileRequest(req.id)} className="cursor-pointer p-0.5 text-dark-500 hover:text-red-400 transition-colors shrink-0">
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files list */}
            {files.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[10px] text-dark-500 font-medium uppercase tracking-wider">{files.length} archivos</p>
                {files.map(file => (
                  <div key={file.id} className="flex items-center gap-2 bg-dark-900/50 border border-dark-800 rounded-lg p-2 group">
                    <div className="w-7 h-7 bg-dark-700 rounded flex items-center justify-center shrink-0"><span className="material-symbols-rounded text-fizzia-400 text-sm">{getFileIcon(file)}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{file.file_name}</p>
                      <p className="text-dark-500 text-[10px]">{getFileSize(file.file_size)}{file.note && ` · ${file.note}`}</p>
                    </div>
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="cursor-pointer p-1 text-dark-500 hover:text-white transition-colors"><span className="material-symbols-rounded text-sm">download</span></a>
                    <button onClick={() => handleDeleteFile(file.id, file.storage_path)} className="cursor-pointer p-1 text-dark-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><span className="material-symbols-rounded text-sm">delete</span></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6"><p className="text-dark-500 text-xs">No hay archivos</p></div>
            )}
          </div>
        )}

        {/* Invoices tab */}
        {tab === 'pagos' && (
          <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-dark-500">Facturado</p>
                <p className="text-sm font-bold text-white">${invoices.reduce((s, i) => s + Number(i.total || 0), 0).toLocaleString()}</p>
              </div>
              <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-dark-500">Pagado</p>
                <p className="text-sm font-bold text-green-400">${payments.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()}</p>
              </div>
              <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-dark-500">Pendiente</p>
                <p className="text-sm font-bold text-amber-400">${(invoices.reduce((s, i) => s + Number(i.total || 0), 0) - payments.reduce((s, p) => s + Number(p.amount || 0), 0)).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-white font-medium">Facturas</p>
              <button onClick={() => setShowInvoiceForm(true)} className="cursor-pointer px-2 py-1 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-xs font-medium rounded hover:bg-fizzia-500/30 transition-all">+ Nueva</button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-6"><p className="text-dark-500 text-xs">No hay facturas</p></div>
            ) : (
              <div className="space-y-1.5">
                {invoices.map(inv => (
                  <div key={inv.id} className="bg-dark-900/50 border border-dark-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-medium">{inv.invoice_number}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{inv.status}</span>
                      </div>
                      <span className="text-white text-xs font-bold">{formatMoney(inv.total)}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-dark-500">
                      <span>Emitida: {formatDate(inv.issued_at)}</span>
                      <span>Vence: {formatDate(inv.due_at)}</span>
                    </div>
                    {inv.payments?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dark-800 space-y-0.5">
                        {inv.payments.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-[10px]">
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
          <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white font-medium">Hitos</p>
              <button onClick={() => setShowMilestoneForm(true)} className="cursor-pointer px-2 py-1 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-xs font-medium rounded hover:bg-fizzia-500/30 transition-all">+ Nuevo</button>
            </div>
            {milestones.length === 0 ? (
              <div className="text-center py-6"><p className="text-dark-500 text-xs">No hay hitos</p></div>
            ) : (
              <div className="space-y-1.5">
                {milestones.map(m => (
                  <div key={m.id} className="bg-dark-900/50 border border-dark-800 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-xs font-medium">{m.title}</p>
                      <div className="flex items-center gap-1.5">
                        <select value={m.status} onChange={(e) => updateMilestoneStatus(m.id, e.target.value)} className="px-1.5 py-0.5 bg-dark-950 border border-dark-700 rounded text-dark-300 text-[10px] focus:outline-none focus:border-fizzia-500">
                          {Object.entries(milestoneLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button onClick={() => deleteMilestoneItem(m.id)} className="p-0.5 text-dark-500 hover:text-red-400 transition-colors"><span className="material-symbols-rounded text-sm">close</span></button>
                      </div>
                    </div>
                    {m.description && <p className="text-dark-400 text-[10px] mt-0.5">{m.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={statusChangeModal} onClose={() => setStatusChangeModal(false)} title="Cambiar estado" size="sm">
        <p className="text-dark-300 text-sm mb-4">¿Cambiar estado de <span className="text-white font-medium">{project.name}</span> a <span className="text-fizzia-400 font-medium">{statusLabels[pendingStatus]}</span>?</p>
        <div className="flex gap-2">
          <button onClick={() => setStatusChangeModal(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
          <button onClick={confirmStatusChange} disabled={acting} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">{acting ? 'Procesando...' : 'Confirmar'}</button>
        </div>
      </Modal>

      <Modal isOpen={showInvoiceForm} onClose={() => setShowInvoiceForm(false)} title="Nueva factura" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm text-dark-400 mb-1 block">Número</label><input type="text" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" /></div>
            <div><label className="text-sm text-dark-400 mb-1 block">Total</label><input type="number" value={invoiceForm.total} onChange={(e) => setInvoiceForm(prev => ({ ...prev, total: Number(e.target.value) }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm text-dark-400 mb-1 block">Fecha emisión</label><input type="date" value={invoiceForm.issued_at} onChange={(e) => setInvoiceForm(prev => ({ ...prev, issued_at: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" /></div>
            <div><label className="text-sm text-dark-400 mb-1 block">Fecha vencimiento</label><input type="date" value={invoiceForm.due_at} onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_at: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" /></div>
          </div>
          <div><label className="text-sm text-dark-400 mb-1 block">Notas</label><textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 resize-none" /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowInvoiceForm(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
            <button onClick={handleCreateInvoice} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 transition-all">Crear factura</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showMilestoneForm} onClose={() => setShowMilestoneForm(false)} title="Nuevo hito" size="md">
        <div className="space-y-3">
          <div><label className="text-sm text-dark-400 mb-1 block">Título</label><input type="text" value={newMilestone.title} onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" placeholder="Ej: Diseño UI completado" /></div>
          <div><label className="text-sm text-dark-400 mb-1 block">Descripción</label><textarea value={newMilestone.description} onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 resize-none" /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowMilestoneForm(false)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
            <button onClick={handleCreateMilestone} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 transition-all">Crear hito</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={actionModal === 'accept'} onClose={() => setActionModal(null)} title="Aceptar proyecto" size="sm">
        <p className="text-dark-300 text-sm mb-4">¿Confirmas que deseas aceptar <span className="text-white font-medium">{project.name}</span>? El proyecto pasará a estado <span className="text-fizzia-400 font-medium">Preparando</span>.</p>
        <div className="flex gap-2">
          <button onClick={() => setActionModal(null)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
          <button onClick={handleConfirmAction} disabled={acting} className="cursor-pointer flex-1 px-4 py-2.5 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">{acting ? 'Procesando...' : 'Confirmar'}</button>
        </div>
      </Modal>

      <Modal isOpen={actionModal === 'reject'} onClose={() => setActionModal(null)} title="Rechazar proyecto" size="sm">
        <p className="text-dark-300 text-sm mb-4">¿Confirmas que deseas rechazar <span className="text-white font-medium">{project.name}</span>? El proyecto pasará a estado <span className="text-red-400 font-medium">Cancelado</span>.</p>
        <div className="flex gap-2">
          <button onClick={() => setActionModal(null)} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">Cancelar</button>
          <button onClick={handleConfirmAction} disabled={acting} className="cursor-pointer flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-400 disabled:opacity-50 transition-all">{acting ? 'Procesando...' : 'Confirmar'}</button>
        </div>
      </Modal>

      <Modal isOpen={actionModal === 'cancel'} onClose={() => { setActionModal(null); setCancelPassword(''); setCancelAgreed(false) }} title="Cancelar proyecto" size="sm">
        <p className="text-dark-300 text-sm mb-4">Estás por cancelar <span className="text-white font-medium">{project.name}</span>. Esta acción requiere confirmación con tu contraseña.</p>
        <div className="space-y-4">
          <div><label className="text-sm text-dark-400 mb-1 block">Contraseña</label><input type="password" value={cancelPassword} onChange={(e) => setCancelPassword(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" placeholder="Ingresa tu contraseña" /></div>
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
