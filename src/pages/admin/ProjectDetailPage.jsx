import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { updateProject, getAllProjectFiles, uploadProjectFileAdmin, deleteProjectFile, getProjectInvoicesWithPayments, getProjectPayments, sendAdminMessage, subscribeToAdminMessages, getProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask, getProjectFileRequests, createProjectFileRequest, deleteProjectFileRequest } from '../../services/adminData'
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
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
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
  const [showBudgetEdit, setShowBudgetEdit] = useState(false)
  const [budgetValue, setBudgetValue] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [finalPriceValue, setFinalPriceValue] = useState('')
  const [showPriceEdit, setShowPriceEdit] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)

  // File requests
  const [fileRequests, setFileRequests] = useState([])
  const [showFileRequestForm, setShowFileRequestForm] = useState(false)
  const [newFileRequest, setNewFileRequest] = useState('')
  const [requestSaving, setRequestSaving] = useState(false)

  // Checklist
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [savingTask, setSavingTask] = useState(false)

  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const fileInputRef = useRef(null)

  // Restore tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const savedTab = params.get('tab')
    if (savedTab && ['general', 'mensajes', 'archivos'].includes(savedTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(savedTab)
    }
  }, [])

  // Persist tab to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [tab])

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
          setBudgetValue(String(data.budget || ''))
          setFinalPriceValue(String(data.final_price || ''))
          setStartDate(data.start_date ? data.start_date.split('T')[0] : '')
          setDueDate(data.due_date ? data.due_date.split('T')[0] : '')
          setRepoUrl(data.repository_url || '')
          setShowEditDates(!data.start_date && !data.due_date && !data.repository_url)
          const [msgs, f, inv, pay, fileReqs, tasksRes] = await Promise.all([
            getProjectMessages(data.id),
            getAllProjectFiles(data.id),
            getProjectInvoicesWithPayments(data.id),
            getProjectPayments(data.id),
            getProjectFileRequests(data.id),
            getProjectTasks(data.id),
          ])
          setMessages(msgs)
          setFiles(f)
          setInvoices(inv)
          setPayments(pay)
          setFileRequests(fileReqs || [])
          setTasks(tasksRes || [])
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

  const saveBudget = async () => {
    if (!budgetValue || Number(budgetValue) < 0) { toast.error('Presupuesto inválido'); return }
    setSavingBudget(true)
    await updateProject(project.id, { budget: Number(budgetValue) })
    setProject(prev => ({ ...prev, budget: Number(budgetValue) }))
    setSavingBudget(false)
    setShowBudgetEdit(false)
    toast.success('Presupuesto del cliente actualizado')
  }

  const savePrice = async () => {
    if (!finalPriceValue || Number(finalPriceValue) <= 0) { toast.error('Precio inválido'); return }
    setSavingPrice(true)
    await updateProject(project.id, { final_price: Number(finalPriceValue) })
    setProject(prev => ({ ...prev, final_price: Number(finalPriceValue) }))
    setSavingPrice(false)
    setShowPriceEdit(false)
    toast.success('Precio del proyecto establecido')
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

  // Checklist handlers
  const toggleTaskDone = async (task) => {
    const updated = { status: task.status === 'done' ? 'todo' : 'done' }
    if (updated.status === 'done') updated.completed_at = new Date().toISOString()
    else delete updated.completed_at
    const { data } = await updateProjectTask(task.id, updated)
    if (data) setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updated } : t))
  }

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    setSavingTask(true)
    const { data } = await createProjectTask({
      project_id: project.id,
      title: newTaskTitle.trim(),
      status: 'todo',
      sort_order: tasks.length,
    })
    if (data) {
      setTasks(prev => [...prev, data])
      setNewTaskTitle('')
      toast.success('Tarea agregada')
    }
    setSavingTask(false)
    setShowTaskForm(false)
  }

  const removeTask = async (id) => {
    await deleteProjectTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    toast.success('Tarea eliminada')
  }

  const handleCreateFileRequest = async () => {
    if (!newFileRequest.trim()) return
    setRequestSaving(true)
    const data = await createProjectFileRequest(project.id, newFileRequest.trim())
    if (data) {
      setFileRequests(prev => [data, ...prev])
      toast.success('Solicitud enviada al cliente')
      setNewFileRequest('')
      setShowFileRequestForm(false)
    }
    setRequestSaving(false)
  }

  const handleDeleteFileRequest = async (id) => {
    await deleteProjectFileRequest(id)
    setFileRequests(prev => prev.filter(r => r.id !== id))
    toast.success('Solicitud eliminada')
  }

  if (loading) return (
    <div className="p-6">
      <div className="h-96 bg-dark-800 rounded-xl animate-pulse" />
    </div>
  )
  if (!project) return (
    <div className="p-6">
      <button onClick={() => navigate('/admin')} className="cursor-pointer text-fizzia-400 hover:text-fizzia-300 text-sm mb-4 inline-flex items-center gap-1">
        <span className="material-symbols-rounded text-sm">arrow_back</span> Volver
      </button>
      <p className="text-dark-400">Proyecto no encontrado</p>
    </div>
  )

  const isSolicitado = project.status === 'solicitado'
  const isClosed = ['entregado', 'cancelado'].includes(project.status)
  const doneTasks = tasks.filter(t => t.status === 'done').length

  const tabs = [
    { id: 'general', label: 'General', icon: 'description' },
    { id: 'mensajes', label: 'Mensajes', icon: 'chat' },
    { id: 'archivos', label: 'Archivos', icon: 'folder' },
  ]

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="border-b border-dark-800 bg-dark-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => navigate('/admin')} className="cursor-pointer p-2 text-dark-400 hover:text-white transition-colors shrink-0">
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
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {isSolicitado && (
                <>
                  <button onClick={() => setActionModal('accept')} className="cursor-pointer px-4 py-2 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-sm font-medium rounded-lg hover:bg-fizzia-500/30 transition-all">Aceptar</button>
                  <button onClick={() => setActionModal('reject')} className="cursor-pointer px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/30 transition-all">Rechazar</button>
                </>
              )}
              {!isSolicitado && !isClosed && (
                <button onClick={() => setActionModal('cancel')} className="cursor-pointer px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium rounded-lg hover:bg-amber-500/30 transition-all">Cancelar</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-800 bg-dark-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`cursor-pointer flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                    tab === t.id
                      ? 'border-fizzia-500 text-white'
                      : 'border-transparent text-dark-400 hover:text-white hover:border-dark-600'
                  }`}
                >
                  <span className="material-symbols-rounded text-lg">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-dark-400">{project.currency || 'USD'}</span>
              <span className="text-white font-semibold">{project.final_price ? formatMoney(project.final_price) : formatMoney(project.budget || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* General tab */}
        {tab === 'general' && (
          <div className="space-y-6">
            {/* Status change */}
            {!isSolicitado && !isClosed && (
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-dark-400 mb-3">Cambiar estado</h3>
                <div className="flex items-center gap-4">
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                  >
                    {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                  </select>
                  <span className="text-dark-500 text-sm">Selecciona el nuevo estado</span>
                </div>
              </div>
            )}

            {/* Budget & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Budget */}
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-dark-400">Presupuesto del cliente</h3>
                  <button onClick={() => setShowBudgetEdit(!showBudgetEdit)} className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 transition-colors flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">{showBudgetEdit ? 'close' : 'edit'}</span>
                    {showBudgetEdit ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {showBudgetEdit ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={budgetValue}
                      onChange={(e) => setBudgetValue(e.target.value)}
                      className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                    <button
                      onClick={saveBudget}
                      disabled={savingBudget}
                      className="cursor-pointer px-4 py-2 bg-dark-700 text-white text-sm font-medium rounded-lg hover:bg-dark-600 disabled:opacity-50 transition-all"
                    >
                      {savingBudget ? '...' : 'Guardar'}
                    </button>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-white">{project.final_price ? '—' : formatMoney(project.budget || 0)}</p>
                )}
                {project.final_price && (
                  <p className="text-xs text-dark-500 mt-2">Reemplazado por el precio final</p>
                )}
              </div>

              {/* Final Price */}
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-dark-400">Precio del proyecto</h3>
                  <button onClick={() => setShowPriceEdit(!showPriceEdit)} className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 transition-colors flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">{showPriceEdit ? 'close' : 'edit'}</span>
                    {showPriceEdit ? 'Cancelar' : project.final_price ? 'Editar' : 'Definir'}
                  </button>
                </div>
                {showPriceEdit ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={finalPriceValue}
                      onChange={(e) => setFinalPriceValue(e.target.value)}
                      className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                    <button
                      onClick={savePrice}
                      disabled={savingPrice}
                      className="cursor-pointer px-4 py-2 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all"
                    >
                      {savingPrice ? '...' : 'Guardar'}
                    </button>
                  </div>
                ) : (
                  <div>
                    {project.final_price ? (
                      <p className="text-2xl font-bold text-green-400">{formatMoney(project.final_price)}</p>
                    ) : (
                      <p className="text-lg text-dark-500">Sin definir</p>
                    )}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-dark-400">Fechas</h3>
                  <button onClick={() => setShowEditDates(!showEditDates)} className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 transition-colors flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">{showEditDates ? 'close' : 'edit'}</span>
                    {showEditDates ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {showEditDates ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-dark-500 mb-1 block">Fecha inicio</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
                      </div>
                      <div>
                        <label className="text-xs text-dark-500 mb-1 block">Fecha entrega</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-dark-500 mb-1 block">URL repositorio</label>
                      <input type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/..." className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 placeholder-dark-600" />
                    </div>
                    <button onClick={saveDates} disabled={saving} className="cursor-pointer px-4 py-2 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {startDate && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-dark-500 text-sm">calendar_today</span>
                        <span className="text-sm text-white">Inicio: {formatDate(startDate)}</span>
                      </div>
                    )}
                    {dueDate && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-dark-500 text-sm">event_available</span>
                        <span className="text-sm text-white">Entrega: {formatDate(dueDate)}</span>
                      </div>
                    )}
                    {repoUrl && (
                      <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-fizzia-400 hover:text-fizzia-300 transition-colors">
                        <span className="material-symbols-rounded text-sm">code</span>
                        Repositorio
                      </a>
                    )}
                    {!startDate && !dueDate && !repoUrl && (
                      <p className="text-sm text-dark-500">Sin fechas configuradas</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-dark-400 mb-3">Descripción</h3>
                <p className="text-dark-300 text-sm whitespace-pre-wrap">{project.description}</p>
              </div>
            )}

            {/* Invoices summary */}
            {invoices.length > 0 && (
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-dark-400">Facturas</h3>
                  <button onClick={() => setShowInvoiceForm(true)} className="cursor-pointer px-3 py-1.5 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-xs font-medium rounded-lg hover:bg-fizzia-500/30 transition-all">+ Nueva factura</button>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-dark-950 rounded-lg">
                    <p className="text-xs text-dark-500 mb-1">Facturado</p>
                    <p className="text-lg font-bold text-white">{formatMoney(invoices.reduce((s, i) => s + Number(i.total || 0), 0))}</p>
                  </div>
                  <div className="text-center p-3 bg-dark-950 rounded-lg">
                    <p className="text-xs text-dark-500 mb-1">Pagado</p>
                    <p className="text-lg font-bold text-green-400">{formatMoney(payments.reduce((s, p) => s + Number(p.amount || 0), 0))}</p>
                  </div>
                  <div className="text-center p-3 bg-dark-950 rounded-lg">
                    <p className="text-xs text-dark-500 mb-1">Pendiente</p>
                    <p className="text-lg font-bold text-amber-400">{formatMoney(invoices.reduce((s, i) => s + Number(i.total || 0), 0) - payments.reduce((s, p) => s + Number(p.amount || 0), 0))}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-dark-950 rounded-lg">
                      <div>
                        <p className="text-white text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-xs text-dark-500">Vence: {formatDate(inv.due_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{formatMoney(inv.total)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${
                          inv.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {inv.status === 'paid' ? 'Pagada' : inv.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Created date */}
            <p className="text-xs text-dark-600">Creado el {formatDate(project.created_at)}</p>
          </div>
        )}

        {/* Messages tab */}
        {tab === 'mensajes' && (
          <div className="bg-dark-900 border border-dark-800 rounded-xl flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 16rem)' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-dark-500 text-sm">No hay mensajes aún</p></div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_id === myId || msg.is_admin_sender
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-3 rounded-xl text-sm ${isAdmin ? 'bg-fizzia-500/20 text-fizzia-300 rounded-br-sm' : 'bg-dark-800 text-dark-200 rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isAdmin ? 'text-fizzia-500/50' : 'text-dark-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-dark-800 flex gap-2 shrink-0">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 text-sm" placeholder="Escribir mensaje..." />
              <button type="submit" disabled={!newMessage.trim()} className="cursor-pointer px-4 py-2.5 bg-fizzia-500 text-white rounded-lg hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <span className="material-symbols-rounded text-lg">send</span>
              </button>
            </form>
          </div>
        )}

        {/* Files tab */}
        {tab === 'archivos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklist - 2 columns */}
            <div className="lg:col-span-2 bg-dark-900 border border-dark-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Lista de archivos pendientes</h3>
                  <p className="text-xs text-dark-500 mt-0.5">{doneTasks}/{tasks.length} completados</p>
                </div>
                <button onClick={() => setShowTaskForm(!showTaskForm)} className="cursor-pointer px-3 py-1.5 bg-fizzia-500/20 border border-fizzia-500/30 text-fizzia-400 text-xs font-medium rounded-lg hover:bg-fizzia-500/30 transition-all flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm">add</span>
                  Agregar
                </button>
              </div>

              {showTaskForm && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                    className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-600 focus:outline-none focus:border-fizzia-500"
                    placeholder="Nombre del archivo o tarea..."
                  />
                  <button onClick={addTask} disabled={savingTask || !newTaskTitle.trim()} className="cursor-pointer px-3 py-2 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">
                    Agregar
                  </button>
                </div>
              )}

              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-rounded text-dark-600 text-3xl mb-2 block">checklist</span>
                  <p className="text-dark-500 text-sm">No hay tareas pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all group ${
                        task.status === 'done'
                          ? 'bg-dark-950/50 border border-dark-800'
                          : 'bg-dark-950 border border-dark-700'
                      }`}
                    >
                      <button
                        onClick={() => toggleTaskDone(task)}
                        className={`cursor-pointer w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          task.status === 'done'
                            ? 'bg-green-500 border-green-500'
                            : 'border-dark-500 hover:border-fizzia-400'
                        }`}
                      >
                        {task.status === 'done' && (
                          <span className="material-symbols-rounded text-white text-sm">check</span>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.status === 'done' ? 'text-dark-500 line-through' : 'text-white'}`}>
                          {task.title}
                        </p>
                        {task.completed_at && (
                          <p className="text-[10px] text-dark-600 mt-0.5">Completado: {formatDate(task.completed_at)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="cursor-pointer p-1 text-dark-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <span className="material-symbols-rounded text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File requests section */}
              <div className="mt-6 pt-6 border-t border-dark-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-dark-400 font-medium">Solicitar archivos al cliente</span>
                  <button onClick={() => setShowFileRequestForm(!showFileRequestForm)} className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 transition-colors">
                    <span className="material-symbols-rounded text-sm">{showFileRequestForm ? 'close' : 'add'}</span>
                  </button>
                </div>
                {showFileRequestForm && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newFileRequest}
                      onChange={(e) => setNewFileRequest(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFileRequest()}
                      className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-600 focus:outline-none focus:border-fizzia-500"
                      placeholder="Ej: Logo en alta resolución..."
                    />
                    <button onClick={handleCreateFileRequest} disabled={requestSaving || !newFileRequest.trim()} className="cursor-pointer px-3 py-2 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all">
                      Enviar
                    </button>
                  </div>
                )}
                {fileRequests.length > 0 && (
                  <div className="space-y-2">
                    {fileRequests.map(req => (
                      <div key={req.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${req.fulfilled ? 'bg-green-500/10 border border-green-500/20' : 'bg-dark-950 border border-dark-700'}`}>
                        <div className="flex-1 min-w-0 mr-3">
                          <p className={`truncate ${req.fulfilled ? 'text-green-400' : 'text-dark-300'}`}>{req.request_text}</p>
                          <p className="text-[10px] text-dark-500 mt-0.5">{formatDate(req.created_at)}</p>
                        </div>
                        <button onClick={() => handleDeleteFileRequest(req.id)} className="cursor-pointer p-1 text-dark-500 hover:text-red-400 transition-colors shrink-0">
                          <span className="material-symbols-rounded text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded files - 1 column */}
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Archivos subidos</h3>
              <div className="mb-3">
                <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.zip,.rar,.psd,.ai,.fig,.sketch,.mp4,.mov,.svg" />
                <textarea value={fileNote} onChange={(e) => setFileNote(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-fizzia-500 resize-none mb-2" rows={2} placeholder="Nota opcional..." />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="cursor-pointer w-full py-2 bg-fizzia-500/10 border border-fizzia-500/30 text-fizzia-400 text-sm font-medium rounded-lg hover:bg-fizzia-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                  {uploading ? 'Subiendo...' : <><span className="material-symbols-rounded text-sm">cloud_upload</span>Subir archivos</>}
                </button>
              </div>

              {files.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-[10px] text-dark-500 font-medium uppercase tracking-wider">{files.length} archivos</p>
                  {files.map(file => (
                    <div key={file.id} className="flex items-center gap-2 bg-dark-950 border border-dark-800 rounded-lg p-2.5 group">
                      <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center shrink-0"><span className="material-symbols-rounded text-fizzia-400 text-sm">{getFileIcon(file)}</span></div>
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
                <div className="text-center py-8"><p className="text-dark-500 text-sm">No hay archivos</p></div>
              )}
            </div>
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
