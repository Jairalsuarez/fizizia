import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProjectFiles, uploadProjectFile, getProjectMessages, sendProjectMessage, subscribeToMessages, getProjectFileRequests, getProjectInvoices, getProjectDirectPayments, createClientPayment, uploadPaymentProof } from '../../services/clientData'
import { formatDate, formatMoney } from '../../utils/format'
import { useToast } from '../../components/Toast'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../features/auth/authContext'
import { loadScript } from '@paypal/paypal-js'

const phases = [
  { key: 'solicitado', label: 'Solicitado', textColor: 'text-fizzia-400' },
  { key: 'preparando', label: 'Preparando', textColor: 'text-purple-400' },
  { key: 'trabajando', label: 'Trabajando', textColor: 'text-blue-400' },
  { key: 'pausado', label: 'Pausado', textColor: 'text-yellow-400' },
  { key: 'entregado', label: 'Entregado', textColor: 'text-green-400' },
  { key: 'cancelado', label: 'Cancelado', textColor: 'text-red-400' },
]

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { session } = useAuth()
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [fileRequests, setFileRequests] = useState([])
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState({ name: '', description: '', budget: '', repo_url: '', live_url: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileNote, setFileNote] = useState('')
  const [fulfillingRequestId, setFulfillingRequestId] = useState(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  const [paymentMethod, setPaymentMethod] = useState(null)
  const [paymentStep, setPaymentStep] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [transferType, setTransferType] = useState('transfer')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountCedula, setAccountCedula] = useState('')
  const [savePaymentDetails, setSavePaymentDetails] = useState(false)
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [paypalProcessing, setPaypalProcessing] = useState(false)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const proofInputRef = useRef(null)

  const projectTotal = project?.final_price || project?.budget || 0
  const pending = projectTotal - payments.reduce((s, p) => s + Number(p.amount || 0), 0)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = localStorage.getItem('fizzia_payment_details')
    if (saved) {
      try {
        const d = JSON.parse(saved)
        if (d.accountHolderName) setAccountHolderName(d.accountHolderName)
        if (d.accountCedula) setAccountCedula(d.accountCedula)
      } catch {
        // Ignore parse errors
      }
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const canEdit = project?.status === 'solicitado'

  const capturePayPalOrder = async (orderId) => {
    setPaypalProcessing(true)
    try {
      const paypal = await loadScript({ 'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID, currency: 'USD' })
      const details = await paypal.Buttons.captureOrder(orderId)
      const amount = Number(details.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0)
      const transactionId = details.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId
      const savedAmount = Number(sessionStorage.getItem('fizzia_paypal_amount') || 0)
      const finalAmount = amount || savedAmount
      sessionStorage.removeItem('fizzia_paypal_amount')
      const { data: paymentData, error } = await createClientPayment({
        invoice_id: invoices[0]?.id,
        project_id: projectId,
        amount: finalAmount,
        currency: 'USD',
        method: 'paypal',
        reference: transactionId,
        paid_at: new Date().toISOString(),
        admin_status: 'approved',
      })
      if (error) throw error
      setPayments(prev => [{ ...paymentData, invoice_number: invoices[0]?.invoice_number }, ...prev])
      toast.success('Pago verificado exitosamente')
    } catch (err) {
      console.error('PayPal capture error:', err)
      toast.error(err.message || 'Error verificando pago con PayPal')
    } finally {
      setPaypalProcessing(false)
    }
  }

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

        const [filesRes, msgsRes, fileReqsRes, invoicesRes, directPaymentsRes] = await Promise.all([
          getProjectFiles(projectId),
          getProjectMessages(projectId),
          getProjectFileRequests(projectId),
          getProjectInvoices(projectId),
          getProjectDirectPayments(projectId),
        ])
        setFiles(filesRes || [])
        setMessages(msgsRes || [])
        setFileRequests(fileReqsRes || [])
        setInvoices(invoicesRes || [])
        const invoicePayments = (invoicesRes || []).flatMap(inv => (inv.payments || []).map(p => ({ ...p, invoice_number: inv.invoice_number })))
        const directPayments = (directPaymentsRes || []).map(p => ({ ...p, invoice_number: '' }))
        const allPayments = [...invoicePayments, ...directPayments].sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at))
        setPayments(allPayments)
      } catch (err) {
        console.error('Error loading project:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId, navigate])

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('token')
    const paypalApproved = params.get('approved')
    if (paypalApproved === 'true' && orderId) {
      capturePayPalOrder(orderId)
    } else if (paypalApproved === 'false') {
      toast.info('Pago cancelado')
      setPaypalProcessing(false)
    }
    if (params.has('token') || params.has('approved')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (project && activeTab === 'mensajes') {
      channelRef.current = subscribeToMessages(project.id, (payload) => setMessages(prev => [...prev, payload]))
    }
    return () => { if (channelRef.current) channelRef.current.unsubscribe() }
  }, [project, activeTab])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const createPayPalOrder = async () => {
    const amount = paymentAmount ? Number(paymentAmount) : pending
    if (amount <= 0 || amount > pending) { toast.error('Monto inválido'); return }
    setPaypalProcessing(true)
    try {
      if (!import.meta.env.VITE_PAYPAL_CLIENT_ID) throw new Error('PayPal no configurado')
      const paypal = await loadScript({ 'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID, currency: 'USD' })
      const order = await paypal.Buttons.createOrder({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount.toFixed(2) },
          description: `Pago proyecto: ${project.name}`,
        }],
      })
      const approveUrl = order.links?.find(l => l.rel === 'approve')?.href
      if (approveUrl) {
        sessionStorage.setItem('fizzia_paypal_amount', String(amount))
        window.location.href = approveUrl
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al iniciar pago con PayPal')
      setPaypalProcessing(false)
    }
  }

  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method)
    setPaymentStep(1)
    setPaymentSuccess(false)
    if (method === 'paypal') {
      setPaymentAmount(pending > 0 ? String(pending.toFixed(2)) : '')
    }
  }

  const handleTransferContinue = () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) { toast.error('Ingresa un monto válido'); return }
    if (Number(paymentAmount) > pending) { toast.error('El monto excede lo pendiente'); return }
    setPaymentStep(2)
  }

  const handleTransferDetails = () => {
    const required = transferType === 'transfer' ? accountHolderName : accountCedula
    if (!required) { toast.error(transferType === 'transfer' ? 'Ingresa el nombre del titular' : 'Ingresa tu cédula'); return }
    if (savePaymentDetails) {
      localStorage.setItem('fizzia_payment_details', JSON.stringify({
        accountHolderName: transferType === 'transfer' ? accountHolderName : '',
        accountCedula: transferType === 'transfer' ? '' : accountCedula,
      }))
    }
    setPaymentStep(3)
  }

  const handleProofFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('El archivo no debe superar 10MB'); return }
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setProofPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmitTransferPayment = async () => {
    if (!proofFile) { toast.error('Sube el comprobante'); return }
    setPaymentSubmitting(true)
    try {
      const { data: proofUrl, error: uploadErr } = await uploadPaymentProof(proofFile)
      if (uploadErr) throw uploadErr
      const { data, error } = await createClientPayment({
        invoice_id: invoices[0]?.id || null,
        project_id: projectId,
        amount: Number(paymentAmount),
        currency: 'USD',
        method: transferType === 'transfer' ? 'transfer' : 'deposit',
        account_holder_name: transferType === 'transfer' ? accountHolderName : null,
        account_cedula: transferType === 'transfer' ? null : accountCedula,
        proof_url: proofUrl,
        reference: `${transferType === 'transfer' ? 'Transferencia' : 'Depósito'} - ${accountHolderName || accountCedula}`,
        paid_at: new Date().toISOString(),
        admin_status: 'pending',
      })
      if (error) throw error
      setPayments(prev => [{ ...data, invoice_number: invoices[0]?.invoice_number || '' }, ...prev])
      setPaymentSubmitting(false)
      toast.success('Comprobante enviado, pendiente de verificación')
      setPaymentStep(4)
      setPaymentSuccess(true)
    } catch (err) {
      console.error('Payment error:', err)
      toast.error(err.message || 'Error al registrar el pago')
      setPaymentSubmitting(false)
    }
  }

  const resetPaymentForm = () => {
    setPaymentMethod(null)
    setPaymentStep(0)
    setPaymentAmount('')
    setAccountHolderName('')
    setAccountCedula('')
    setProofFile(null)
    setProofPreview(null)
    setPaymentSuccess(false)
    setPaypalProcessing(false)
    if (proofInputRef.current) proofInputRef.current.value = ''
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !project) return
    const content = newMessage.trim()
    setNewMessage('')
    try { await sendProjectMessage(project.id, content) } catch { toast.error('Error enviando mensaje') }
  }

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
        if (fulfillingRequestId) {
          const { fulfillFileRequest } = await import('../../services/clientData')
          await fulfillFileRequest(fulfillingRequestId, result.data.id)
          setFileRequests(prev => prev.map(r => r.id === fulfillingRequestId ? { ...r, fulfilled: true } : r))
          setFulfillingRequestId(null)
          toast.success('Archivo enviado para la solicitud')
        }
      }
    }
    setUploading(false)
    setFileNote('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!fulfillingRequestId) {
      toast.success(selectedFiles.length > 1 ? `${selectedFiles.length} archivos subidos` : 'Archivo subido')
    }
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

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900/50 border border-dark-800 rounded-xl p-1">
        {[
          { key: 'info', label: 'Detalles' },
          { key: 'mensajes', label: 'Mensajes' },
          { key: 'pagos', label: 'Pagos' },
          { key: 'files', label: 'Archivos' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); if (tab.key !== 'pagos') resetPaymentForm() }}
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
            {(project.final_price || project.budget) && (
              <div>
                <p className="text-xs text-dark-500 mb-1">{project.final_price ? 'Precio' : 'Presupuesto'}</p>
                <p className="text-white font-semibold">{formatMoney(project.final_price || project.budget)}</p>
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

      {activeTab === 'mensajes' && (
        <div className="flex flex-col bg-dark-900/50 border border-dark-800 rounded-xl" style={{ height: 'calc(100vh - 14rem)' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full"><p className="text-dark-500 text-sm">No hay mensajes aún</p></div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === session?.user?.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${isMine ? 'bg-fizzia-500/20 text-fizzia-300 rounded-br-sm' : 'bg-dark-800 text-dark-200 rounded-bl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-fizzia-500/50' : 'text-dark-500'}`}>
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
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 text-sm" placeholder="Escribir mensaje..." />
            <button type="submit" disabled={!newMessage.trim()} className="cursor-pointer px-4 py-2.5 bg-fizzia-500 text-white rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <span className="material-symbols-rounded text-lg">send</span>
            </button>
          </form>
        </div>
      )}

      {activeTab === 'pagos' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4 text-center">
              <p className="text-xs text-dark-500 mb-1">{project.final_price ? 'Precio' : 'Presupuesto'}</p>
              <p className="text-lg font-bold text-white">{formatMoney(projectTotal)}</p>
            </div>
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4 text-center">
              <p className="text-xs text-dark-500 mb-1">Pagado</p>
              <p className="text-lg font-bold text-green-400">{formatMoney(payments.reduce((s, p) => s + Number(p.amount || 0), 0))}</p>
            </div>
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4 text-center">
              <p className="text-xs text-dark-500 mb-1">Pendiente</p>
              <p className="text-lg font-bold text-amber-400">{formatMoney(pending)}</p>
            </div>
          </div>

          {/* Payment flow */}
          {pending > 0 && !paymentSuccess && (
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
              {/* Step 0: Method selection */}
              {paymentStep === 0 && (
                <>
                  <h3 className="text-white font-semibold mb-4">Método de pago</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSelectPaymentMethod('paypal')}
                      className="cursor-pointer flex items-center gap-3 p-4 rounded-xl border border-dark-700 bg-dark-950 hover:border-dark-600 transition-all text-left"
                    >
                      <div className="w-16 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        <img src="/Logo metodos de pagos/Paypal_2014_logo.png" alt="PayPal" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">PayPal</p>
                        <p className="text-dark-400 text-xs">Pago rápido y seguro</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSelectPaymentMethod('transfer')}
                      className="cursor-pointer flex items-center gap-3 p-4 rounded-xl border border-dark-700 bg-dark-950 hover:border-dark-600 transition-all text-left"
                    >
                      <div className="w-16 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        <img src="/Logo metodos de pagos/Banco_Pichincha_nuevo.png" alt="Banco Pichincha" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Transferencia / Depósito</p>
                        <p className="text-dark-400 text-xs">Datos bancarios</p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* PayPal flow */}
              {paymentMethod === 'paypal' && paymentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Pagar con PayPal</h3>
                    <button onClick={resetPaymentForm} className="cursor-pointer text-dark-400 hover:text-white text-sm">
                      <span className="material-symbols-rounded text-lg">close</span>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1.5">Monto a pagar (USD)</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                      placeholder="0.00"
                      max={pending}
                      step="0.01"
                    />
                    <p className="text-dark-500 text-xs mt-1">Pendiente: {formatMoney(pending)}</p>
                  </div>
                  <button
                    onClick={createPayPalOrder}
                    disabled={paypalProcessing || !paymentAmount}
                    className="cursor-pointer w-full py-3 bg-[#0070BA] text-white text-sm font-semibold rounded-lg hover:bg-[#005ea6] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {paypalProcessing ? (
                      <>
                        <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span>
                        Redirigiendo...
                      </>
                    ) : (
                      <>
                        <img src="/Logo metodos de pagos/Paypal_2014_logo.png" alt="PayPal" className="h-4 object-contain" />
                        Continuar con PayPal
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Transfer/Deposit flow */}
              {paymentMethod === 'transfer' && paymentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Transferencia / Depósito</h3>
                    <button onClick={resetPaymentForm} className="cursor-pointer text-dark-400 hover:text-white text-sm">
                      <span className="material-symbols-rounded text-lg">close</span>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1.5">Monto a pagar (USD)</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                      placeholder="0.00"
                      max={pending}
                      step="0.01"
                    />
                    <p className="text-dark-500 text-xs mt-1">Pendiente: {formatMoney(pending)}</p>
                  </div>
                  <button
                    onClick={handleTransferContinue}
                    className="cursor-pointer w-full py-3 bg-fizzia-500 text-white text-sm font-semibold rounded-lg hover:bg-fizzia-400 transition-all"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {/* Transfer/Deposit Step 2: Account details */}
              {paymentMethod === 'transfer' && paymentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Datos de tu pago</h3>
                    <button onClick={() => setPaymentStep(1)} className="cursor-pointer text-dark-400 hover:text-white text-sm">
                      <span className="material-symbols-rounded text-lg">arrow_back</span>
                    </button>
                  </div>

                  {/* Transfer type toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTransferType('transfer')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${transferType === 'transfer' ? 'bg-fizzia-500 text-white' : 'bg-dark-950 text-dark-400 border border-dark-700 hover:text-white'}`}
                    >
                      Transferencia
                    </button>
                    <button
                      onClick={() => setTransferType('deposit')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${transferType === 'deposit' ? 'bg-fizzia-500 text-white' : 'bg-dark-950 text-dark-400 border border-dark-700 hover:text-white'}`}
                    >
                      Depósito
                    </button>
                  </div>

                  {/* Account details */}
                  {transferType === 'transfer' ? (
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">Nombre del titular de la cuenta</label>
                      <input
                        type="text"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                        placeholder="Nombre completo"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">Número de cédula de quien deposita</label>
                      <input
                        type="text"
                        value={accountCedula}
                        onChange={(e) => setAccountCedula(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                        placeholder="Ej: 1234567890"
                      />
                    </div>
                  )}

                  {/* Save details */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savePaymentDetails}
                      onChange={(e) => setSavePaymentDetails(e.target.checked)}
                      className="w-4 h-4 rounded border-dark-600 bg-dark-950 text-fizzia-500 focus:ring-fizzia-500"
                    />
                    <span className="text-sm text-dark-300">Guardar estos datos para futuros pagos</span>
                  </label>

                  <button
                    onClick={handleTransferDetails}
                    disabled={
                      (transferType === 'transfer' && !accountHolderName.trim()) ||
                      (transferType === 'deposit' && !accountCedula.trim())
                    }
                    className="cursor-pointer w-full py-3 bg-fizzia-500 text-white text-sm font-semibold rounded-lg hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {/* Transfer/Deposit Step 3: Bank info + Upload proof */}
              {paymentMethod === 'transfer' && paymentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Datos bancarios</h3>
                    <button onClick={() => setPaymentStep(2)} className="cursor-pointer text-dark-400 hover:text-white text-sm">
                      <span className="material-symbols-rounded text-lg">arrow_back</span>
                    </button>
                  </div>

                  {/* Bank details */}
                  <div className="bg-dark-950 border border-dark-700 rounded-xl p-4 space-y-2">
                    <p className="text-white text-sm font-medium mb-2">Realiza el pago a esta cuenta</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-500">Banco</span>
                      <span className="text-white text-sm font-medium">Banco del Pichincha</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-500">Titular</span>
                      <span className="text-white text-sm font-medium">Jordan Jair Suarez Alcivar</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-500">Cédula</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-mono">1208478378</span>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText('1208478378'); toast.success('Cédula copiada') }}
                          className="cursor-pointer p-1 rounded hover:bg-dark-700 transition-colors"
                        >
                          <span className="material-symbols-rounded text-dark-400 text-base">content_copy</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-500">Cuenta</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-mono">2210323937</span>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText('2210323937'); toast.success('Cuenta copiada') }}
                          className="cursor-pointer p-1 rounded hover:bg-dark-700 transition-colors"
                        >
                          <span className="material-symbols-rounded text-dark-400 text-base">content_copy</span>
                        </button>
                      </div>
                    </div>
                    {transferType === 'transfer' && accountHolderName && (
                      <div className="flex items-center justify-between pt-2 border-t border-dark-700">
                        <span className="text-xs text-dark-500">Tu nombre</span>
                        <span className="text-white text-sm">{accountHolderName}</span>
                      </div>
                    )}
                    {transferType === 'deposit' && accountCedula && (
                      <div className="flex items-center justify-between pt-2 border-t border-dark-700">
                        <span className="text-xs text-dark-500">Tu cédula</span>
                        <span className="text-white text-sm font-mono">{accountCedula}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-dark-400 text-sm text-center">Sube el comprobante de tu pago</p>

                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleProofFileSelect}
                    className="hidden"
                    capture="environment"
                  />

                  {!proofPreview ? (
                    <button
                      onClick={() => proofInputRef.current?.click()}
                      className="cursor-pointer w-full py-12 border-2 border-dashed border-dark-600 rounded-xl text-dark-400 hover:text-white hover:border-dark-500 transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-rounded text-4xl">camera_alt</span>
                      <p className="text-sm font-medium">Tomar foto o subir comprobante</p>
                      <p className="text-xs text-dark-500">JPG, PNG o PDF (máx 10MB)</p>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-dark-700 bg-dark-950">
                        {proofFile?.type?.includes('pdf') ? (
                          <div className="p-8 flex flex-col items-center gap-2">
                            <span className="material-symbols-rounded text-6xl text-dark-400">picture_as_pdf</span>
                            <p className="text-white text-sm">{proofFile.name}</p>
                          </div>
                        ) : (
                          <img src={proofPreview} alt="Comprobante" className="w-full h-48 object-contain bg-dark-950" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setProofFile(null); setProofPreview(null); proofInputRef.current?.click() }}
                          className="cursor-pointer flex-1 py-2.5 bg-dark-800 text-white text-sm font-medium rounded-lg hover:bg-dark-700 transition-all"
                        >
                          Cambiar
                        </button>
                        <button
                          onClick={handleSubmitTransferPayment}
                          disabled={paymentSubmitting}
                          className="cursor-pointer flex-1 py-2.5 bg-fizzia-500 text-white text-sm font-semibold rounded-lg hover:bg-fizzia-400 disabled:opacity-50 transition-all"
                        >
                          {paymentSubmitting ? 'Enviando...' : 'Enviar comprobante'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transfer/Deposit Step 4: Waiting confirmation */}
              {paymentMethod === 'transfer' && paymentStep === 4 && paymentSuccess && (
                <div className="py-8 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="material-symbols-rounded text-amber-400 text-3xl">hourglass_top</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Comprobante enviado</h3>
                  <p className="text-dark-400 text-sm max-w-xs">Espera a que confirmemos tu pago. Te notificaremos cuando esté verificado.</p>
                  <button
                    onClick={resetPaymentForm}
                    className="cursor-pointer px-6 py-2.5 bg-dark-800 text-white text-sm font-medium rounded-lg hover:bg-dark-700 transition-all"
                  >
                    Volver a pagos
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Payment success for PayPal (redirect back) */}
          {paymentMethod === 'paypal' && paypalProcessing && (
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
              <div className="py-8 flex flex-col items-center text-center space-y-4">
                <span className="material-symbols-rounded text-4xl text-fizzia-400 animate-spin">progress_activity</span>
                <h3 className="text-lg font-bold text-white">Verificando tu pago</h3>
                <p className="text-dark-400 text-sm">Estamos confirmando tu pago con PayPal...</p>
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Historial de pagos</h3>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-rounded text-dark-600 text-3xl mb-2 block">payments</span>
                <p className="text-dark-500 text-sm">No hay pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-dark-950 border border-dark-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${p.method === 'paypal' ? 'bg-white' : 'bg-green-600/20'}`}>
                        {p.method === 'paypal' ? (
                          <img src="/Logo metodos de pagos/Paypal_2014_logo.png" alt="PayPal" className="w-full h-full object-contain" />
                        ) : (
                          <span className="material-symbols-rounded text-green-400 text-sm">account_balance</span>
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{p.method === 'paypal' ? 'PayPal' : p.method === 'deposit' ? 'Depósito' : 'Transferencia'}</p>
                        <p className="text-dark-500 text-xs">{formatDate(p.paid_at)}{p.invoice_number ? ` · ${p.invoice_number}` : ''}</p>
                        {p.reference && <p className="text-dark-600 text-xs">Ref: {p.reference}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">{formatMoney(p.amount)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        p.admin_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        p.admin_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {p.admin_status === 'approved' ? 'Verificado' :
                         p.admin_status === 'rejected' ? 'Rechazado' :
                         'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* File requests from admin */}
          {fileRequests.length > 0 && (
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded text-fizzia-400 text-lg">assignment_turned_in</span>
                Archivos solicitados por Fizzia
              </h3>
              <div className="space-y-2">
                {fileRequests.map(req => (
                  <div key={req.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${req.fulfilled ? 'bg-green-500/10 border border-green-500/20' : 'bg-dark-950 border border-dark-700'}`}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className={`truncate ${req.fulfilled ? 'text-green-400' : 'text-dark-200'}`}>{req.request_text}</p>
                      <p className="text-xs text-dark-500 mt-0.5">{formatDate(req.created_at)}</p>
                    </div>
                    {req.fulfilled ? (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-medium shrink-0">Enviado</span>
                    ) : (
                      <button
                        onClick={() => { setFulfillingRequestId(req.id); fileInputRef.current?.click() }}
                        className="cursor-pointer px-3 py-1.5 bg-fizzia-500 text-white text-xs font-medium rounded-lg hover:bg-fizzia-400 transition-all shrink-0"
                      >
                        Enviar archivo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
