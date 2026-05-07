import { useState } from 'react'
import { supabase } from '../../services/supabase'

export default function IncomeForm({ onSaved }) {
  const [form, setForm] = useState({
    amount: '',
    description: '',
    method: 'transfer',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return
    setSaving(true)
    const { data: user } = await supabase.auth.getUser()
    await supabase.from('payments').insert({
      amount: parseFloat(form.amount),
      currency: 'USD',
      method: form.method,
      description: form.description || 'Ingreso manual',
      admin_status: 'approved',
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: user?.user?.id,
      paid_at: new Date().toISOString(),
      notes: form.description || '',
      reference: 'Ingreso registrado manualmente',
    })
    setSaving(false)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="block text-sm text-dark-400 mb-1.5">Descripción</label>
        <input
          type="text"
          value={form.description}
          onChange={handleChange('description')}
          className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500 placeholder-dark-600"
          placeholder="Ej: Pago cliente X por proyecto Y"
        />
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-1.5">Método</label>
        <select
          value={form.method}
          onChange={handleChange('method')}
          className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-fizzia-500"
        >
          <option value="transfer">Transferencia</option>
          <option value="deposit">Depósito</option>
          <option value="paypal">PayPal</option>
          <option value="cash">Efectivo</option>
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={() => onSaved?.()} className="cursor-pointer flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium rounded-lg hover:text-white transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="cursor-pointer flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-400 disabled:opacity-50 transition-all">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
