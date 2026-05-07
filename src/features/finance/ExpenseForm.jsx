import { useState, useEffect } from 'react'
import { createExpense } from '../../api/paymentsApi'
import { supabase } from '../../services/supabase'

export default function ExpenseForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({
    description: '',
    category: 'gasto_negocio',
    amount: '',
    paid_to_user_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email, role').order('full_name').then(({ data }) => {
      const filtered = (data || []).filter(u => ['admin', 'manager', 'developer'].includes(u.role))
      setUsers(filtered)
    })
  }, [])

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) return
    if (form.category === 'pago_personal' && !form.paid_to_user_id) return
    setSaving(true)
    await createExpense({
      title: form.description.trim(),
      category: form.category,
      type: form.category === 'pago_personal' ? 'personal' : 'negocio',
      amount: parseFloat(form.amount),
      paid_to_user_id: form.category === 'pago_personal' ? form.paid_to_user_id : null,
    })
    setSaving(false)
    onSaved?.()
  }

  const isPersonal = form.category === 'pago_personal'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-dark-400 mb-1.5">Descripción</label>
        <input
          type="text"
          value={form.description}
          onChange={handleChange('description')}
          className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 placeholder-dark-600"
          placeholder="Ej: Licencia hosting mensual"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1.5">Monto</label>
        <input
          type="number"
          value={form.amount}
          onChange={handleChange('amount')}
          className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white text-lg font-semibold focus:outline-none focus:border-fizzia-500"
          placeholder="0.00"
          step="0.01"
          min="0"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1.5">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, category: 'gasto_negocio', paid_to_user_id: '' }))}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              !isPersonal
                ? 'bg-fizzia-500/20 border-fizzia-500/40 text-fizzia-300'
                : 'bg-dark-950 border-dark-700 text-dark-400 hover:border-dark-600'
            }`}
          >
            Gasto de negocio
          </button>
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, category: 'pago_personal', paid_to_user_id: '' }))}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              isPersonal
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-dark-950 border-dark-700 text-dark-400 hover:border-dark-600'
            }`}
          >
            Pago de personal
          </button>
        </div>
      </div>

      {isPersonal && (
        <div>
          <label className="block text-sm text-dark-400 mb-1.5">¿A quién se le deposita?</label>
          <select
            value={form.paid_to_user_id}
            onChange={handleChange('paid_to_user_id')}
            className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
          >
            <option value="">Seleccionar...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={() => onCancel ? onCancel() : onSaved()} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="cursor-pointer flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-400 disabled:opacity-50 transition-all">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
