/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { StatusBadge, EmptyState, Skeleton } from '../../components/ui/'
import { formatMoney, formatDate } from '../../utils/format'
import { getOpenCharges } from '../../api/paymentsApi'

export default function OpenCharges() {
  const [charges, setCharges] = useState([])
  const [loading, setLoading] = useState(true)

  const loadCharges = async () => {
    setLoading(true)
    const data = await getOpenCharges()
    setCharges(data || [])
    setLoading(false)
  }

  useEffect(() => { 
    loadCharges()
  }, [])

  return (
    <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded" />)}
        </div>
      ) : charges.length > 0 ? (
        <div className="space-y-4">
          {charges.map((project) => (
            <div key={project.id} className="rounded bg-dark-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-medium">{project.name}</p>
                  <p className="text-sm text-dark-400">{project.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-dark-400">Total Pendiente</p>
                  <p className="text-fizzia-400 font-semibold">{formatMoney(project.pending_amount)}</p>
                </div>
              </div>
              {project.invoices?.length > 0 && (
                <div className="space-y-2">
                  {project.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-2 rounded bg-dark-900">
                      <div>
                        <p className="text-white text-sm">{invoice.description || 'Factura'}</p>
                        <p className="text-xs text-dark-400">
                          Vence: {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatMoney(invoice.total)}</p>
                        <StatusBadge status={invoice.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No hay cobros abiertos" />
      )}
    </div>
  )
}
