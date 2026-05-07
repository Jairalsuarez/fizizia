import { useState } from 'react'
import { Button, StatusBadge, Modal } from '../../components/ui/'
import { formatMoney, formatDate } from '../../utils/format'
import { updateLeadStatus, deleteLead, convertLeadToClient } from '../../api/leadsApi'

export default function LeadDetail({ lead, onUpdate }) {
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [newStatus, setNewStatus] = useState(lead?.status || 'new')

  if (!lead) return null

  const handleStatusUpdate = async () => {
    await updateLeadStatus(lead.id, newStatus)
    onUpdate?.()
  }

  const handleConvert = async () => {
    await convertLeadToClient(lead.id)
    setShowConvertModal(false)
    onUpdate?.()
  }

  const handleDelete = async () => {
    await deleteLead(lead.id)
    setShowDeleteModal(false)
    onUpdate?.()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{lead.full_name}</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowConvertModal(true)} size="sm">Convertir a Cliente</Button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 rounded border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-dark-400">Email</p>
          <p className="text-white">{lead.email || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Teléfono</p>
          <p className="text-white">{lead.phone || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Empresa</p>
          <p className="text-white">{lead.company || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Ciudad</p>
          <p className="text-white">{lead.city || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Estado</p>
          <div className="flex items-center gap-2">
            <StatusBadge status={lead.status} />
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="ml-2 bg-dark-800 text-white text-sm rounded border border-dark-700 px-2 py-1"
            >
              <option value="new">Nuevo</option>
              <option value="contacted">Contactado</option>
              <option value="qualified">Calificado</option>
              <option value="proposal">Propuesta</option>
              <option value="won">Ganado</option>
              <option value="lost">Perdido</option>
            </select>
            <button onClick={handleStatusUpdate} className="text-fizzia-400 text-sm hover:text-fizzia-300">Actualizar</button>
          </div>
        </div>
        <div>
          <p className="text-sm text-dark-400">Probabilidad</p>
          <p className="text-white">{lead.probability || 0}%</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Presupuesto</p>
          <p className="text-white">{formatMoney(lead.budget_range || 0)}</p>
        </div>
        <div>
          <p className="text-sm text-dark-400">Siguiente Seguimiento</p>
          <p className="text-white">{lead.next_follow_up_at ? formatDate(lead.next_follow_up_at) : '-'}</p>
        </div>
      </div>

      {lead.need_summary && (
        <div>
          <p className="text-sm text-dark-400 mb-1">Resumen de Necesidad</p>
          <p className="text-white text-sm bg-dark-800 p-3 rounded">{lead.need_summary}</p>
        </div>
      )}

      {lead.notes && (
        <div>
          <p className="text-sm text-dark-400 mb-1">Notas</p>
          <p className="text-white text-sm bg-dark-800 p-3 rounded">{lead.notes}</p>
        </div>
      )}

      <Modal open={showConvertModal} onClose={() => setShowConvertModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Convertir a Cliente</h3>
          <p className="text-dark-300 mb-4">¿Convertir "{lead.full_name}" a cliente?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowConvertModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleConvert} className="px-4 py-2 rounded bg-fizzia-500 text-white hover:bg-fizzia-600">Confirmar</button>
          </div>
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Eliminar Lead</h3>
          <p className="text-dark-300 mb-4">¿Eliminar "{lead.full_name}"?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
