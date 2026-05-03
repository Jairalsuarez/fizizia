import { useState } from 'react'
import { useDashboardData } from '../../hooks/useDashboardData'
import { StatusBadge, EmptyState, Modal, Skeleton } from '../../components/ui/'
import { formatMoney, formatDate } from '../../utils/format'
import { deleteLead, convertLeadToClient } from '../../services/adminData'

export function LeadsPage() {
  const { data, loading, refetch } = useDashboardData()
  const [selectedLead, setSelectedLead] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const leads = data?.leads?.filter(l => !['won', 'lost'].includes(l.status)) || []
  const filteredLeads = statusFilter === 'all' ? leads : leads.filter(l => l.status === statusFilter)

  const handleConvert = async () => {
    await convertLeadToClient(selectedLead.id)
    setShowConvertModal(false)
    setSelectedLead(null)
    refetch()
  }

  const handleDelete = async () => {
    await deleteLead(selectedLead.id)
    setShowDeleteModal(false)
    setSelectedLead(null)
    refetch()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Leads Pipeline</h1>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        <div className="w-1/3 flex flex-col">
          <div className="flex gap-2 mb-4 flex-wrap">
            {['all', 'new', 'contacted', 'qualified', 'proposal'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-fizzia-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:text-white'
                }`}
              >
                {status === 'all' ? 'Todos' : status}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)
            ) : filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLead?.id === lead.id
                      ? 'border-fizzia-500 bg-fizzia-500/10'
                      : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium">{lead.full_name}</p>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="text-sm text-dark-400">{lead.email}</p>
                </div>
              ))
            ) : (
              <EmptyState message="No hay leads" />
            )}
          </div>
        </div>

        <div className="flex-1">
          {selectedLead ? (
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-6 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedLead.full_name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="px-3 py-1.5 rounded bg-fizzia-500 text-white text-sm hover:bg-fizzia-600"
                  >
                    Convertir a Cliente
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-3 py-1.5 rounded border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-dark-400">Email</p>
                  <p className="text-white">{selectedLead.email}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Teléfono</p>
                  <p className="text-white">{selectedLead.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Empresa</p>
                  <p className="text-white">{selectedLead.company || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Ciudad</p>
                  <p className="text-white">{selectedLead.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Probabilidad</p>
                  <p className="text-white">{selectedLead.probability || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Presupuesto</p>
                  <p className="text-white">{formatMoney(selectedLead.budget_range || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Siguiente seguimiento</p>
                  <p className="text-white">{selectedLead.next_follow_up_at ? formatDate(selectedLead.next_follow_up_at) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Estado</p>
                  <StatusBadge status={selectedLead.status} />
                </div>
              </div>

              {selectedLead.need_summary && (
                <div className="mb-4">
                  <p className="text-sm text-dark-400 mb-1">Resumen de necesidad</p>
                  <p className="text-white text-sm">{selectedLead.need_summary}</p>
                </div>
              )}

              {selectedLead.notes && (
                <div>
                  <p className="text-sm text-dark-400 mb-1">Notas</p>
                  <p className="text-white text-sm">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dark-700 bg-dark-900 h-full flex items-center justify-center">
              <EmptyState message="Selecciona un lead para ver detalles" />
            </div>
          )}
        </div>
      </div>

      <Modal open={showConvertModal} onClose={() => setShowConvertModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Convertir a Cliente</h3>
          <p className="text-dark-300 mb-4">¿Convertir "{selectedLead?.full_name}" a cliente?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowConvertModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleConvert} className="px-4 py-2 rounded bg-fizzia-500 text-white hover:bg-fizzia-600">Confirmar</button>
          </div>
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Eliminar Lead</h3>
          <p className="text-dark-300 mb-4">¿Eliminar "{selectedLead?.full_name}"?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
