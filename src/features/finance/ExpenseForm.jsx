import { useState } from 'react'
import { Input, Button } from '../../components/ui/'
import { createExpense } from '../../services/adminData'

export default function ExpenseForm({ onSaved }) {
  const [form, setForm] = useState({
    title: '',
    category: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    project_id: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.amount) return
    setSaving(true)
    await createExpense({
      ...form,
      amount: parseFloat(form.amount)
    })
    setSaving(false)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Agregar Egreso</h3>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Título *</label>
        <Input value={form.title} onChange={handleChange('title')} placeholder="Título del egreso" required />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Categoría</label>
        <select
          value={form.category}
          onChange={handleChange('category')}
          className="w-full rounded border border-dark-700 bg-dark-800 text-white px-3 py-2 text-sm focus:outline-none focus:border-fizzia-500"
        >
          <option value="">Seleccionar</option>
          <option value="software">Software</option>
          <option value="hardware">Hardware</option>
          <option value="marketing">Marketing</option>
          <option value="travel">Viajes</option>
          <option value="office">Oficina</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Monto *</label>
        <Input type="number" value={form.amount} onChange={handleChange('amount')} placeholder="0" required />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Fecha</label>
        <Input type="date" value={form.expense_date} onChange={handleChange('expense_date')} />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1">Proyecto (opcional)</label>
        <Input value={form.project_id} onChange={handleChange('project_id')} placeholder="ID del proyecto" />
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
        <Button type="submit" disabled={saving || !form.title || !form.amount}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
