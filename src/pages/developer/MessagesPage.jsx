import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../features/auth/authContext'
import { getInternalProjectMessages, markInternalProjectMessagesRead, sendInternalProjectMessage, subscribeToInternalProjectMessages } from '../../api/messagesApi'
import { supabase } from '../../services/supabase'
import { AvatarIcon } from '../../data/avatars.jsx'
import { formatDate } from '../../utils/format'
import { getMessageAuthor, getMessageAuthorName, getMessageAvatarId } from '../../utils/messageIdentity'
import { getDeliveryStatus, markMessageFailed, markMessageSent, mergeRealtimeMessage, mergeRealtimeMessages } from '../../utils/messageStatus'
import { readStoredValue, writeStoredValue } from '../../utils/persistedState'
import { mergeRealtimeProject, useRealtimeProjects } from '../../hooks/useRealtimeProjects'

let pendingId = Date.now()
function genId() { return `pending-dev-${pendingId++}` }

export function MessagesPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageAuthors, setMessageAuthors] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  const handleRealtimeProject = useCallback((payload) => {
    if (payload.eventType === 'DELETE') {
      setProjects(prev => prev.filter(project => project.id !== payload.old.id))
      setSelectedProject(prev => prev?.id === payload.old.id ? null : prev)
      return
    }
    setProjects(prev => prev.some(project => project.id === payload.new.id) ? mergeRealtimeProject(prev, payload.new) : prev)
    setSelectedProject(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev)
  }, [])

  useRealtimeProjects(handleRealtimeProject)

  const scrollToEnd = (behavior = 'auto') => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' }))
    })
  }

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
        .select('id, name, status, clients(name)')
        .in('id', ids)
        .order('created_at', { ascending: false })

      const rows = projs || []
      setProjects(rows)
      const savedProjectId = readStoredValue('dev-messages-project', '')
      const savedProject = rows.find(project => project.id === savedProjectId)
      setSelectedProject(prev => prev || savedProject || rows[0] || null)
      setLoading(false)
    }
    load()
  }, [user?.id])

  useEffect(() => {
    writeStoredValue('dev-messages-project', selectedProject?.id)
  }, [selectedProject?.id])

  useEffect(() => {
    if (!selectedProject?.id) return
    let cancelled = false

    const loadMessages = async () => {
      const msgs = await getInternalProjectMessages(selectedProject.id)
      if (cancelled) return
      setMessages(msgs)
      markInternalProjectMessagesRead(selectedProject.id).then(readMessages => {
        if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
      })
      scrollToEnd('auto')
    }

    loadMessages()
    if (channelRef.current) channelRef.current.unsubscribe()
    channelRef.current = subscribeToInternalProjectMessages(selectedProject.id, (payload) => {
      setMessages(prev => mergeRealtimeMessage(prev, payload))
      if (payload?.sender_id !== user?.id) {
        markInternalProjectMessagesRead(selectedProject.id).then(readMessages => {
          if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
        })
      }
    })

    return () => {
      cancelled = true
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [selectedProject?.id, user?.id])

  useEffect(() => {
    scrollToEnd(messages.length ? 'smooth' : 'auto')
  }, [messages])

  useEffect(() => {
    const ids = [...new Set(messages.map(message => message.sender_id).filter(Boolean))]
      .filter(id => !messageAuthors[id])
    if (!ids.length) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, first_name, email, avatar_id, role')
      .in('id', ids)
      .then(({ data }) => {
        if (cancelled) return
        setMessageAuthors(prev => ({
          ...prev,
          ...Object.fromEntries((data || []).map(profile => [profile.id, profile])),
        }))
      })
    return () => { cancelled = true }
  }, [messages, messageAuthors])

  const handleSend = async (event) => {
    event.preventDefault()
    if (!newMessage.trim() || !selectedProject) return
    const content = newMessage.trim()
    const tempId = genId()
    setNewMessage('')
    setMessages(prev => [...prev, {
      id: tempId,
      project_id: selectedProject.id,
      sender_id: user?.id,
      content,
      channel: 'internal',
      is_admin_sender: true,
      created_at: new Date().toISOString(),
      _status: 'sending',
    }])

    try {
      const msg = await sendInternalProjectMessage(selectedProject.id, content)
      setMessages(prev => markMessageSent(prev, tempId, msg || {}))
    } catch {
      setMessages(prev => markMessageFailed(prev, tempId))
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-[34rem] rounded-xl bg-dark-800 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Mensajes internos</h1>
        <p className="text-dark-400 text-sm mt-1">Habla con el admin sobre tus proyectos asignados</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
          <span className="material-symbols-rounded text-dark-600 text-5xl mb-3 block">chat</span>
          <p className="text-dark-400 text-sm">No tienes proyectos asignados</p>
        </div>
      ) : (
        <div className="grid min-h-[36rem] grid-cols-1 overflow-hidden rounded-xl border border-dark-800 bg-dark-950/40 lg:grid-cols-[20rem_1fr]">
          <aside className="border-b border-dark-800 bg-dark-900/70 lg:border-b-0 lg:border-r">
            <div className="border-b border-dark-800 p-4">
              <p className="text-sm font-semibold text-white">Proyectos</p>
              <p className="text-xs text-dark-500">{projects.length} conversaciones</p>
            </div>
            <div className="max-h-[34rem] overflow-y-auto">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`cursor-pointer w-full border-b border-dark-800 p-4 text-left transition-colors ${
                    selectedProject?.id === project.id ? 'bg-fizzia-500/10' : 'hover:bg-dark-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                    <span className="material-symbols-rounded text-base text-fizzia-400">admin_panel_settings</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-dark-500">Linea directa con admin</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[36rem] flex-col">
            <div className="border-b border-dark-800 bg-dark-900/60 p-4">
              <p className="text-sm font-semibold text-white">{selectedProject?.name}</p>
              <p className="text-xs text-dark-500">Chat interno con el equipo admin</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-dark-500">
                  Todavia no hay mensajes internos
                </div>
              ) : (
                messages.map(message => {
                  const isMine = message.sender_id === user?.id
                  const status = getDeliveryStatus(message, isMine)
                  const author = getMessageAuthor(message, messageAuthors)
                  const authorName = getMessageAuthorName({ message, isMine, author, clientName: 'Admin' })
                  const avatarId = getMessageAvatarId({ message, isMine, author, currentUser: user })
                  const showTime = visibleTimeMessageId === message.id
                  return (
                    <div key={message.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                          <AvatarIcon id={avatarId || '16'} size={32} />
                        </div>
                      )}
                      <div className={`flex max-w-[70%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <span className={`mb-1 text-[11px] font-medium ${isMine ? 'text-fizzia-400' : 'text-dark-400'}`}>
                          {authorName}
                        </span>
                        <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() => setVisibleTimeMessageId(prev => prev === message.id ? null : message.id)}
                            className={`cursor-pointer rounded-2xl px-4 py-3 text-left text-sm ${
                              isMine ? 'bg-fizzia-500 text-white rounded-br-sm' : 'bg-dark-800 text-dark-100 rounded-bl-sm'
                            }`}
                          >
                            <span className="whitespace-pre-wrap break-words">{message.content}</span>
                          </button>
                          {isMine && (
                            <span className="mb-1 flex h-4 w-4 items-center justify-center text-dark-500">
                              {status === 'sending' && <span className="h-3 w-3 animate-spin rounded-full border-2 border-dark-500 border-t-transparent" />}
                              {status === 'sent' && <span className="material-symbols-rounded text-[13px]">check</span>}
                              {status === 'read' && <span className="material-symbols-rounded text-[13px] text-sky-400">done_all</span>}
                              {status === 'error' && <span className="material-symbols-rounded text-[13px] text-red-400">error</span>}
                            </span>
                          )}
                        </div>
                        {showTime && (
                          <span className="mt-1 text-[10px] text-dark-500">{formatDate(message.created_at)}</span>
                        )}
                      </div>
                      {isMine && (
                        <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                          <AvatarIcon id={avatarId || '1'} size={32} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-dark-800 p-3">
              <input
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                className="flex-1 rounded-xl border border-dark-700 bg-dark-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-dark-500 focus:border-fizzia-500"
                placeholder="Escribir al admin..."
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="cursor-pointer rounded-xl bg-fizzia-500 px-4 py-2.5 text-white transition-colors hover:bg-fizzia-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-rounded text-lg">send</span>
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
