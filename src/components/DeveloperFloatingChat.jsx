import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../features/auth/authContext'
import { getInternalProjectMessages, markInternalProjectMessagesRead, sendInternalProjectMessage, subscribeToInternalProjectMessages } from '../api/messagesApi'
import { supabase } from '../services/supabase'
import { AvatarIcon } from '../data/avatars.jsx'
import { getDeliveryStatus, markMessageFailed, markMessageSent, mergeRealtimeMessage, mergeRealtimeMessages } from '../utils/messageStatus'
import { readStoredValue, writeStoredValue } from '../utils/persistedState'

let pendingId = Date.now()
function genId() { return `pending-floating-dev-${pendingId++}` }

export function DeveloperFloatingChat() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState(null)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  const scrollToEnd = useCallback((behavior = 'auto') => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' }))
    })
  }, [])

  useEffect(() => {
    const loadProjects = async () => {
      if (!user?.id) return
      const { data: assignments } = await supabase
        .from('project_developers')
        .select('project_id')
        .eq('developer_id', user.id)
      const ids = assignments?.map(item => item.project_id) || []
      if (!ids.length) return
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', ids)
        .order('created_at', { ascending: false })
      setProjects(data || [])
      const savedProjectId = readStoredValue('dev-floating-chat-project', '')
      const savedProject = (data || []).find(project => project.id === savedProjectId)
      setSelectedProject(prev => prev || savedProject || data?.[0] || null)
    }
    loadProjects()
  }, [user?.id])

  useEffect(() => {
    writeStoredValue('dev-floating-chat-project', selectedProject?.id)
  }, [selectedProject?.id])

  useEffect(() => {
    if (!isOpen || !selectedProject?.id) return
    let cancelled = false
    getInternalProjectMessages(selectedProject.id).then(data => {
      if (cancelled) return
      setMessages(data || [])
      markInternalProjectMessagesRead(selectedProject.id).then(readMessages => {
        if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
      })
      scrollToEnd('auto')
    })
    if (channelRef.current) channelRef.current.unsubscribe()
    channelRef.current = subscribeToInternalProjectMessages(selectedProject.id, payload => {
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
  }, [isOpen, selectedProject?.id, scrollToEnd, user?.id])

  useEffect(() => {
    if (!isOpen) return
    const handleOutside = event => {
      if (panelRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) scrollToEnd(messages.length ? 'smooth' : 'auto')
  }, [isOpen, messages, scrollToEnd])

  const handleSend = async event => {
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

  if (!projects.length) return null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        title="Hablar con admin"
        className="cursor-pointer fixed bottom-6 right-6 z-[900] flex h-14 w-14 items-center justify-center rounded-full bg-purple-500 text-white shadow-2xl shadow-purple-500/30 transition-all hover:scale-105 hover:bg-purple-400"
      >
        <span className="material-symbols-rounded text-2xl">{isOpen ? 'close' : 'forum'}</span>
      </button>

      {isOpen && (
        <div ref={panelRef} className="fixed bottom-24 right-6 z-[900] flex h-[480px] w-80 flex-col overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 shadow-2xl md:w-96">
          <div className="border-b border-dark-700 bg-dark-950 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">Admin</p>
                <p className="text-xs text-dark-500 truncate">{selectedProject?.name}</p>
              </div>
              {projects.length > 1 && (
                <select
                  value={selectedProject?.id || ''}
                  onChange={event => setSelectedProject(projects.find(project => project.id === event.target.value))}
                  className="cursor-pointer max-w-40 rounded-lg border border-dark-700 bg-dark-900 px-2 py-1 text-xs text-white outline-none"
                >
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-xs text-dark-500">
                Escribe al admin sobre este proyecto
              </div>
            ) : messages.map(message => {
              const isMine = message.sender_id === user?.id
              const status = getDeliveryStatus(message, isMine)
              const showTime = visibleTimeMessageId === message.id
              return (
                <div key={message.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && (
                    <div className="h-7 w-7 overflow-hidden rounded-full bg-white shrink-0">
                      <AvatarIcon id="16" size={28} />
                    </div>
                  )}
                  <div className={`flex max-w-[15rem] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <button
                        type="button"
                        onClick={() => setVisibleTimeMessageId(prev => prev === message.id ? null : message.id)}
                        className={`cursor-pointer rounded-2xl px-3 py-2 text-left text-sm ${
                          isMine ? 'rounded-br-md bg-purple-500 text-white' : 'rounded-bl-md bg-dark-800 text-dark-200'
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
                      <span className="mt-1 text-[10px] text-dark-500">
                        {new Date(message.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {isMine && (
                    <div className="h-7 w-7 overflow-hidden rounded-full bg-white shrink-0">
                      <AvatarIcon id={user?.avatar_id || '1'} size={28} />
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-dark-800 p-2">
            <input
              value={newMessage}
              onChange={event => setNewMessage(event.target.value)}
              className="flex-1 rounded-xl border border-dark-700 bg-dark-950 px-3 py-2 text-sm text-white outline-none placeholder:text-dark-500 focus:border-purple-500"
              placeholder="Mensaje interno..."
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="cursor-pointer rounded-xl bg-purple-500 px-3 py-2 text-white transition-colors hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-rounded text-lg">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
