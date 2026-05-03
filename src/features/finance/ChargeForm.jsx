/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Input, Button } from '../../components/ui/'
import { createInvoice, createPayment, getAllClients } from '../../services/adminData'

export default function ChargeForm({ clientId, onSaved }) {
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({
    client_id: clientId || '',
    project_id: '',
    total: '',
    due_date: '',
    status: 'pending',
    payment_method: '',
    description: ''
  })
  const [saving, setSaving] = useState(false)

  const loadClients = async () => {
    const data = await getAllClients()
    setClients(data || [])
  }

  const loadProjects = async (cid) => {
    const data = await import('../../services/adminData').then(m => m.getClientProjects(cid))
    setProjects(data || [])
  }

  useEffect(() => { 
    loadClients()
  }, [])

  useEffect(() => { 
    if (form.client_id) loadProjects(form.client_id)
  }, [form.client_id])

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_id || !form.total) return
    setSaving(true)
    const invoice = await createInvoice({
      client_id: form.client_id,
      project_id: form.project_id || null,
      total: parseFloat(form.total),
      due_date: form.due_date,
      status: form.status,
      description: form.description
    })
    if (form.payment_method && form.status === 'paid') {
      await createPayment({
        invoice_id: invoice.id,
        amount: parseFloat(form.total),
        method: form.payment_method,
        date: new Date().toISOString().split('T')[0]
      })
    }
    setSaving(false)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Agregar Cobro</h3>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Cliente *</label>
        <select
          value={form.client_id}
          onChange={handleChange('client_id')}
          className="w-full rounded border border-dark-700 bg-dark-800 text-white px-3 py-2 text-sm focus:outline-none focus:border-fizzia-500"
          required
        >
          <option value="">Seleccionar cliente</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Proyecto</label>
        <select
          value={form.project_id}
          onChange={handleChange('project_id')}
          className="w-full rounded border border-dark-700 bg-dark-800 text-white px-3 py-2 text-sm focus:outline-none focus:border-fizzia-500"
        >
          <option value="">Sin proyecto</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Descripción</label>
        <Input value={form.description} onChange={handleChange('description')} placeholder="Descripción del cobro" />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Monto *</label>
        <Input type="number" value={form.total} onChange={handleChange('total')} placeholder="0" required />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Fecha de Vencimiento</label>
        <Input type="date" value={form.due_date} onChange={handleChange('due_date')} />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Estado de Pago</label>
        <select
          value={form.status}
          onChange={handleChange('status')}
          className="w-full rounded border border-dark-700 bg-dark-800 text-white px-3 py-2 text-sm focus:outline-none focus:border-fizzia-500"
        >
          <option value="pending">Pendiente</option>
          <option value="paid">Pagado</option>
          <option value="overdue">Vencido</option>
        </select>
      </div>

      {form.status === 'paid' && (
        <div>
          <label className="block text-sm text-dark-400 mb-1">Método de Pago</label>
          <select
            value={form.payment_method}
            onChange={handleChange('payment_method')}
            className="w-full rounded border border-dark-700 bg-dark-800 text-white px-3 py-2 text-sm focus:outline-none focus:border-fizzia-500"
          >
            <option value="">Seleccionar</option>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="check">Cheque</option>
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => onSaved?.()} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
        <Button type="submit" disabled={saving || !form.client_id || !form.total}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
