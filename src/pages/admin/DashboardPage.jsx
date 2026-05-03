import { useDashboardData } from '../../hooks/useDashboardData'
import { Skeleton, EmptyState, StatusBadge } from '../../components/ui/'
import { formatMoney } from '../../utils/format'

export function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData()

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-red-400">Error: {error}</p>
          <button onClick={refetch} className="mt-2 text-sm text-red-400 hover:text-red-300">Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Balance Total</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(data?.balance || 0)}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Por Cobrar</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(data?.receivable || 0)}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Leads Pendientes</p>
              <p className="text-2xl font-bold text-white mt-1">{data?.pendingLeads || 0}</p>
            </div>
            <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
              <p className="text-sm text-dark-400">Clientes Activos</p>
              <p className="text-2xl font-bold text-white mt-1">{data?.activeClients || 0}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Cobros por atender</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : data?.pendingCharges?.length > 0 ? (
            <div className="space-y-2">
              {data.pendingCharges.map((project) => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded bg-dark-800">
                  <div>
                    <p className="text-white font-medium">{project.name}</p>
                    <p className="text-sm text-dark-400">{project.client_name}</p>
                  </div>
                  <span className="text-fizzia-400 font-semibold">{formatMoney(project.pending_amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay cobros pendientes" />
          )}
        </div>

        <div className="rounded-lg border border-dark-700 bg-dark-900 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Potenciales recientes</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : data?.recentLeads?.length > 0 ? (
            <div className="space-y-2">
              {data.recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded bg-dark-800">
                  <div>
                    <p className="text-white font-medium">{lead.full_name}</p>
                    <p className="text-sm text-dark-400">{lead.company}</p>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay potenciales recientes" />
          )}
        </div>
      </div>
    </div>
  )
}
