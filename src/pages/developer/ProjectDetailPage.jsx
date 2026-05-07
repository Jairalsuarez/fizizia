import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/authContext'
import { supabase } from '../../services/supabase'
import { fetchGitHubCommits, formatCommitTime, getCommitAuthorName } from '../../utils/github'
import { markAdminProjectMessagesRead } from '../../api/messagesApi'
import { AvatarIcon } from '../../data/avatars.jsx'
import { getMessageAuthor, getMessageAuthorName, getMessageAvatarId } from '../../utils/messageIdentity'
import { getDeliveryStatus, markMessageFailed, markMessageSent, mergeRealtimeMessage, mergeRealtimeMessages } from '../../utils/messageStatus'

let pendingId = Date.now()
function genId() { return `pending-${pendingId++}` }

const statusLabels = {
  solicitado: 'Solicitado', preparando: 'Preparando', trabajando: 'Trabajando',
  pausado: 'Pausado', entregado: 'Entregado', cancelado: 'Cancelado',
}

const statusColors = {
  solicitado: 'bg-fizzia-500', preparando: 'bg-purple-500', trabajando: 'bg-blue-500',
  pausado: 'bg-yellow-500', entregado: 'bg-green-500', cancelado: 'bg-red-500',
}

export function ProjectDetailPage() {
  const { user } = useAuth()
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem(`dev-project-tab-${projectId}`)
      if (saved && ['general', 'commits', 'mensajes'].includes(saved)) return saved
    } catch {
      // ignore
    }
    return 'general'
  })
  const [messages, setMessages] = useState([])
  const [messageAuthors, setMessageAuthors] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState(null)
  const [myId, setMyId] = useState(null)
  const [commits, setCommits] = useState([])
  const [commitsLoading, setCommitsLoading] = useState(false)

  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(`dev-project-tab-${projectId}`, tab)
  }, [tab, projectId])

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setMyId(user.id)

      const { data: projectData } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', projectId)
        .single()

      if (projectData) {
        setProject(projectData)
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('project_id', projectData.id)
          .order('created_at', { ascending: true })
        setMessages(msgs || [])

        if (projectData.repository_url) {
          setCommitsLoading(true)
          const c = await fetchGitHubCommits(projectData.repository_url)
          setCommits(c)
          setCommitsLoading(false)
        }
      }
      setLoading(false)
    }
    load()
  }, [projectId, user])

  useEffect(() => {
    if (project) {
      if (tab === 'mensajes') {
        markAdminProjectMessagesRead(project.id).then(readMessages => {
          if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
        })
      }
      channelRef.current = supabase
        .channel('dev-messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `project_id=eq.${project.id}` }, (payload) => {
          setMessages(prev => mergeRealtimeMessage(prev, payload.new))
          if (tab === 'mensajes' && payload.new?.sender_id !== myId) {
            markAdminProjectMessagesRead(project.id).then(readMessages => {
              if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
            })
          }
        })
        .subscribe()
    }
    return () => { if (channelRef.current) channelRef.current.unsubscribe() }
  }, [project, tab, myId])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !project) return
    const content = newMessage.trim()
    setNewMessage('')
    const tempId = genId()
    const tempMsg = {
      id: tempId,
      project_id: project.id,
      sender_id: user?.id,
      content,
      created_at: new Date().toISOString(),
      _status: 'sending',
    }
    setMessages(prev => [...prev, tempMsg])
    try {
      const { data } = await supabase.from('messages').insert({
        project_id: project.id,
        sender_id: user?.id,
        content,
        is_admin_sender: true,
      }).select().single()
      setMessages(prev => markMessageSent(prev, tempId, data || {}))
    } catch {
      setMessages(prev => markMessageFailed(prev, tempId))
    }
  }

  if (loading) return (
    <div className="p-6">
      <div className="h-96 bg-dark-800 rounded-xl animate-pulse" />
    </div>
  )
  if (!project) return (
    <div className="p-6">
      <button onClick={() => navigate('/dev')} className="cursor-pointer text-purple-400 hover:text-purple-300 text-sm mb-4 inline-flex items-center gap-1">
        <span className="material-symbols-rounded text-sm">arrow_back</span> Volver
      </button>
      <p className="text-dark-400">Proyecto no encontrado</p>
    </div>
  )

  const tabs = [
    { id: 'general', label: 'General', icon: 'dashboard' },
    { id: 'commits', label: 'Commits', icon: 'code' },
    { id: 'mensajes', label: 'Mensajes', icon: 'chat' },
  ]

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="border-b border-dark-800 bg-dark-900/80 backdrop-blur-sm shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => navigate('/dev')} className="cursor-pointer p-2 text-dark-400 hover:text-white transition-colors shrink-0">
                <span className="material-symbols-rounded">arrow_back</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium text-white ${statusColors[project.status]}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                  <span className="text-sm text-dark-400">{project.clients?.name || ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-800 bg-dark-900/50 shrink-0">
        <div className="px-6">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`cursor-pointer flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  tab === t.id
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-dark-400 hover:text-white hover:border-dark-600'
                }`}
              >
                <span className="material-symbols-rounded text-lg">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        {/* General tab */}
        {tab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.repository_url && (
                <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-dark-400 mb-2 flex items-center gap-2">
                    <span className="material-symbols-rounded text-purple-400">code</span>
                    Repositorio
                  </h3>
                  <a
                    href={project.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors break-all"
                  >
                    {project.repository_url}
                  </a>
                </div>
              )}
              <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-dark-400 mb-2">Fecha límite</h3>
                <p className="text-white text-sm">
                  {project.due_date ? new Date(project.due_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin definir'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Commits tab */}
        {tab === 'commits' && (
          <div>
            {!project.repository_url ? (
              <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
                <span className="material-symbols-rounded text-dark-600 text-5xl mb-3 block">code</span>
                <p className="text-dark-400 text-sm">Sin repositorio configurado</p>
                <p className="text-dark-600 text-xs mt-1">El admin debe agregar la URL del repositorio</p>
              </div>
            ) : commitsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-dark-800 rounded-lg animate-pulse" />)}
              </div>
            ) : commits.length === 0 ? (
              <div className="text-center py-16 bg-dark-900/50 border border-dark-800 rounded-xl">
                <span className="material-symbols-rounded text-dark-600 text-5xl mb-3 block">commit</span>
                <p className="text-dark-400 text-sm">No hay commits aún</p>
                <p className="text-dark-600 text-xs mt-1">O el repositorio es privado y necesita un token</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commits.map(commit => (
                  <div key={commit.sha} className="flex items-start gap-3 p-4 bg-dark-900/50 border border-dark-800 rounded-lg hover:border-dark-700 transition-all">
                    <div className="w-8 h-8 rounded-full border border-dark-700 bg-dark-800 overflow-hidden flex items-center justify-center shrink-0">
                      {commit.author?.avatar_url ? (
                        <img src={commit.author.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="material-symbols-rounded text-purple-400 text-sm">terminal</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {commit.commit?.message || 'Sin mensaje'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                        <span>{getCommitAuthorName(commit)}</span>
                        <span>{formatCommitTime(commit.commit?.author?.date)}</span>
                      </div>
                    </div>
                    <a
                      href={commit.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-xs text-purple-400 hover:text-purple-300 font-mono shrink-0"
                    >
                      {commit.sha?.slice(0, 7)}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages tab */}
        {tab === 'mensajes' && (
          <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-xl bg-dark-900/50 border border-dark-800">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-dark-500 text-sm">No hay mensajes aún</p></div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === myId
                  const status = getDeliveryStatus(msg, isMine)
                  const author = getMessageAuthor(msg, messageAuthors)
                  const authorName = getMessageAuthorName({ message: msg, isMine, author, clientName: project.clients?.name || 'Cliente' })
                  const avatarId = getMessageAvatarId({ message: msg, isMine, author, currentUser: user })
                  const time = new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                  const showTime = visibleTimeMessageId === msg.id
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                          <AvatarIcon id={avatarId} size={32} />
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`mb-1 flex items-center gap-2 text-[11px] ${isMine ? 'justify-end text-purple-400' : 'text-dark-400'}`}>
                          <span className="font-medium">{authorName}</span>
                        </div>
                        <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() => setVisibleTimeMessageId(prev => prev === msg.id ? null : msg.id)}
                            className={`cursor-pointer px-4 py-3 rounded-xl text-sm text-left ${
                              isMine
                                ? status === 'error' ? 'bg-red-500/60 text-white rounded-br-sm'
                                : 'bg-purple-500/20 text-purple-300 rounded-br-sm'
                                : 'bg-dark-800 text-dark-200 rounded-bl-sm'
                            }`}
                          >
                            <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                          </button>
                          {isMine && (
                            <span className={`mb-1 flex h-4 w-4 items-center justify-center ${status === 'error' ? 'text-red-400' : 'text-dark-500'}`}>
                              {status === 'sending' && (
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              )}
                              {status === 'sent' && <span className="material-symbols-rounded text-[13px]">check</span>}
                              {status === 'read' && <span className="material-symbols-rounded text-[13px] text-sky-400">done_all</span>}
                              {status === 'error' && <span className="material-symbols-rounded text-[13px]">error</span>}
                            </span>
                          )}
                        </div>
                        {showTime && <span className={`mt-1 text-[10px] ${isMine ? 'mr-6 text-purple-500/50' : 'ml-2 text-dark-500'}`}>{time}</span>}
                      </div>
                      {isMine && (
                        <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                          <AvatarIcon id={avatarId} size={32} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-dark-800 flex gap-2 shrink-0">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-purple-500 text-sm" placeholder="Escribir mensaje..." />
              <button type="submit" disabled={!newMessage.trim()} className="cursor-pointer px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <span className="material-symbols-rounded text-lg">send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
