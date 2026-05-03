import { useState } from 'react'
import { Button, Modal, Skeleton, EmptyState } from '../../components/ui/'
import { formatMoney } from '../../utils/format'
import { useDashboardData } from '../../hooks/useDashboardData'
import OpenCharges from '../../features/finance/OpenCharges'
import ExpenseForm from '../../features/finance/ExpenseForm'
import ChargeForm from '../../features/finance/ChargeForm'

export function FinancePage() {
  const { data, loading, refetch } = useDashboardData()
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showChargeForm, setShowChargeForm] = useState(false)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Finanzas</h1>
        <Button onClick={() => setShowExpenseForm(true)}>Agregar Egreso</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Balance</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(data?.balance || 0)}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Ingresos</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(data?.revenue || 0)}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Por Cobrar</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(data?.receivable || 0)}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Egresos</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(data?.expenses || 0)}</p>
            </div>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Cobros Abiertos</h2>
          <Button onClick={() => setShowChargeForm(true)} size="sm">Agregar Cobro</Button>
        </div>
        <OpenCharges />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Historial de Pagos</h2>
          {loading ? (
            <Skeleton className="h-32 rounded" />
          ) : data?.recentPayments?.length > 0 ? (
            <div className="space-y-2">
              {data.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded bg-dark-800">
                  <div>
                    <p className="text-white text-sm">{payment.description}</p>
                    <p className="text-xs text-dark-400">{payment.date}</p>
                  </div>
                  <span className="text-green-400 font-semibold">+{formatMoney(payment.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay pagos recientes" />
          )}
        </div>

        <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Movimientos Recientes</h2>
          {loading ? (
            <Skeleton className="h-32 rounded" />
          ) : data?.recentMovements?.length > 0 ? (
            <div className="space-y-2">
              {data.recentMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 rounded bg-dark-800">
                  <div>
                    <p className="text-white text-sm">{movement.description}</p>
                    <p className="text-xs text-dark-400">{movement.date}</p>
                  </div>
                  <span className={`font-semibold ${movement.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {movement.type === 'income' ? '+' : '-'}{formatMoney(movement.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay movimientos recientes" />
          )}
        </div>
      </div>

      <Modal open={showExpenseForm} onClose={() => setShowExpenseForm(false)}>
        <ExpenseForm onSaved={() => { setShowExpenseForm(false); refetch() }} />
      </Modal>

      <Modal open={showChargeForm} onClose={() => setShowChargeForm(false)}>
        <ChargeForm onSaved={() => { setShowChargeForm(false); refetch() }} />
      </Modal>
    </div>
  )
}
