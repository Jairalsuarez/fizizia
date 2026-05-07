import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../features/auth/authContext'
import { getMyProjects } from '../api/projectsApi'
import { getProjectMessages, markProjectMessagesRead, sendProjectMessage, subscribeToMessages } from '../api/messagesApi'
import { useToast } from '../components/Toast'
import { AvatarIcon } from '../data/avatars.jsx'
import { supabase } from '../services/supabase'
import { getMessageAuthor, getMessageAvatarId } from '../utils/messageIdentity'
import { getDeliveryStatus, markMessageFailed, markMessageSent, mergeRealtimeMessage, mergeRealtimeMessages } from '../utils/messageStatus'
import { readStoredValue, writeStoredValue } from '../utils/persistedState'

let pendingId = Date.now()
function genId() { return `pending-${pendingId++}` }

function countUnreadMessages(messages, userId) {
  return (messages || []).filter(message => message.sender_id !== userId && !message.read_at).length
}

async function loadUnreadTotal(projects, userId) {
  if (!userId || !projects.length) return 0
  let total = 0
  for (const project of projects) {
    try {
      const messages = await getProjectMessages(project.id)
      total += countUnreadMessages(messages, userId)
    } catch {
      // Keep the badge resilient if one project query fails.
    }
  }
  return total
}

export function FloatingChat({ onUnreadChange }) {
  const { user } = useAuth()
  const userId = user?.id
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageAuthors, setMessageAuthors] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [showProjectPicker, setShowProjectPicker] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  const scrollMessagesToEnd = useCallback((behavior = 'auto') => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' }))
    })
  }, [])

  // Preload projects on mount
  useEffect(() => {
    let cancelled = false
    const preload = async () => {
      try {
        const projs = await getMyProjects()
        if (!cancelled) {
          setProjects(projs || [])
          setProjectsLoaded(true)
          const savedProjectId = readStoredValue('client-floating-chat-project', '')
          const savedProject = (projs || []).find(project => project.id === savedProjectId)
          if (savedProject) {
            setSelectedProject(savedProject)
            setShowProjectPicker(false)
          }
        }
      } catch (err) {
        console.error('Error preloading projects:', err)
        if (!cancelled) setProjectsLoaded(true)
      }
    }
    preload()
    return () => { cancelled = true }
  }, [])

  const syncUnreadCount = useCallback(async () => {
    const total = await loadUnreadTotal(projects, userId)
    setUnreadCount(total)
    if (onUnreadChange) onUnreadChange(total)
  }, [projects, userId, onUnreadChange])

  const markProjectSeen = useCallback(async (projectId) => {
    const readMessages = await markProjectMessagesRead(projectId)
    if (readMessages.length) {
      setMessages(prev => mergeRealtimeMessages(prev, readMessages))
    }
    syncUnreadCount()
  }, [syncUnreadCount])

  // Check for unread messages periodically
  useEffect(() => {
    let cancelled = false
    const checkUnread = async () => {
      const total = await loadUnreadTotal(projects, userId)
      if (!cancelled) {
        setUnreadCount(total)
        if (onUnreadChange) onUnreadChange(total)
      }
    }
    const initial = setTimeout(checkUnread, 0)
    const interval = setInterval(checkUnread, 30000)
    return () => {
      cancelled = true
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [userId, projects, onUnreadChange])

  const handleOpen = async () => {
    if (!isOpen && !projectsLoaded) {
      // Already preloaded, but fallback
      const projs = await getMyProjects()
      setProjects(projs || [])
      setProjectsLoaded(true)
    }
    if (!isOpen && selectedProject?.id) {
      markProjectSeen(selectedProject.id)
    }
    setIsOpen(prev => {
      const next = !prev
      if (next) scrollMessagesToEnd('auto')
      return next
    })
  }

  const handleSelectProject = (project) => {
    setSelectedProject(project)
    setShowProjectPicker(false)
    markProjectSeen(project.id)
  }

  useEffect(() => {
    writeStoredValue('client-floating-chat-project', selectedProject?.id)
  }, [selectedProject?.id])

  const handleBackToProjects = () => {
    setSelectedProject(null)
    setShowProjectPicker(true)
    setMessages([])
    setVisibleTimeMessageId(null)
    if (channelRef.current) channelRef.current.unsubscribe()
  }

  useEffect(() => {
    const openChat = (event) => {
      const projectId = event.detail?.projectId
      const project = projectId ? projects.find(item => item.id === projectId) : null
      if (project) {
        setSelectedProject(project)
        setShowProjectPicker(false)
        markProjectSeen(project.id)
      } else if (projects.length === 1) {
        setSelectedProject(projects[0])
        setShowProjectPicker(false)
        markProjectSeen(projects[0].id)
      }
      setIsOpen(true)
      scrollMessagesToEnd('auto')
    }

    window.addEventListener('fizzia-open-chat', openChat)
    return () => window.removeEventListener('fizzia-open-chat', openChat)
  }, [projects, markProjectSeen, scrollMessagesToEnd])

  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (event) => {
      if (panelRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  useEffect(() => {
    if (!selectedProject?.id || !isOpen) return

    let sub = null
    let pollInterval = null
    let cancelled = false

    getProjectMessages(selectedProject.id).then(msgs => {
      if (!cancelled) {
        setMessages(msgs || [])
        markProjectSeen(selectedProject.id)
      }
    })

    // Realtime subscription
    sub = subscribeToMessages(selectedProject.id, (payload) => {
      setMessages(prev => mergeRealtimeMessage(prev, payload))
      if (payload?.sender_id !== userId) markProjectSeen(selectedProject.id)
    })
    channelRef.current = sub

    // Polling fallback every 5s
    pollInterval = setInterval(async () => {
      const msgs = await getProjectMessages(selectedProject.id)
      if (!msgs || cancelled) return
      setMessages(prev => mergeRealtimeMessages(prev, msgs))
      markProjectSeen(selectedProject.id)
    }, 5000)

    return () => {
      cancelled = true
      if (sub) sub.unsubscribe()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [selectedProject?.id, isOpen, userId, markProjectSeen])

  useEffect(() => {
    if (!isOpen) return
    scrollMessagesToEnd(messages.length ? 'smooth' : 'auto')
  }, [messages, isOpen, scrollMessagesToEnd])

  useEffect(() => {
    if (isOpen && selectedProject?.id) scrollMessagesToEnd('auto')
  }, [isOpen, selectedProject?.id, showProjectPicker, scrollMessagesToEnd])

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

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedProject) return
    const content = newMessage.trim()
    setNewMessage('')
    const tempId = genId()
    const tempMsg = {
      id: tempId,
      project_id: selectedProject.id,
      sender_id: user?.id,
      content,
      created_at: new Date().toISOString(),
      _status: 'sending',
    }
    setMessages(prev => [...prev, tempMsg])
    try {
      const msg = await sendProjectMessage(selectedProject.id, content)
      setMessages(prev => markMessageSent(prev, tempId, msg))
    } catch (err) {
      console.error('Error:', err)
      setMessages(prev => markMessageFailed(prev, tempId))
      toast.error('Error al enviar el mensaje')
    }
  }

  const mySenderId = user?.id

  return (
    <>
      {/* Floating button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title={unreadCount > 0 ? `Tienes ${unreadCount} mensajes nuevos` : 'Preguntar al desarrollador sobre tu proyecto'}
        className="cursor-pointer fixed bottom-6 right-6 z-[900] w-14 h-14 bg-fizzia-500 rounded-full shadow-2xl shadow-fizzia-500/30 flex items-center justify-center hover:bg-fizzia-400 transition-all hover:scale-105 group"
      >
        <span className="material-symbols-rounded text-white text-2xl">
          {isOpen ? 'close' : 'chat'}
        </span>
        {!isOpen && (
          <span className="pointer-events-none absolute bottom-full right-0 mb-3 hidden w-56 rounded-xl border border-dark-700 bg-dark-950 px-3 py-2 text-left text-xs font-medium text-dark-200 shadow-xl group-hover:block">
            {unreadCount > 0 ? `Tienes ${unreadCount} mensajes nuevos` : 'Preguntar al desarrollador sobre tu proyecto'}
          </span>
        )}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div ref={panelRef} className="fixed bottom-24 right-6 z-[900] w-80 md:w-96 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-dark-950 border-b border-dark-700 p-3 flex items-center gap-3">
            {selectedProject && !showProjectPicker && (
              <button onClick={handleBackToProjects} className="cursor-pointer text-dark-400 hover:text-white">
                <span className="material-symbols-rounded text-lg">arrow_back</span>
              </button>
            )}
            <div className="flex-1 min-w-0">
              {selectedProject && !showProjectPicker ? (
                <>
                  <p className="text-white text-sm font-semibold truncate">{selectedProject.name}</p>
                  <p className="text-dark-500 text-xs">Chatea con el equipo de Fizzia</p>
                </>
              ) : (
                <>
                  <p className="text-white text-sm font-semibold">Soporte</p>
                  <p className="text-dark-500 text-xs">Selecciona un proyecto</p>
                </>
              )}
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          {/* Project picker or messages */}
          {showProjectPicker || !selectedProject ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-dark-400 text-xs text-center mb-2">¿Sobre qué proyecto quieres hablar?</p>
              {!projectsLoaded ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 bg-dark-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-rounded text-dark-600 text-4xl">folder_off</span>
                  <p className="text-dark-500 text-sm mt-2">No tienes proyectos aún</p>
                </div>
              ) : (
                projects.map(proj => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelectProject(proj)}
                    className="cursor-pointer w-full text-left p-3 bg-dark-800/50 border border-dark-700 rounded-xl hover:border-fizzia-500/50 transition-all"
                  >
                    <p className="text-white text-sm font-medium truncate">{proj.name}</p>
                    <p className="text-dark-500 text-xs mt-0.5">
                      {proj.status === 'solicitado' ? 'Solicitado' :
                       proj.status === 'preparando' ? 'Preparando' :
                       proj.status === 'delivered' ? 'Entregado' : proj.status}
                    </p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-dark-400 text-sm">Inicia la conversación</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === mySenderId
                    const status = getDeliveryStatus(msg, isMine)
                    const showTime = visibleTimeMessageId === msg.id
                    const author = getMessageAuthor(msg, messageAuthors)
                    const avatarId = getMessageAvatarId({ message: msg, isMine, author, currentUser: user })
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && (
                          <div className="h-7 w-7 rounded-full bg-white overflow-hidden shrink-0">
                            <AvatarIcon id={avatarId || '2'} size={28} />
                          </div>
                        )}
                        <div className={`flex max-w-[16rem] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <button
                            type="button"
                            onClick={() => setVisibleTimeMessageId(prev => prev === msg.id ? null : msg.id)}
                            className={`cursor-pointer px-3 py-2 rounded-2xl text-sm text-left ${
                              isMine
                                ? status === 'error' ? 'bg-red-500/80 text-white rounded-br-md'
                                : 'bg-fizzia-500 text-white rounded-br-md'
                                : 'bg-dark-800 text-dark-200 rounded-bl-md'
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
                          {showTime && (
                            <div className={`mt-1 text-[10px] ${isMine ? 'mr-6 text-fizzia-200/70' : 'ml-2 text-dark-500'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        {isMine && (
                          <div className="h-7 w-7 rounded-full bg-white overflow-hidden shrink-0">
                            <AvatarIcon id={avatarId || '1'} size={28} />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-2 border-t border-dark-800 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 text-sm"
                  placeholder="Escribe un mensaje..."
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="cursor-pointer px-3 py-2 bg-fizzia-500 text-white rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-rounded text-lg">send</span>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
