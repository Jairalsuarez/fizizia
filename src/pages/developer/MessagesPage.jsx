import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/authContext'
import { supabase } from '../../services/supabase'
import { formatDate } from '../../utils/format'

export function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [projectMessages, setProjectMessages] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return

      const { data: assignments } = await supabase
        .from('project_developers')
        .select('project_id')
        .eq('developer_id', user.id)

      if (!assignments?.length) {
        setLoading(false)
        return
      }

      const ids = assignments.map(a => a.project_id)
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, clients(name)')
        .in('id', ids)

      setProjects(projs || [])

      const msgsByProject = {}
      await Promise.all(
        ids.map(async (pid) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('project_id', pid)
            .order('created_at', { ascending: true })
          msgsByProject[pid] = msgs || []
        })
      )
      setProjectMessages(msgsByProject)
      setLoading(false)
    }
    load()
  }, [user?.id])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mensajes</h1>
        <p className="text-dark-400 text-sm mt-1">Conversaciones de tus proyectos asignados</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-dark-800 rounded-xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
          <span className="material-symbols-rounded text-dark-600 text-5xl mb-3 block">chat</span>
          <p className="text-dark-400 text-sm">No tienes proyectos asignados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(proj => {
            const msgs = projectMessages[proj.id] || []
            const lastMsg = msgs[msgs.length - 1]
            return (
              <button
                key={proj.id}
                onClick={() => navigate(`/dev/proyecto/${proj.id}?tab=mensajes`)}
                className="cursor-pointer w-full text-left bg-dark-900/50 border border-dark-800 rounded-xl p-4 hover:border-dark-700 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-medium text-sm truncate pr-4">{proj.name}</h3>
                  <span className="text-xs text-dark-500 shrink-0">{msgs.length} mensajes</span>
                </div>
                <p className="text-dark-400 text-xs truncate">{proj.clients?.name || ''}</p>
                {lastMsg && (
                  <div className="mt-2 pt-2 border-t border-dark-800">
                    <p className="text-dark-500 text-xs truncate">{lastMsg.content}</p>
                    <p className="text-dark-600 text-[10px] mt-0.5">{formatDate(lastMsg.created_at)}</p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
