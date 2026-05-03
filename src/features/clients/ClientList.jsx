/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { StatusBadge, EmptyState, Skeleton } from '../../components/ui/'
import { getAllClients } from '../../services/adminData'

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function ClientList({ selectedId, onSelect }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  const loadClients = async () => {
    const data = await getAllClients()
    setClients(data || [])
  }

  useEffect(() => { 
    setLoading(true)
    loadClients().finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-lg border border-dark-700 bg-dark-900 h-full flex flex-col">
      <div className="p-3 border-b border-dark-700">
        <h2 className="text-white font-semibold">Clientes</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}
          </div>
        ) : clients.length > 0 ? (
          clients.map((client) => (
            <div
              key={client.id}
              onClick={() => onSelect(client)}
              className={`flex items-center gap-3 p-3 cursor-pointer border-l-2 transition-colors ${
                selectedId === client.id
                  ? 'border-fizzia-500 bg-fizzia-500/10'
                  : 'border-transparent hover:bg-dark-800'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-fizzia-500/20 flex items-center justify-center text-fizzia-400 font-semibold text-sm shrink-0">
                {getInitials(client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{client.name}</p>
                <p className="text-dark-400 text-xs truncate">{client.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={client.status} size="sm" />
                  <span className="text-xs text-dark-500">{client.project_count || 0} proyectos</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6">
            <EmptyState message="No hay clientes" />
          </div>
        )}
      </div>
    </div>
  )
}
