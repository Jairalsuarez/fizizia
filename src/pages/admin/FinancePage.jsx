import { useState, useEffect, useCallback } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/Toast'
import { formatDate, formatMoney } from '../../utils/format'
import { useAuth } from '../../features/auth/authContext'
import { supabase } from '../../services/supabase'
import ExpenseForm from '../../features/finance/ExpenseForm'
import IncomeForm from '../../features/finance/IncomeForm'

export function FinancePage() {
  const { session } = useAuth()
  const toast = useToast()
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [personalIncomes, setPersonalIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const currentUserId = session?.user?.id

  const loadData = useCallback(async () => {
    setLoading(true)
    const [payRes, expRes] = await Promise.all([
      supabase.from('payments').select('*, projects(name)').eq('admin_status', 'approved').order('paid_at', { ascending: false }),
      supabase.from('expenses').select('*, paid_to_user:profiles(full_name, email)').order('created_at', { ascending: false }),
    ])
    setPayments(payRes.data || [])
    setExpenses(expRes.data || [])

    if (currentUserId) {
      const { data: personal } = await supabase
        .from('expenses')
        .select('*')
        .eq('paid_to_user_id', currentUserId)
        .eq('type', 'personal')
        .order('created_at', { ascending: false })
      setPersonalIncomes(personal || [])
    }
    setLoading(false)
  }, [currentUserId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const totalIncome = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const balance = totalIncome - totalExpenses

  const allMovements = [
    ...payments.map(p => ({ ...p, movement_type: 'income', date: p.paid_at || p.created_at })),
    ...expenses.map(e => ({ ...e, movement_type: 'expense', date: e.expense_date || e.created_at })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50)

  const expenseCategoryLabels = { gasto_negocio: 'Gasto de negocio', pago_personal: 'Pago de personal' }
  const methodLabels = { transfer: 'Transferencia', deposit: 'Depósito', paypal: 'PayPal', cash: 'Efectivo' }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Finanzas</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowIncomeForm(true)} className="cursor-pointer px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium rounded-lg hover:bg-green-500/30 transition-all flex items-center gap-1.5">
            <span className="material-symbols-rounded text-sm">add</span>
            Agregar Ingreso
          </button>
          <button onClick={() => setShowExpenseForm(true)} className="cursor-pointer px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/30 transition-all flex items-center gap-1.5">
            <span className="material-symbols-rounded text-sm">add</span>
            Agregar Egreso
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-dark-800 rounded-xl animate-pulse" />)
        ) : (
          <>
            <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
              <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatMoney(balance)}</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
              <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">Ingresos</p>
              <p className="text-2xl font-bold text-green-400">{formatMoney(totalIncome)}</p>
              <p className="text-xs text-dark-600 mt-1">{payments.length} pagos aprobados</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
              <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-1">Egresos</p>
              <p className="text-2xl font-bold text-red-400">{formatMoney(totalExpenses)}</p>
              <p className="text-xs text-dark-600 mt-1">{expenses.length} movimientos</p>
            </div>
          </>
        )}
      </div>

      {/* Personal Finances */}
      {personalIncomes.length > 0 && (
        <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded text-fizzia-400">account_balance_wallet</span>
            <h2 className="text-sm font-semibold text-white">Mis Finanzas Personales</h2>
            <span className="text-xs text-dark-500 ml-auto">{formatMoney(personalIncomes.reduce((s, p) => s + Number(p.amount || 0), 0))}</span>
          </div>
          <div className="space-y-2">
            {personalIncomes.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-dark-950/50 rounded-lg border border-dark-800">
                <div>
                  <p className="text-white text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-dark-500">{formatDate(p.expense_date || p.created_at)}</p>
                </div>
                <span className="text-green-400 font-semibold">{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movement History */}
      <div className="rounded-xl border border-dark-800 bg-dark-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Historial de Movimientos</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-dark-800 rounded-lg animate-pulse" />)}
          </div>
        ) : allMovements.length === 0 ? (
          <p className="text-dark-500 text-sm text-center py-8">No hay movimientos</p>
        ) : (
          <div className="space-y-2">
            {allMovements.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-dark-950/50 rounded-lg border border-dark-800 hover:border-dark-700 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    m.movement_type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <span className={`material-symbols-rounded text-sm ${
                      m.movement_type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {m.movement_type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {m.movement_type === 'income'
                        ? (m.projects?.name || m.description || 'Ingreso')
                        : (m.title || 'Egreso')
                      }
                    </p>
                    <p className="text-xs text-dark-500">
                      {m.movement_type === 'income'
                        ? (methodLabels[m.method] || m.method)
                        : (expenseCategoryLabels[m.category] || m.category)
                      }
                      {' · '}
                      {formatDate(m.date)}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold shrink-0 ml-4 ${m.movement_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {m.movement_type === 'income' ? '+' : '-'}{formatMoney(m.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Agregar Egreso" size="sm">
        <ExpenseForm onSaved={() => { setShowExpenseForm(false); loadData(); toast.success('Egreso registrado') }} onCancel={() => setShowExpenseForm(false)} />
      </Modal>

      <Modal isOpen={showIncomeForm} onClose={() => setShowIncomeForm(false)} title="Agregar Ingreso" size="sm">
        <IncomeForm onSaved={() => { setShowIncomeForm(false); loadData(); toast.success('Ingreso registrado') }} />
      </Modal>
    </div>
  )
}
