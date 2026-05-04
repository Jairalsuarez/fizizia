import { useState } from 'react'
import { Button, StatusBadge, Modal } from '../../components/ui/'
import { formatMoney } from '../../utils/format'
import { deleteClient } from '../../services/adminData'
import ProjectForm from './ProjectForm'
import ChargeForm from '../finance/ChargeForm'
import { useToast } from '../../components/Toast'

export default function ClientDetail({ client, onUpdate }) {
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const toast = useToast()

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

  return (
    <div className="rounded-lg border border-dark-700 bg-dark-900 p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{client.name}</h2>
          <p className="text-dark-400 text-sm">{client.email}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowProjectForm(true)} size="sm">Nuevo Proyecto</Button>
          <Button onClick={() => setShowChargeForm(true)} size="sm">Agregar Cobro</Button>
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
        <h3 className="text-white font-semibold mb-3">Proyectos</h3>
        {client.projects?.length > 0 ? (
          <div className="space-y-2">
            {client.projects.map((project) => (
              <div key={project.id} className="p-3 rounded bg-dark-800">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">{project.name}</p>
                  <StatusBadge status={project.status} size="sm" />
                </div>
                <p className="text-sm text-dark-400 mt-1">{formatMoney(project.budget || 0)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-500 text-sm">No hay proyectos</p>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">Facturas</h3>
        {client.invoices?.length > 0 ? (
          <div className="space-y-2">
            {client.invoices.map((invoice) => (
              <div key={invoice.id} className="p-3 rounded bg-dark-800 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{invoice.description}</p>
                  <p className="text-xs text-dark-400">{invoice.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{formatMoney(invoice.total)}</p>
                  <StatusBadge status={invoice.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-500 text-sm">No hay facturas</p>
        )}
      </div>

      <Modal open={showProjectForm} onClose={() => setShowProjectForm(false)}>
        <ProjectForm clientId={client.id} onSaved={() => { setShowProjectForm(false); onUpdate() }} />
      </Modal>

      <Modal open={showChargeForm} onClose={() => setShowChargeForm(false)}>
        <ChargeForm clientId={client.id} onSaved={() => { setShowChargeForm(false); onUpdate() }} />
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
