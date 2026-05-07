/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { StatusBadge, EmptyState, Skeleton } from '../../components/ui/'
import { formatDate } from '../../utils/format'
import { getLeads } from '../../api/leadsApi'

export default function LeadList({ selectedId, onSelect, statusFilter, onStatusFilterChange }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  const loadLeads = async () => {
    setLoading(true)
    const data = await getLeads()
    setLeads(data?.filter(l => !['won', 'lost'].includes(l.status)) || [])
    setLoading(false)
  }

  useEffect(() => { 
    loadLeads()
  }, [])

  const filtered = statusFilter === 'all' ? leads : leads.filter(l => l.status === statusFilter)

  return (
    <div className="rounded-lg border border-dark-700 bg-dark-900 h-full flex flex-col">
      <div className="p-3 border-b border-dark-700">
        <h2 className="text-white font-semibold mb-2">Leads</h2>
        <div className="flex gap-1 flex-wrap">
          {['all', 'new', 'contacted', 'qualified', 'proposal'].map((status) => (
            <button
              key={status}
              onClick={() => onStatusFilterChange?.(status)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-fizzia-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white'
              }`}
            >
              {status === 'all' ? 'Todos' : status}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((lead) => (
            <div
              key={lead.id}
              onClick={() => onSelect(lead)}
              className={`p-3 cursor-pointer border-l-2 transition-colors ${
                selectedId === lead.id
                  ? 'border-fizzia-500 bg-fizzia-500/10'
                  : 'border-transparent hover:bg-dark-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-white text-sm font-medium truncate">{lead.full_name}</p>
                <StatusBadge status={lead.status} size="sm" />
              </div>
              <p className="text-dark-400 text-xs">{lead.company || '-'}</p>
              <p className="text-dark-500 text-xs mt-1">{lead.created_at ? formatDate(lead.created_at) : ''}</p>
            </div>
          ))
        ) : (
          <div className="p-6">
            <EmptyState message="No hay leads" />
          </div>
        )}
      </div>
    </div>
  )
}
