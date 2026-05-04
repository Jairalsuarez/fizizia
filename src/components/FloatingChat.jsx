import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../features/auth/authContext'
import { getMyProjects, getProjectMessages, sendProjectMessage, subscribeToMessages } from '../services/clientData'
import { useToast } from '../components/Toast'

export function FloatingChat({ onUnreadChange }) {
  const { session } = useAuth()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  // Preload projects on mount
  useEffect(() => {
    let cancelled = false
    const preload = async () => {
      try {
        const projs = await getMyProjects()
        if (!cancelled) {
          setProjects(projs || [])
          setProjectsLoaded(true)
        }
      } catch (err) {
        console.error('Error preloading projects:', err)
        if (!cancelled) setProjectsLoaded(true)
      }
    }
    preload()
    return () => { cancelled = true }
  }, [])

  // Check for unread messages periodically
  useEffect(() => {
    if (!session?.user || !projects.length) return

    const checkUnread = async () => {
      const myId = session.user.id
      let total = 0
      for (const proj of projects) {
        try {
          const msgs = await getProjectMessages(proj.id)
          // Count messages not from user
          const unread = msgs?.filter(m => m.sender_id !== myId).length || 0
          total += unread
        } catch { /* ignore */ }
      }
      setUnreadCount(total)
      if (onUnreadChange) onUnreadChange(total)
    }

    checkUnread()
    const interval = setInterval(checkUnread, 30000)
    return () => clearInterval(interval)
  }, [session?.user, projects, onUnreadChange])

  const handleOpen = useCallback(async () => {
    if (!isOpen && !projectsLoaded) {
      // Already preloaded, but fallback
      const projs = await getMyProjects()
      setProjects(projs || [])
      setProjectsLoaded(true)
    }
    if (isOpen) {
      // Clear unread when opening
      setUnreadCount(0)
      if (onUnreadChange) onUnreadChange(0)
    }
    setIsOpen(prev => !prev)
  }, [isOpen, projectsLoaded, onUnreadChange])

  const handleSelectProject = useCallback((project) => {
    setSelectedProject(project)
    setShowProjectPicker(false)
  }, [])

  const handleBackToProjects = useCallback(() => {
    setSelectedProject(null)
    setShowProjectPicker(true)
    setMessages([])
    if (channelRef.current) channelRef.current.unsubscribe()
  }, [])

  useEffect(() => {
    if (!selectedProject?.id || !isOpen) return

    let sub = null
    let pollInterval = null
    let cancelled = false

    getProjectMessages(selectedProject.id).then(msgs => {
      if (!cancelled) setMessages(msgs || [])
    })

    // Realtime subscription
    sub = subscribeToMessages(selectedProject.id, (payload) => {
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev
        return [...prev, payload]
      })
    })
    channelRef.current = sub

    // Polling fallback every 5s
    pollInterval = setInterval(async () => {
      const msgs = await getProjectMessages(selectedProject.id)
      if (!msgs || cancelled) return
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = msgs.filter(m => !existingIds.has(m.id))
        if (newMsgs.length === 0) return prev
        return [...prev, ...newMsgs]
      })
    }, 5000)

    return () => {
      cancelled = true
      if (sub) sub.unsubscribe()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [selectedProject?.id, isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !selectedProject) return
    const content = newMessage.trim()
    setSending(true)
    try {
      const msg = await sendProjectMessage(selectedProject.id, content)
      if (msg) {
        setNewMessage('')
      } else {
        toast.error('No se pudo enviar el mensaje')
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  const mySenderId = session?.user?.id

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-[900] w-14 h-14 bg-fizzia-500 rounded-full shadow-2xl shadow-fizzia-500/30 flex items-center justify-center hover:bg-fizzia-400 transition-all hover:scale-105"
      >
        <span className="material-symbols-rounded text-white text-2xl">
          {isOpen ? 'close' : 'chat'}
        </span>
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[900] w-80 md:w-96 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '480px' }}>
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
                      {proj.status === 'discovery' ? 'En descubrimiento' :
                       proj.status === 'active' ? 'En desarrollo' :
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
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          isMine
                            ? 'bg-fizzia-500 text-white rounded-br-md'
                            : 'bg-dark-800 text-dark-200 rounded-bl-md'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/60' : 'text-dark-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
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
                  disabled={!newMessage.trim() || sending}
                  className="cursor-pointer px-3 py-2 bg-fizzia-500 text-white rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sending ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="material-symbols-rounded text-lg">send</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
