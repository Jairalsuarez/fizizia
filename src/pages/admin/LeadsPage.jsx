import { useState } from 'react'
import { useDashboardData } from '../../hooks/useDashboardData'
import { StatusBadge, EmptyState, Modal, Skeleton } from '../../components/ui/'
import { formatMoney, formatDate } from '../../utils/format'
import { deleteLead, updateLead, convertLeadToInformal, createInformalProject } from '../../services/adminData'
import { useToast } from '../../components/Toast'

const WHATSAPP_NUMBER = '593999999999'

export function LeadsPage() {
  const { data, loading, refreshData } = useDashboardData()
  const toast = useToast()
  const [selectedLead, setSelectedLead] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInformalModal, setShowInformalModal] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [createdClientId, setCreatedClientId] = useState(null)
  const [contactNote, setContactNote] = useState('')
  const [editingLead, setEditingLead] = useState(null)
  const [informalProjectData, setInformalProjectData] = useState({ name: '', description: '', budget: '' })

  const leads = data?.leads?.filter(l => !['won', 'lost', 'informal'].includes(l.status)) || []
  const filteredLeads = statusFilter === 'all' ? leads : leads.filter(l => l.status === statusFilter)

  const handleDelete = async () => {
    const { error } = await deleteLead(selectedLead.id)
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
      return
    }
    setShowDeleteModal(false)
    setSelectedLead(null)
    refreshData()
    toast.success('Lead eliminado')
  }

  const handleContact = () => {
    const msg = generateContactMessage(selectedLead)
    setContactNote(msg)
    setShowContactModal(true)
  }

  const copyContactMessage = () => {
    navigator.clipboard.writeText(contactNote)
    toast.success('Mensaje copiado al portapapeles')
  }

  const sendWhatsApp = (lead) => {
    const msg = generateWhatsAppMessage(lead)
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const handleEdit = () => {
    setEditingLead({ ...selectedLead })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    await updateLead(editingLead.id, editingLead)
    setShowEditModal(false)
    setEditingLead(null)
    setSelectedLead({ ...selectedLead, ...editingLead })
    refreshData()
    toast.success('Lead actualizado')
  }

  const handleConvertToInformal = async () => {
    const { data: client, error } = await convertLeadToInformal(selectedLead)
    if (error) {
      toast.error('Error al crear cliente informal')
      return
    }
    setShowInformalModal(false)
    setCreatedClientId(client.id)
    setInformalProjectData({ name: '', description: '', budget: '' })
    setShowProjectForm(true)
    refreshData()
    toast.success('Lead convertido a cliente informal')
  }

  const handleCreateInformalProject = async () => {
    const { error } = await createInformalProject(createdClientId, informalProjectData)
    if (error) {
      toast.error('Error al crear proyecto')
      return
    }
    setShowProjectForm(false)
    setCreatedClientId(null)
    setSelectedLead(null)
    refreshData()
    toast.success('Proyecto creado')
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Potenciales Clientes</h1>

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
                {status === 'all' ? 'Todos' : status === 'new' ? 'Nuevos' : status === 'contacted' ? 'Contactados' : status === 'qualified' ? 'Calificados' : 'Propuesta'}
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
                    onClick={handleEdit}
                    className="px-3 py-1.5 rounded border border-dark-600 text-white text-sm hover:bg-dark-800 flex items-center gap-1"
                  >
                    <span className="material-symbols-rounded text-base">edit</span>
                    Editar
                  </button>
                  <button
                    onClick={handleContact}
                    className="px-3 py-1.5 rounded bg-fizzia-500 text-white text-sm hover:bg-fizzia-600 flex items-center gap-1"
                  >
                    <span className="material-symbols-rounded text-base">mail</span>
                    Contactar
                  </button>
                  <button
                    onClick={() => sendWhatsApp(selectedLead)}
                    className="px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-500 flex items-center gap-1"
                  >
                    <span className="material-symbols-rounded text-base">chat</span>
                    WhatsApp
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-dark-400">Email</p>
                  <p className="text-white">{selectedLead.email}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Telefono</p>
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
                <div className="mb-6">
                  <p className="text-sm text-dark-400 mb-1">Notas</p>
                  <p className="text-white text-sm">{selectedLead.notes}</p>
                </div>
              )}

              <div className="border-t border-dark-700 pt-6">
                <p className="text-dark-400 text-sm mb-3">Acciones especiales</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInformalModal(true)}
                    className="px-4 py-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/20 transition-colors"
                  >
                    Marcar como Cliente Informal
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 rounded border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dark-700 bg-dark-900 h-full flex items-center justify-center">
              <EmptyState message="Selecciona un lead para ver detalles" />
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-2">Eliminar Lead</h3>
          <p className="text-dark-300 mb-4">Eliminar "{selectedLead?.full_name}"? Esta accion no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">Eliminar</button>
          </div>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)}>
        <div className="p-6 max-w-lg">
          <h3 className="text-lg font-bold text-white mb-2">Mensaje de contacto</h3>
          <p className="text-dark-400 text-sm mb-4">
            Este mensaje puede copiarse y enviarse por email o cualquier medio.
          </p>
          <textarea
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white text-sm focus:outline-none focus:border-fizzia-500 resize-none"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowContactModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cerrar</button>
            <button onClick={copyContactMessage} className="px-4 py-2 rounded bg-fizzia-500 text-white hover:bg-fizzia-600 flex items-center gap-1">
              <span className="material-symbols-rounded text-base">content_copy</span>
              Copiar
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
        <div className="p-6 max-w-lg">
          <h3 className="text-lg font-bold text-white mb-4">Editar Lead</h3>
          {editingLead && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-dark-400 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={editingLead.full_name}
                  onChange={(e) => setEditingLead({ ...editingLead, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editingLead.email}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Telefono</label>
                <input
                  type="text"
                  value={editingLead.phone || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Empresa</label>
                <input
                  type="text"
                  value={editingLead.company || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={editingLead.city || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Presupuesto</label>
                <input
                  type="number"
                  value={editingLead.budget_range || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, budget_range: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Estado</label>
                <select
                  value={editingLead.status}
                  onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                >
                  <option value="new">Nuevo</option>
                  <option value="contacted">Contactado</option>
                  <option value="qualified">Calificado</option>
                  <option value="proposal">Propuesta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Resumen de necesidad</label>
                <textarea
                  value={editingLead.need_summary || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, need_summary: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Notas</label>
                <textarea
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
                <button onClick={handleSaveEdit} className="px-4 py-2 rounded bg-fizzia-500 text-white hover:bg-fizzia-600">Guardar</button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Informal Client Modal */}
      <Modal open={showInformalModal} onClose={() => setShowInformalModal(false)}>
        <div className="p-6 max-w-md">
          <h3 className="text-lg font-bold text-white mb-2">Cliente Informal</h3>
          <p className="text-dark-300 text-sm mb-4">
            Se creara un cliente en el sistema gestionado solo por ti. "{selectedLead?.full_name}" no tendra acceso al portal.
            Podras crear un proyecto para este cliente a continuacion.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
            <p className="text-amber-400 text-xs">
              El cliente "{selectedLead?.full_name}" sera marcado como informal y podras crear un proyecto en su nombre.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowInformalModal(false)} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
            <button onClick={handleConvertToInformal} className="px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600">
              Crear Cliente Informal
            </button>
          </div>
        </div>
      </Modal>

      {/* Informal Project Form */}
      <Modal open={showProjectForm} onClose={() => { setShowProjectForm(false); setCreatedClientId(null) }}>
        <div className="p-6 max-w-lg">
          <h3 className="text-lg font-bold text-white mb-2">Crear Proyecto para Cliente Informal</h3>
          <p className="text-dark-400 text-sm mb-4">Este proyecto solo sera visible para ti en el panel de administracion.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Nombre del proyecto</label>
              <input
                type="text"
                value={informalProjectData.name}
                onChange={(e) => setInformalProjectData({ ...informalProjectData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                placeholder="Ej: Sitio web corporativo"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Descripcion</label>
              <textarea
                value={informalProjectData.description}
                onChange={(e) => setInformalProjectData({ ...informalProjectData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500 resize-none"
                placeholder="Detalles del proyecto..."
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Presupuesto (USD)</label>
              <input
                type="number"
                value={informalProjectData.budget}
                onChange={(e) => setInformalProjectData({ ...informalProjectData, budget: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-fizzia-500"
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowProjectForm(false); setCreatedClientId(null) }} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Saltar</button>
              <button onClick={handleCreateInformalProject} disabled={!informalProjectData.name} className="px-4 py-2 rounded bg-fizzia-500 text-white hover:bg-fizzia-600 disabled:opacity-50">Crear Proyecto</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function generateContactMessage(lead) {
  const name = lead.full_name?.split(' ')[0] || lead.full_name || 'estimado cliente'
  const company = lead.company ? ` de ${lead.company}` : ''
  const summary = lead.need_summary ? `\n\nHemos revisado tu solicitud sobre: ${lead.need_summary}` : ''
  return `Hola ${name},

Gracias por tu interes en Fizzia${company}.${summary}

Para mayor flexibilidad en el desarrollo de tu proyecto, te invitamos a crear una cuenta en nuestra plataforma. Asi podras:
- Dar seguimiento en tiempo real al avance de tu proyecto
- Subir y recibir archivos directamente
- Comunicarte con nuestro equipo de forma organizada

Puedes registrarte en: ${window.location.origin}/register

Si prefieres un asesoramiento mas directo, tambien puedes contactarnos por WhatsApp y con gusto te atenderemos.

Quedamos atentos,
Equipo Fizzia`
}

function generateWhatsAppMessage(lead) {
  const name = lead.full_name?.split(' ')[0] || lead.full_name || 'estimado cliente'
  const company = lead.company ? ` de ${lead.company}` : ''
  return `Hola ${name}${company}, gracias por tu interes en Fizzia. Para mayor flexibilidad en el desarrollo de tu proyecto, te invitamos a crear una cuenta en nuestra plataforma. Puedes registrarte en: ${window.location.origin}/register. Si prefieres asesoramiento directo, estamos disponibles por aqui. Saludos, equipo Fizzia.`
}
