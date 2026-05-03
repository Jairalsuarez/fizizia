import { useState } from 'react'
import { Input, Button } from '../../components/ui/'
import { createProject } from '../../services/adminData'

export default function ProjectForm({ clientId, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    budget: '',
    due_date: ''
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    await createProject({ ...form, client_id: clientId, budget: parseFloat(form.budget) || 0 })
    setSaving(false)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Nuevo Proyecto</h3>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Nombre *</label>
        <Input value={form.name} onChange={handleChange('name')} placeholder="Nombre del proyecto" required />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Descripción</label>
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Descripción del proyecto"
          rows={3}
          className="w-full rounded border border-dark-700 bg-dark-800 text-white px-3 py-2 text-sm focus:outline-none focus:border-fizzia-500"
        />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Presupuesto</label>
        <Input type="number" value={form.budget} onChange={handleChange('budget')} placeholder="0" />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Fecha de Entrega</label>
        <Input type="date" value={form.due_date} onChange={handleChange('due_date')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => onSaved?.()} className="px-4 py-2 rounded border border-dark-700 text-white hover:bg-dark-800">Cancelar</button>
        <Button type="submit" disabled={saving || !form.name}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
