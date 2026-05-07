import { useState } from 'react'
import { Input, Button } from '../../components/ui/'
import { createClient } from '../../api/clientsApi'

export default function ClientForm({ onSaved }) {
  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    city: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    await createClient(form)
    setSaving(false)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Nuevo Cliente</h3>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Nombre *</label>
        <Input value={form.name} onChange={handleChange('name')} placeholder="Nombre del cliente" required />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Nombre Legal</label>
        <Input value={form.legal_name} onChange={handleChange('legal_name')} placeholder="Razón social" />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Email</label>
        <Input type="email" value={form.email} onChange={handleChange('email')} placeholder="email@ejemplo.com" />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Teléfono</label>
        <Input value={form.phone} onChange={handleChange('phone')} placeholder="123456789" />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Ciudad</label>
        <Input value={form.city} onChange={handleChange('city')} placeholder="Ciudad" />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Notas</label>
        <textarea
          value={form.notes}
          onChange={handleChange('notes')}
          placeholder="Notas adicionales"
          rows={3}
          className="w-full rounded border border-dark-700 bg-dark-800 text-white px-3 py-2 text-sm focus:outline-none focus:border-fizzia-500"
        />
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
