import { useState } from 'react'
import { Button, Modal } from '../../components/ui/'
import { EmptyState } from '../../components/ui/EmptyState'
import { deleteClient } from '../../services/adminData'
import ClientList from '../../features/clients/ClientList'
import ClientDetail from '../../features/clients/ClientDetail'
import ClientForm from '../../features/clients/ClientForm'

export function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleClientSaved = () => {
    setShowForm(false)
    window.location.reload()
  }

  const handleDelete = async () => {
    await deleteClient(selectedClient.id)
    setShowDeleteModal(false)
    setSelectedClient(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <Button onClick={() => setShowForm(true)}>Nuevo Cliente</Button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        <div className="w-1/3">
          <ClientList selectedId={selectedClient?.id} onSelect={setSelectedClient} />
        </div>
        <div className="flex-1">
          {selectedClient ? (
            <ClientDetail client={selectedClient} onUpdate={() => window.location.reload()} />
          ) : (
            <div className="rounded-lg border border-dark-700 bg-dark-900 h-full flex items-center justify-center">
              <EmptyState message="Selecciona un cliente para ver detalles" />
            </div>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <ClientForm onSaved={handleClientSaved} />
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Eliminar Cliente</h3>
          <p className="text-dark-300 mb-4">¿Eliminar cliente "{selectedClient?.name}"?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
