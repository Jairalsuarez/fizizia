/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Card, StatusBadge, Skeleton, EmptyState } from '../../components/ui/'
import { getMyInvoices } from '../../services/clientData'
import { formatMoney, formatDate } from '../../utils/format'

export function FinancesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getMyInvoices()
      setInvoices(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    loadInvoices()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  const totalBudget = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0)
  const totalPending = invoices.filter(inv => ['pending', 'sent'].includes(inv.status)).reduce((sum, inv) => sum + (inv.total || 0), 0)
  const totalOverdue = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.total || 0), 0)

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white">Finances</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-dark-900 border-dark-700">
          <p className="text-dark-400 text-sm">Total Budget</p>
          <p className="text-white text-2xl font-bold mt-2">{formatMoney(totalBudget)}</p>
        </Card>
        <Card className="p-6 bg-dark-900 border-dark-700">
          <p className="text-dark-400 text-sm">Paid</p>
          <p className="text-green-400 text-2xl font-bold mt-2">{formatMoney(totalPaid)}</p>
        </Card>
        <Card className="p-6 bg-dark-900 border-dark-700">
          <p className="text-dark-400 text-sm">Pending</p>
          <p className="text-yellow-400 text-2xl font-bold mt-2">{formatMoney(totalPending)}</p>
        </Card>
        <Card className="p-6 bg-dark-900 border-dark-700">
          <p className="text-dark-400 text-sm">Overdue</p>
          <p className="text-red-400 text-2xl font-bold mt-2">{formatMoney(totalOverdue)}</p>
        </Card>
      </div>

      <Card className="bg-dark-900 border-dark-700">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Invoices</h2>

          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left text-dark-400 text-sm font-medium pb-3">Invoice</th>
                    <th className="text-left text-dark-400 text-sm font-medium pb-3">Issued</th>
                    <th className="text-left text-dark-400 text-sm font-medium pb-3">Due</th>
                    <th className="text-right text-dark-400 text-sm font-medium pb-3">Amount</th>
                    <th className="text-center text-dark-400 text-sm font-medium pb-3">Status</th>
                    <th className="text-right text-dark-400 text-sm font-medium pb-3">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-dark-800 last:border-0 hover:bg-dark-800/50 transition-colors">
                      <td className="py-4">
                        <p className="text-white font-medium text-sm">{invoice.invoice_number}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-dark-300 text-sm">{formatDate(invoice.issued_at)}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-dark-300 text-sm">{formatDate(invoice.due_at)}</p>
                      </td>
                      <td className="py-4 text-right">
                        <p className="text-white font-medium text-sm">{formatMoney(invoice.total)}</p>
                      </td>
                      <td className="py-4 text-center">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-4 text-right">
                        <p className={`text-sm font-medium ${
                          invoice.status === 'paid' ? 'text-green-400' : 'text-dark-300'
                        }`}>
                          {invoice.status === 'paid' ? formatMoney(invoice.total) : '-'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Invoices"
              description="Invoices will appear here once they are issued"
              icon="document"
            />
          )}
        </div>
      </Card>
    </div>
  )
}
