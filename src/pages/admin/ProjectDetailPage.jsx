import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { deleteProjectFile, getAllProjectFiles, uploadProjectFileAdmin } from '../../api/filesApi'
import { getProjectMessages } from '../../api/messagesApi'
import { markAdminProjectMessagesRead, sendAdminMessage, subscribeToAdminMessages } from '../../api/messagesApi'
import { getProjectInvoicesWithPayments, getProjectPayments } from '../../api/paymentsApi'
import { createProjectFileRequest, createProjectTask, deleteProjectFileRequest, deleteProjectTask, getProjectFileRequests, getProjectTasks, updateProject, updateProjectTask } from '../../api/projectsApi'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/ui/Modal'
import { supabase } from '../../services/supabase'
import { formatDate, formatMoney } from '../../utils/format'
import { PROJECT_STATUS, adminProjectStatusOptions, getProjectStatusColor, getProjectStatusLabel, isProjectClosed } from '../../domain/projects'
import { AvatarIcon } from '../../data/avatars.jsx'
import { fetchGitHubCommits, formatCommitTime, getCommitAuthorName, getCommitDate, parseGitHubUrl } from '../../utils/github'
import { getMessageAuthor, getMessageAuthorName, getMessageAvatarId } from '../../utils/messageIdentity'
import { getDeliveryStatus, markMessageFailed, markMessageSent, mergeRealtimeMessage, mergeRealtimeMessages } from '../../utils/messageStatus'
import { sumApprovedPayments } from '../../utils/paymentStatus'
import { readStoredValue, writeStoredValue } from '../../utils/persistedState'
import { useRealtimeProject } from '../../hooks/useRealtimeProjects'

let pendingId = Date.now()
function genId() { return `pending-${pendingId++}` }

function canBeAssignedDeveloper(profile, currentUserId) {
  const role = String(profile?.role || '').toLowerCase()
  return profile?.id === currentUserId || ['developer', 'admin'].includes(role)
}

async function getAssignableProfiles() {
  const rpcResult = await supabase.rpc('get_assignable_project_developers')
  if (!rpcResult.error && Array.isArray(rpcResult.data)) return rpcResult

  return supabase
    .from('profiles')
    .select('id, full_name, first_name, email, avatar_id, role')
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(() => {
    return readStoredValue(`admin-project-tab-${projectId}`, 'general', value => ['general', 'mensajes', 'archivos', 'actividad'].includes(value))
  })
  const [saving, setSaving] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [clientDeadline, setClientDeadline] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [showEditDates, setShowEditDates] = useState(false)
  const [messages, setMessages] = useState([])
  const [messageAuthors, setMessageAuthors] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState(null)
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

  // Developers
  const [developers, setDevelopers] = useState([])
  const [assignedDevelopers, setAssignedDevelopers] = useState([])
  const [selectedDeveloperId, setSelectedDeveloperId] = useState('')
  const [showDeveloperPicker, setShowDeveloperPicker] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [commits, setCommits] = useState([])
  const [commitsLoading, setCommitsLoading] = useState(false)

  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleRealtimeProject = useCallback((updatedProject) => {
    if (!updatedProject) return navigate('/admin/proyectos')
    setProject(prev => prev ? { ...prev, ...updatedProject } : prev)
    if (updatedProject.budget !== undefined) setBudgetValue(String(updatedProject.budget || ''))
    if (updatedProject.final_price !== undefined) setFinalPriceValue(String(updatedProject.final_price || ''))
    if (updatedProject.start_date !== undefined) setStartDate(updatedProject.start_date ? updatedProject.start_date.split('T')[0] : '')
    if (updatedProject.due_date !== undefined) setDueDate(updatedProject.due_date ? updatedProject.due_date.split('T')[0] : '')
    if (updatedProject.client_deadline !== undefined) setClientDeadline(updatedProject.client_deadline ? updatedProject.client_deadline.split('T')[0] : '')
    if (updatedProject.repository_url !== undefined) setRepoUrl(updatedProject.repository_url || '')
  }, [navigate])

  useRealtimeProject(projectId, handleRealtimeProject)

  // Persist tab to localStorage
  useEffect(() => {
    writeStoredValue(`admin-project-tab-${projectId}`, tab)
  }, [projectId, tab])

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
          setClientDeadline(data.client_deadline ? data.client_deadline.split('T')[0] : '')
          setRepoUrl(data.repository_url || '')
          setShowEditDates(!data.start_date && !data.due_date && !data.repository_url)
          const [msgs, f, inv, pay, fileReqs, tasksRes, devsRes, assignedRes] = await Promise.all([
            getProjectMessages(data.id),
            getAllProjectFiles(data.id),
            getProjectInvoicesWithPayments(data.id),
            getProjectPayments(data.id),
            getProjectFileRequests(data.id),
            getProjectTasks(data.id),
            getAssignableProfiles(),
            supabase.from('project_developers').select('developer_id, profiles(id, full_name, email, avatar_id)').eq('project_id', data.id),
          ])
          setMessages(msgs)
          setFiles(f)
          setInvoices(inv)
          setPayments(pay)
          setFileRequests(fileReqs || [])
          setTasks(tasksRes || [])
          const allProfiles = devsRes?.data || []
          const currentUserId = userData?.user?.id
          const currentAdmin = allProfiles.find(p => p.id === currentUserId) || {
            id: currentUserId,
            email: userData?.user?.email,
            full_name: 'Tu',
            role: 'admin',
          }
          if (currentAdmin) setMessageAuthors(prev => ({ ...prev, [currentAdmin.id]: currentAdmin }))
          const assignableProfileMap = new Map()
          allProfiles
            .filter(profile => canBeAssignedDeveloper(profile, currentUserId))
            .forEach(profile => {
              assignableProfileMap.set(profile.id, profile.id === currentUserId ? { ...profile, full_name: profile.full_name || 'Tu' } : profile)
            })
          if (currentAdmin?.id) {
            assignableProfileMap.set(currentAdmin.id, {
              ...currentAdmin,
              full_name: currentAdmin.full_name || 'Tu',
            })
          }
          const assignableProfiles = Array.from(assignableProfileMap.values())
          setDevelopers(assignableProfiles)
          setAssignedDevelopers((assignedRes?.data || []).map(a => {
            const enriched = assignableProfiles.find(profile => profile.id === a.developer_id)
            return enriched || a.profiles
          }).filter(Boolean))
          setInvoiceForm(prev => ({ ...prev, client_id: data.client_id, invoice_number: `FACT-${Date.now()}` }))
        }
      } catch (err) { console.error('Error loading project:', err) }
      finally { setLoading(false) }
    }
    loadProject()
  }, [projectId])

  useEffect(() => {
    if (project && tab === 'mensajes') {
      markAdminProjectMessagesRead(project.id).then(readMessages => {
        if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
      })
      channelRef.current = subscribeToAdminMessages(project.id, (payload) => {
        setMessages(prev => mergeRealtimeMessage(prev, payload))
        if (payload?.sender_id !== myId) {
          markAdminProjectMessagesRead(project.id).then(readMessages => {
            if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
          })
        }
      })
    }
    return () => { if (channelRef.current) channelRef.current.unsubscribe() }
  }, [project, tab, myId])

  useEffect(() => {
    const ids = [...new Set(messages.map(m => m.sender_id).filter(Boolean))]
      .filter(id => !messageAuthors[id])
    if (!ids.length) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, first_name, email, avatar_id, role')
      .in('id', ids)
      .then(({ data }) => {
        if (cancelled) return
        setMessageAuthors(prev => ({
          ...prev,
          ...Object.fromEntries((data || []).map(profile => [profile.id, profile])),
        }))
      })
    return () => { cancelled = true }
  }, [messages, messageAuthors])

  useEffect(() => {
    const repo = project?.repository_url || project?.repo_url || repoUrl
    if (tab !== 'actividad' || !repo) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommitsLoading(true)
    fetchGitHubCommits(repo, 15)
      .then(data => { if (!cancelled) setCommits(data || []) })
      .finally(() => { if (!cancelled) setCommitsLoading(false) })
    return () => { cancelled = true }
  }, [project, repoUrl, tab])

  const scrollMessagesToEnd = (behavior = 'auto') => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' }))
    })
  }

  useEffect(() => {
    if (tab === 'mensajes') scrollMessagesToEnd(messages.length ? 'smooth' : 'auto')
  }, [messages, tab])

  useEffect(() => {
    if (tab === 'mensajes') scrollMessagesToEnd('auto')
  }, [tab])

  const saveDates = async () => {
    setSaving(true)
    await updateProject(project.id, { start_date: startDate || null, due_date: dueDate || null, client_deadline: clientDeadline || null, repository_url: repoUrl || null })
    setSaving(false)
    setShowEditDates(false)
    toast.success('Fechas guardadas')
  }

  const saveBudget = async () => {
    if (!budgetValue || Number(budgetValue) < 0) { toast.error('Presupuesto inválido'); return }
    setSavingBudget(true)
    await updateProject(project.id, { budget: Number(budgetValue) })
    setProject(prev => ({ ...prev, budget: Number(budgetValue) }))
    setSavingBudget(false)
    setShowPriceEdit(false)
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
    const tempId = genId()
    const tempMsg = {
      id: tempId,
      project_id: project.id,
      sender_id: myId,
      content,
      created_at: new Date().toISOString(),
      is_admin_sender: true,
      _status: 'sending',
    }
    setMessages(prev => [...prev, tempMsg])
    try {
      const msg = await sendAdminMessage(project.id, content)
      setMessages(prev => markMessageSent(prev, tempId, msg || {}))
    } catch {
      setMessages(prev => markMessageFailed(prev, tempId))
      toast.error('Error enviando mensaje')
    }
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

  const updateProjectStatus = async (status) => {
    setActing(true)
    await updateProject(project.id, { status })
    toast.success(`Estado cambiado a "${getProjectStatusLabel(status)}"`)
    setProject(prev => ({ ...prev, status }))
    setActing(false)
  }

  const requestStatusChange = async (status) => {
    if (status === project.status || acting) return
    if (status === PROJECT_STATUS.DELIVERED) {
      setPendingStatus(status)
      setStatusChangeModal(true)
      return
    }
    await updateProjectStatus(status)
  }

  const confirmStatusChange = async () => {
    await updateProjectStatus(pendingStatus)
    setStatusChangeModal(false)
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

  // Developer assignment handlers
  const assignDeveloper = async () => {
    if (!selectedDeveloperId) return
    const alreadyAssigned = assignedDevelopers.some(d => d.id === selectedDeveloperId)
    if (alreadyAssigned) { toast.error('Ya está asignado'); return }
    setAssigning(true)
    const { data, error } = await supabase
      .from('project_developers')
      .insert({ project_id: project.id, developer_id: selectedDeveloperId })
      .select()
      .single()
    if (data && !error) {
      const dev = developers.find(d => d.id === selectedDeveloperId)
      setAssignedDevelopers(prev => [...prev, dev])
      setSelectedDeveloperId('')
      setShowDeveloperPicker(false)
      toast.success('Developer asignado')
    } else {
      toast.error('Error al asignar developer')
    }
    setAssigning(false)
  }

  const removeDeveloper = async (devId) => {
    await supabase.from('project_developers').delete().eq('project_id', project.id).eq('developer_id', devId)
    setAssignedDevelopers(prev => prev.filter(d => d.id !== devId))
    setShowDeveloperPicker(true)
    toast.success('Developer removido')
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

  const isSolicitado = project.status === PROJECT_STATUS.REQUESTED
  const isClosed = isProjectClosed(project.status)
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const hasFinalPrice = project.final_price && Number(project.final_price) > 0
  const invoicedTotal = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const approvedPaid = sumApprovedPayments(payments)
  const pendingPaymentTotal = Math.max(invoicedTotal - approvedPaid, 0)

  const tabs = [
    { id: 'general', label: 'General', icon: 'dashboard' },
    { id: 'mensajes', label: 'Mensajes', icon: 'chat' },
    { id: 'archivos', label: 'Archivos', icon: 'folder' },
    { id: 'actividad', label: 'Actividad', icon: 'commit' },
  ]

  const daysUntilDue = dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const daysUntilClientDeadline = clientDeadline ? Math.ceil((new Date(clientDeadline) - new Date()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b border-dark-800/70 bg-dark-950/45 backdrop-blur-sm shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => navigate('/admin')} className="cursor-pointer p-2 text-dark-400 hover:text-white transition-colors shrink-0">
                <span className="material-symbols-rounded">arrow_back</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-dark-400">{project.clients?.name || ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0 ml-4">
              {/* Price in header */}
              <div className="group/price text-right min-w-[9rem]">
                {showPriceEdit ? (
                  <div className="flex items-center justify-end gap-1.5 rounded-xl border border-dark-800 bg-dark-950/80 px-2 py-1.5 shadow-lg shadow-black/10">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hasFinalPrice ? finalPriceValue : budgetValue}
                      onChange={(e) => hasFinalPrice ? setFinalPriceValue(e.target.value) : setBudgetValue(e.target.value)}
                      className="h-8 w-24 rounded-lg border border-dark-700 bg-black/60 px-2.5 text-right text-sm font-semibold text-white outline-none transition-colors focus:border-fizzia-500"
                      autoFocus
                    />
                    <button
                      onClick={hasFinalPrice ? savePrice : saveBudget}
                      disabled={hasFinalPrice ? savingPrice : savingBudget}
                      className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg bg-fizzia-500 text-white hover:bg-fizzia-400 disabled:opacity-50 transition-all"
                      title="Guardar precio"
                    >
                      <span className="material-symbols-rounded text-[18px]">check</span>
                    </button>
                    <button
                      onClick={() => setShowPriceEdit(false)}
                      className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg bg-dark-800 text-dark-300 hover:text-white transition-all"
                      title="Cancelar"
                    >
                      <span className="material-symbols-rounded text-[18px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1.5 rounded-xl px-2 py-1 transition-colors hover:bg-dark-900/70">
                    <button
                      onClick={() => setShowPriceEdit(true)}
                      className="cursor-pointer text-right"
                      title="Editar precio"
                    >
                      <p className="text-[10px] text-dark-500 uppercase tracking-wider font-medium">
                        {hasFinalPrice ? 'Precio final' : 'Presupuesto'}
                      </p>
                      <p className={`text-lg font-bold leading-5 ${hasFinalPrice ? 'text-green-400' : 'text-white'}`}>
                        {hasFinalPrice ? formatMoney(project.final_price) : formatMoney(project.budget || 0)}
                      </p>
                    </button>
                    <button
                      onClick={() => setShowPriceEdit(true)}
                      className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-md text-dark-500 opacity-0 transition-all hover:bg-dark-800 hover:text-white group-hover/price:opacity-100"
                      title="Editar precio"
                    >
                      <span className="material-symbols-rounded text-[15px]">edit</span>
                    </button>
                  </div>
                )}
              </div>
              {/* Action buttons */}
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
      <div className="border-b border-dark-800/70 bg-dark-950/25 shrink-0">
        <div className="px-6">
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        {/* General tab */}
        {tab === 'general' && (
          <div className="space-y-6">
            {/* Status change - visual chips */}
            {!isSolicitado && !isClosed && (
              <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-dark-400">Estado del proyecto</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {adminProjectStatusOptions.map(s => {
                    const isActive = project.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => requestStatusChange(s)}
                        className={`cursor-pointer flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          isActive
                            ? `${getProjectStatusColor(s)} text-white border-transparent shadow-lg`
                            : 'bg-dark-950 border-dark-700 text-dark-300 hover:text-white hover:border-dark-500'
                        }`}
                      >
                        <span className="material-symbols-rounded text-lg">
                          {s === 'preparando' ? 'construction' : s === 'trabajando' ? 'build' : s === 'pausado' ? 'pause_circle' : 'check_circle'}
                        </span>
                        {getProjectStatusLabel(s)}
                        {isActive && <span className="material-symbols-rounded text-sm ml-auto">check</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dates - prominent */}
            <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-fizzia-400">event_note</span>
                  Fechas del proyecto
                </h3>
                <button onClick={() => setShowEditDates(!showEditDates)} className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 transition-colors flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm">{showEditDates ? 'close' : 'edit'}</span>
                  {showEditDates ? 'Cancelar' : 'Editar'}
                </button>
              </div>
              {showEditDates ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-dark-500 mb-1 block">Fecha inicio</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
                    </div>
                    <div>
                      <label className="text-xs text-dark-500 mb-1 block">Fecha entrega</label>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
                    </div>
                    <div>
                      <label className="text-xs text-dark-500 mb-1 block">Fecha límite (cliente)</label>
                      <input type="date" value={clientDeadline} onChange={(e) => setClientDeadline(e.target.value)} className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500" />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Start date */}
                  <div className={`flex items-center gap-2.5 p-3 rounded-lg border ${
                    startDate ? 'bg-dark-950 border-dark-700' : 'bg-dark-950/50 border-dark-800 border-dashed'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      startDate ? 'bg-fizzia-500/20' : 'bg-dark-800'
                    }`}>
                      <span className={`material-symbols-rounded text-base ${startDate ? 'text-fizzia-400' : 'text-dark-600'}`}>calendar_today</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-dark-500 uppercase tracking-wider font-medium">Inicio</p>
                      <p className={`text-xs font-semibold ${startDate ? 'text-white' : 'text-dark-600'}`}>
                        {startDate ? formatDate(startDate) : 'Sin definir'}
                      </p>
                    </div>
                  </div>

                  {/* Due date */}
                  <div className={`flex items-center gap-2.5 p-3 rounded-lg border ${
                    dueDate ? 'bg-dark-950 border-dark-700' : 'bg-dark-950/50 border-dark-800 border-dashed'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      dueDate
                        ? daysUntilDue !== null && daysUntilDue <= 3 ? 'bg-red-500/20' : 'bg-blue-500/20'
                        : 'bg-dark-800'
                    }`}>
                      <span className={`material-symbols-rounded text-base ${
                        dueDate
                          ? daysUntilDue !== null && daysUntilDue <= 3 ? 'text-red-400' : 'text-blue-400'
                          : 'text-dark-600'
                      }`}>event_available</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-dark-500 uppercase tracking-wider font-medium">Entrega</p>
                      <p className={`text-xs font-semibold ${dueDate ? 'text-white' : 'text-dark-600'}`}>
                        {dueDate ? formatDate(dueDate) : 'Sin definir'}
                      </p>
                      {dueDate && daysUntilDue !== null && (
                        <p className={`text-[10px] mt-0.5 ${
                          daysUntilDue <= 0 ? 'text-red-400' : daysUntilDue <= 3 ? 'text-amber-400' : 'text-dark-500'
                        }`}>
                          {daysUntilDue <= 0 ? 'Vencida' : daysUntilDue === 1 ? '1 día restante' : `${daysUntilDue} días restantes`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Client deadline */}
                  <div className={`flex items-center gap-2.5 p-3 rounded-lg border ${
                    clientDeadline ? 'bg-dark-950 border-dark-700' : 'bg-dark-950/50 border-dark-800 border-dashed'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      clientDeadline
                        ? daysUntilClientDeadline !== null && daysUntilClientDeadline <= 3 ? 'bg-amber-500/20' : 'bg-purple-500/20'
                        : 'bg-dark-800'
                    }`}>
                      <span className={`material-symbols-rounded text-base ${
                        clientDeadline
                          ? daysUntilClientDeadline !== null && daysUntilClientDeadline <= 3 ? 'text-amber-400' : 'text-purple-400'
                          : 'text-dark-600'
                      }`}>hourglass_top</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-dark-500 uppercase tracking-wider font-medium">Límite cliente</p>
                      <p className={`text-xs font-semibold ${clientDeadline ? 'text-white' : 'text-dark-600'}`}>
                        {clientDeadline ? formatDate(clientDeadline) : 'Sin definir'}
                      </p>
                      {clientDeadline && daysUntilClientDeadline !== null && (
                        <p className={`text-[10px] mt-0.5 ${
                          daysUntilClientDeadline <= 0 ? 'text-red-400' : daysUntilClientDeadline <= 3 ? 'text-amber-400' : 'text-dark-500'
                        }`}>
                          {daysUntilClientDeadline <= 0 ? 'Vencida' : daysUntilClientDeadline === 1 ? '1 día restante' : `${daysUntilClientDeadline} días restantes`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {repoUrl && (
                <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center gap-2 mt-4 text-sm text-fizzia-400 hover:text-fizzia-300 transition-colors">
                  <span className="material-symbols-rounded text-sm">code</span>
                  Repositorio
                </a>
              )}
            </div>

            {/* Developers assignment */}
            <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-dark-400 flex items-center gap-2">
                  <span className="material-symbols-rounded text-fizzia-400">person_add</span>
                  Developers asignados
                </h3>
                {assignedDevelopers.length > 0 && !showDeveloperPicker && (
                  <button
                    type="button"
                    onClick={() => setShowDeveloperPicker(true)}
                    className="cursor-pointer flex items-center gap-1 text-xs font-medium text-fizzia-400 transition-colors hover:text-fizzia-300"
                  >
                    <span className="material-symbols-rounded text-sm">edit</span>
                    Editar
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {assignedDevelopers.length > 0 && (
                  <div className="space-y-2">
                    {assignedDevelopers.map(dev => (
                      <div key={dev.id} className="flex items-center justify-between p-3 bg-dark-950 rounded-lg border border-dark-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-full overflow-hidden shrink-0">
                            <AvatarIcon id={dev.avatar_id || (dev.id === myId ? '1' : '16')} size={32} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{dev.id === myId ? 'Tu' : (dev.full_name || 'Sin nombre')}</p>
                            <p className="text-xs text-dark-500">{dev.email || ''}</p>
                          </div>
                        </div>
                        <button onClick={() => removeDeveloper(dev.id)} className="cursor-pointer p-1.5 text-dark-500 hover:text-red-400 transition-colors">
                          <span className="material-symbols-rounded text-sm">remove_circle</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(assignedDevelopers.length === 0 || showDeveloperPicker) && (
                  <div className="flex gap-2">
                    <select
                      value={selectedDeveloperId}
                      onChange={(e) => setSelectedDeveloperId(e.target.value)}
                      className="cursor-pointer flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                    >
                      <option value="">Seleccionar developer...</option>
                      {developers
                        .filter(d => !assignedDevelopers.some(ad => ad.id === d.id))
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            {d.id === myId ? 'Tu (admin)' : (d.full_name || d.first_name || 'Developer')}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={assignDeveloper}
                      disabled={assigning || !selectedDeveloperId}
                      className="cursor-pointer px-4 py-2 bg-fizzia-500 text-white text-sm font-medium rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all"
                    >
                      {assigning ? 'Asignando...' : 'Asignar'}
                    </button>
                  </div>
                )}

                {developers.length === 0 && (
                  <p className="text-xs text-dark-500 text-center py-2">No hay developers registrados</p>
                )}
              </div>
            </div>

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
                    <p className="text-lg font-bold text-white">{formatMoney(invoicedTotal)}</p>
                  </div>
                  <div className="text-center p-3 bg-dark-950 rounded-lg">
                    <p className="text-xs text-dark-500 mb-1">Pagado</p>
                    <p className="text-lg font-bold text-green-400">{formatMoney(approvedPaid)}</p>
                  </div>
                  <div className="text-center p-3 bg-dark-950 rounded-lg">
                    <p className="text-xs text-dark-500 mb-1">Pendiente</p>
                    <p className="text-lg font-bold text-amber-400">{formatMoney(pendingPaymentTotal)}</p>
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
          <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-xl bg-dark-900/50 border border-dark-800">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-dark-500 text-sm">No hay mensajes aún</p></div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_id === myId
                  const status = getDeliveryStatus(msg, isAdmin)
                  const author = getMessageAuthor(msg, messageAuthors)
                  const authorName = getMessageAuthorName({ message: msg, isMine: isAdmin, author, clientName: project.clients?.name || 'Cliente' })
                  const avatarId = getMessageAvatarId({ message: msg, isMine: isAdmin, author, currentUser: messageAuthors[myId] })
                  const time = new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                  const showTime = visibleTimeMessageId === msg.id
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      {!isAdmin && (
                        <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                          <AvatarIcon id={avatarId} size={32} />
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`mb-1 flex items-center gap-2 text-[11px] ${isAdmin ? 'justify-end text-fizzia-400' : 'text-dark-400'}`}>
                          <span className="font-medium">{authorName}</span>
                        </div>
                        <div className={`flex items-end gap-1.5 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() => setVisibleTimeMessageId(prev => prev === msg.id ? null : msg.id)}
                            className={`cursor-pointer px-4 py-3 rounded-2xl text-sm text-left shadow-sm ${
                              isAdmin
                                ? status === 'error' ? 'bg-red-500/80 text-white rounded-br-sm'
                                : 'bg-fizzia-500 text-white rounded-br-sm'
                                : 'bg-dark-800 text-dark-100 rounded-bl-sm'
                            }`}
                          >
                            <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                          </button>
                          {isAdmin && (
                            <span className={`mb-1 flex h-4 w-4 items-center justify-center ${status === 'error' ? 'text-red-400' : 'text-dark-500'}`}>
                              {status === 'sending' && (
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              )}
                              {status === 'sent' && <span className="material-symbols-rounded text-[13px]">check</span>}
                              {status === 'read' && <span className="material-symbols-rounded text-[13px] text-sky-400">done_all</span>}
                              {status === 'error' && <span className="material-symbols-rounded text-[13px]">error</span>}
                            </span>
                          )}
                        </div>
                        {showTime && <span className="mt-1 text-[10px] text-dark-500">{time}</span>}
                      </div>
                      {isAdmin && (
                        <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                          <AvatarIcon id={avatarId} size={32} />
                        </div>
                      )}
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

        {tab === 'actividad' && (
          <div className="bg-dark-900/70 border border-dark-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold">Actividad de GitHub</h3>
                <p className="text-dark-500 text-xs mt-1">
                  {parseGitHubUrl(project.repository_url || project.repo_url || repoUrl)
                    ? 'Commits recientes del repositorio configurado'
                    : 'Configura un repositorio de GitHub para ver cambios'}
                </p>
              </div>
              {(project.repository_url || project.repo_url || repoUrl) && (
                <a
                  href={project.repository_url || project.repo_url || repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer text-fizzia-400 hover:text-fizzia-300 text-sm font-medium"
                >
                  Abrir repo
                </a>
              )}
            </div>
            {commitsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 rounded-xl bg-dark-800 animate-pulse" />
                ))}
              </div>
            ) : commits.length ? (
              <div className="space-y-3">
                {commits.map(commit => (
                  <a
                    key={commit.sha}
                    href={commit.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer flex items-start gap-3 rounded-xl border border-dark-800 bg-dark-950/70 p-4 transition-all hover:border-fizzia-500/40 hover:bg-dark-950"
                  >
                    <div className="w-8 h-8 rounded-full border border-dark-700 bg-dark-800 overflow-hidden flex items-center justify-center shrink-0">
                      {commit.author?.avatar_url ? (
                        <img src={commit.author.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="material-symbols-rounded text-fizzia-400 text-sm">terminal</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{commit.commit?.message?.split('\n')[0]}</p>
                      <p className="text-dark-500 text-xs mt-1">
                        {getCommitAuthorName(commit)} · {formatCommitTime(getCommitDate(commit))}
                      </p>
                    </div>
                    <code className="cursor-pointer text-xs text-fizzia-400 hover:text-fizzia-300 font-mono shrink-0">{commit.sha?.slice(0, 7)}</code>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-rounded text-dark-600 text-4xl">commit</span>
                <p className="text-dark-400 text-sm mt-2">No hay commits disponibles</p>
              </div>
            )}
          </div>
        )}

        {/* Files tab */}
        {tab === 'archivos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklist - 2 columns */}
            <div className="lg:col-span-2">
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
            <div className="">
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
        <p className="text-dark-300 text-sm mb-4">¿Cambiar estado de <span className="text-white font-medium">{project.name}</span> a <span className="text-fizzia-400 font-medium">{getProjectStatusLabel(pendingStatus)}</span>?</p>
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
