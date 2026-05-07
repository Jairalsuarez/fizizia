import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../features/auth/authContext'
import { formatDate, formatMoney } from '../../utils/format'
import { useToast } from '../../components/Toast'
import { approvePayment, getAllPayments, rejectPayment } from '../../api/paymentsApi'

export function PaymentsPage() {
  const { session } = useAuth()
  const toast = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [proofUrl, setProofUrl] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getAllPayments()
      setPayments(all || [])
    } catch {
      toast.error('Error cargando pagos')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const openPaymentDetail = async (payment) => {
    setSelectedPayment(payment)
    setRejectionReason('')
    setProofUrl(payment.proofUrl || null)
  }

  const closePaymentDetail = () => {
    setSelectedPayment(null)
    setProofUrl(null)
    setRejectionReason('')
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadPayments()
  }, [filter, loadPayments])
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = payments.filter(p => {
    if (filter === 'pending') return p.admin_status === 'pending'
    if (filter === 'approved') return p.admin_status === 'approved'
    if (filter === 'rejected') return p.admin_status === 'rejected'
    return true
  })

  const handleApprove = async () => {
    if (!selectedPayment || processing) return
    setProcessing(true)
    try {
       await approvePayment(selectedPayment.id, session?.user?.id)
      toast.success('Pago aprobado')
      closePaymentDetail()
      loadPayments()
    } catch {
      toast.error('Error aprobando pago')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPayment || processing) return
    setProcessing(true)
    try {
       await rejectPayment(selectedPayment.id, session?.user?.id, rejectionReason || 'Sin motivo especificado')
      toast.success('Pago rechazado')
      closePaymentDetail()
      loadPayments()
    } catch {
      toast.error('Error rechazando pago')
    } finally {
      setProcessing(false)
    }
  }

  const getMethodName = (method) => {
    if (method === 'paypal') return 'PayPal'
    if (method === 'deposit') return 'Depósito'
    if (method === 'transfer') return 'Transferencia'
    return method || 'N/A'
  }

  const getMethodIcon = (method) => {
    if (method === 'paypal') return 'paypal'
    return 'account_balance'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pagos de clientes</h1>
          <p className="text-dark-400 text-sm mt-1">Revisa y aprueba los pagos recibidos</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-dark-900/50 border border-dark-800 rounded-xl p-1 w-fit">
        {[
          { key: 'pending', label: 'Pendientes', count: payments.filter(p => p.admin_status === 'pending').length },
          { key: 'approved', label: 'Aprobados', count: payments.filter(p => p.admin_status === 'approved').length },
          { key: 'rejected', label: 'Rechazados', count: payments.filter(p => p.admin_status === 'rejected').length },
          { key: 'all', label: 'Todos', count: payments.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-medium cursor-pointer transition-all ${
              filter === tab.key
                ? 'bg-fizzia-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? 'bg-white/20' : 'bg-dark-800'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Payments list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-dark-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-dark-900/50 border border-dark-800 rounded-xl">
          <span className="material-symbols-rounded text-dark-600 text-4xl mb-2 block">payments</span>
          <p className="text-dark-500 text-sm">No hay pagos {filter === 'all' ? '' : 'en esta categoría'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => openPaymentDetail(p)}
              className="cursor-pointer w-full flex items-center justify-between p-4 bg-dark-900/50 border border-dark-800 rounded-xl hover:border-dark-700 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  p.method === 'paypal' ? 'bg-blue-600/20' : 'bg-green-600/20'
                }`}>
                  <span className={`material-symbols-rounded text-lg ${
                    p.method === 'paypal' ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {getMethodIcon(p.method)}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {p.clients?.name || 'Cliente sin nombre'}
                  </p>
                  <p className="text-dark-400 text-xs">
                    {p.projects?.name || 'Proyecto eliminado'}
                  </p>
                  <p className="text-dark-500 text-xs mt-0.5">
                    {getMethodName(p.method)} · {formatDate(p.paid_at || p.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{formatMoney(p.amount)}</p>
                {(p.projects?.final_price || p.projects?.budget) && (
                  <p className="text-dark-500 text-xs">
                    Resta: {formatMoney(Number(p.projects.final_price || p.projects.budget) - (Number(p.amount) || 0))}
                  </p>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${
                  p.admin_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  p.admin_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {p.admin_status === 'approved' ? 'Aprobado' :
                   p.admin_status === 'rejected' ? 'Rechazado' :
                   'Pendiente'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Payment detail modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closePaymentDetail}>
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-dark-700">
              <h3 className="text-lg font-bold text-white">Detalle del pago</h3>
              <button onClick={closePaymentDetail} className="cursor-pointer text-dark-400 hover:text-white">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Client & Project */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 mb-1">Cliente</p>
                  <p className="text-white text-sm font-medium">{selectedPayment.clients?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-1">Proyecto</p>
                  <p className="text-white text-sm font-medium">{selectedPayment.projects?.name || 'N/A'}</p>
                </div>
              </div>

              {/* Payment info */}
              <div className="bg-dark-950 border border-dark-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-500">Método</span>
                  <span className="text-white text-sm font-medium">{getMethodName(selectedPayment.method)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-500">Monto</span>
                  <span className="text-white text-sm font-semibold">{formatMoney(selectedPayment.amount)}</span>
                </div>
                {selectedPayment.project_id && (selectedPayment.projects?.final_price || selectedPayment.projects?.budget) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">Precio proyecto</span>
                    <span className="text-white text-sm">{formatMoney(selectedPayment.projects.final_price || selectedPayment.projects.budget)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-500">Fecha</span>
                  <span className="text-white text-sm">{formatDate(selectedPayment.paid_at || selectedPayment.created_at)}</span>
                </div>
                {selectedPayment.account_holder_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">Titular cuenta</span>
                    <span className="text-white text-sm">{selectedPayment.account_holder_name}</span>
                  </div>
                )}
                {selectedPayment.account_cedula && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">Cédula</span>
                    <span className="text-white text-sm font-mono">{selectedPayment.account_cedula}</span>
                  </div>
                )}
                {selectedPayment.reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">Referencia</span>
                    <span className="text-white text-sm">{selectedPayment.reference}</span>
                  </div>
                )}
                {selectedPayment.admin_rejection_reason && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500">Motivo rechazo</span>
                    <span className="text-red-400 text-sm">{selectedPayment.admin_rejection_reason}</span>
                  </div>
                )}
              </div>

              {/* Proof image */}
              {selectedPayment.proof_url && (
                <div>
                  <p className="text-xs text-dark-500 mb-2">Comprobante</p>
                  <button
                    onClick={() => window.open(proofUrl, '_blank')}
                    className="cursor-pointer w-full flex items-center justify-center gap-2 py-4 bg-dark-950 border border-dark-700 rounded-xl hover:border-fizzia-500/50 transition-all group"
                  >
                    <span className="material-symbols-rounded text-fizzia-400 group-hover:scale-110 transition-transform">image</span>
                    <span className="text-fizzia-400 text-sm font-medium">Ver Comprobante</span>
                  </button>
                </div>
              )}

              {/* Actions for pending */}
              {selectedPayment.admin_status === 'pending' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs text-dark-500 mb-1">Motivo de rechazo (opcional)</label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
                      placeholder="Ej: El comprobante no es legible"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="cursor-pointer flex-1 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/20 disabled:opacity-50 transition-all"
                    >
                      {processing ? 'Procesando...' : 'Rechazar'}
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="cursor-pointer flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-400 disabled:opacity-50 transition-all"
                    >
                      {processing ? 'Procesando...' : 'Aprobar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
