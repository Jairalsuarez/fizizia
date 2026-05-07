import { useState, useEffect } from 'react'
import { useAuth } from '../../features/auth/authContext'
import { supabase } from '../../services/supabase'
import { formatMoney, formatDate } from '../../utils/format'

export function FinancePage() {
  const { user } = useAuth()
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return

      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('paid_to_user_id', user.id)
        .eq('type', 'personal')
        .order('created_at', { ascending: false })
      setIncomes(data || [])
      setLoading(false)
    }
    load()
  }, [user])

  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis Finanzas</h1>
        <p className="text-dark-400 text-sm mt-1">Tus pagos registrados por el administrador</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 bg-dark-800 rounded-xl animate-pulse" />)
        ) : (
          <>
            <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
              <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">Total recibido</p>
              <p className="text-2xl font-bold text-green-400">{formatMoney(totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
              <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">Pagos recibidos</p>
              <p className="text-2xl font-bold text-white">{incomes.length}</p>
            </div>
          </>
        )}
      </div>

      {/* History */}
      <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Historial de Pagos</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-dark-800 rounded-lg animate-pulse" />)}
          </div>
        ) : incomes.length === 0 ? (
          <p className="text-dark-500 text-sm text-center py-8">No hay pagos registrados aún</p>
        ) : (
          <div className="space-y-2">
            {incomes.map(i => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-dark-950/50 rounded-lg border border-dark-800">
                <div>
                  <p className="text-white text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-dark-500">{formatDate(i.expense_date || i.created_at)}</p>
                </div>
                <span className="text-green-400 font-semibold">{formatMoney(i.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
