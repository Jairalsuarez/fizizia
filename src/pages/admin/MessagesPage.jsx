import { useState, useEffect, useRef, useCallback } from 'react'
import { getAllProjects } from '../../api/projectsApi'
import { getAdminProjectMessages, markAdminProjectMessagesRead, sendAdminMessage, subscribeToAdminMessages } from '../../api/messagesApi'
import { deleteProjectFile, getAllProjectFiles, uploadProjectFileAdmin } from '../../api/filesApi'
import { supabase } from '../../services/supabase'
import { useToast } from '../../components/Toast'
import { AvatarIcon } from '../../data/avatars.jsx'
import { getMessageAuthor, getMessageAuthorName, getMessageAvatarId } from '../../utils/messageIdentity'
import { getDeliveryStatus, markMessageFailed, markMessageSent, mergeRealtimeMessage, mergeRealtimeMessages } from '../../utils/messageStatus'
import { readStoredValue, writeStoredValue } from '../../utils/persistedState'
import { mergeRealtimeProject, useRealtimeProjects } from '../../hooks/useRealtimeProjects'

let pendingId = Date.now()
function genId() { return `pending-${pendingId++}` }

const statusLabels = {
  solicitado: '📋 Solicitado',
  preparando: '🔧 Preparando',
  trabajando: '⚡ Trabajando',
  pausado: '⏸ Pausado',
  entregado: '✅ Entregado',
  cancelado: '❌ Cancelado',
}

export function MessagesPage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageAuthors, setMessageAuthors] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [visibleTimeMessageId, setVisibleTimeMessageId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState(null)
  const [activeTab, setActiveTab] = useState(() => readStoredValue('admin-messages-tab', 'messages', value => ['messages', 'files'].includes(value)))
  const [conversationMode, setConversationMode] = useState(() => readStoredValue('admin-messages-mode', 'client', value => ['client', 'internal'].includes(value)))
  const [projectFiles, setProjectFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileNote, setFileNote] = useState('')
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const toast = useToast()

  const handleRealtimeProject = useCallback((payload) => {
    if (payload.eventType === 'DELETE') {
      setProjects(prev => prev.filter(project => project.id !== payload.old.id))
      setSelectedProject(prev => prev?.id === payload.old.id ? null : prev)
      return
    }
    if (!payload.new?.name?.trim()) return
    setProjects(prev => mergeRealtimeProject(prev, payload.new))
    setSelectedProject(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev)
  }, [])

  useRealtimeProjects(handleRealtimeProject)

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        setMyId(userData?.user?.id)
        const projects = await getAllProjects()
        const cleanProjects = projects.filter(p => p.name && p.name.trim() !== '')
        setProjects(cleanProjects)
        const savedProjectId = readStoredValue('admin-messages-project', '')
        const savedProject = cleanProjects.find(project => project.id === savedProjectId)
        if (savedProject) setSelectedProject(savedProject)
      } catch {
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

  useEffect(() => {
    writeStoredValue('admin-messages-tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    writeStoredValue('admin-messages-mode', conversationMode)
  }, [conversationMode])

  useEffect(() => {
    writeStoredValue('admin-messages-project', selectedProject?.id)
  }, [selectedProject?.id])

  useEffect(() => {
    if (selectedProject) {
      const loadMessages = async () => {
        const msgs = await getAdminProjectMessages(selectedProject.id, conversationMode)
        setMessages(msgs)
        markAdminProjectMessagesRead(selectedProject.id, conversationMode).then(readMessages => {
          if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
        })
        const files = await getAllProjectFiles(selectedProject.id)
        setProjectFiles(files)
      }
      loadMessages()

      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }

      channelRef.current = subscribeToAdminMessages(selectedProject.id, (payload) => {
        setMessages(prev => mergeRealtimeMessage(prev, payload))
        if (payload?.sender_id !== myId) {
          markAdminProjectMessagesRead(selectedProject.id, conversationMode).then(readMessages => {
            if (readMessages.length) setMessages(prev => mergeRealtimeMessages(prev, readMessages))
          })
        }
      }, conversationMode)
    }
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [selectedProject, myId, conversationMode])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedProject) return
    const content = newMessage.trim()
    setNewMessage('')
    const tempId = genId()
    const tempMsg = {
      id: tempId,
      project_id: selectedProject.id,
      sender_id: myId,
      content,
      created_at: new Date().toISOString(),
      is_admin_sender: true,
      channel: conversationMode,
      _status: 'sending',
    }
    setMessages(prev => [...prev, tempMsg])
    try {
      const msg = await sendAdminMessage(selectedProject.id, content, conversationMode)
      setMessages(prev => markMessageSent(prev, tempId, msg || {}))
    } catch {
      setMessages(prev => markMessageFailed(prev, tempId))
      console.error('Error sending message')
    }
  }

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length || !selectedProject) return
    setUploadingFile(true)
    for (const file of selectedFiles) {
      const result = await uploadProjectFileAdmin(selectedProject.id, file, fileNote)
      if (result.error) {
        toast.error(`Error al subir ${file.name}`)
      } else {
        setProjectFiles(prev => [result.data, ...prev])
      }
    }
    setUploadingFile(false)
    setFileNote('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.success(selectedFiles.length > 1 ? `${selectedFiles.length} archivos subidos` : 'Archivo subido')
  }

  const handleDeleteFile = async (fileId, storagePath) => {
    await deleteProjectFile(fileId, storagePath)
    setProjectFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('Archivo eliminado')
  }

  const getFileIcon = (file) => {
    if (file.file_type?.includes('image')) return 'image'
    if (file.file_type?.includes('pdf')) return 'picture_as_pdf'
    if (file.file_type?.includes('zip') || file.file_type?.includes('rar')) return 'folder_zip'
    return 'attach_file'
  }

  const getFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const projectsWithUnread = projects.map(p => ({
    ...p,
    unread: p.status === 'solicitado'
  }))

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-96 bg-dark-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] lg:h-[calc(100vh-4rem)]">
      {/* Project list sidebar */}
      <div className="w-80 border-r border-dark-800 bg-dark-900/50 flex flex-col">
        <div className="p-4 border-b border-dark-800">
          <h2 className="text-white font-bold">Mensajes</h2>
          <p className="text-dark-400 text-xs mt-0.5">{projects.length} proyectos</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {projectsWithUnread.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-dark-500 text-sm">No hay proyectos</p>
            </div>
          ) : (
            projectsWithUnread.map(project => (
              <button
                onClick={() => setSelectedProject(project)}
                className={`cursor-pointer w-full text-left p-4 border-b border-dark-800 hover:bg-dark-800/50 transition-colors ${
                  selectedProject?.id === project.id ? 'bg-fizzia-500/10 border-l-2 border-l-fizzia-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{project.name}</p>
                    <p className="text-dark-400 text-xs mt-0.5">{project.clients?.name || 'Sin cliente'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-dark-800 text-dark-300">
                    {statusLabels[project.status] || project.status}
                  </span>
                </div>
                {(project.final_price || project.budget) && (
                  <p className="text-dark-500 text-xs mt-1">${Number(project.final_price || project.budget).toLocaleString()}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedProject ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-dark-400">Selecciona un proyecto para ver los mensajes</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-dark-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold">{selectedProject.name}</h3>
                  <p className="text-dark-400 text-xs mt-0.5">
                    {statusLabels[selectedProject.status]} · {selectedProject.clients?.name || 'Sin cliente'}
                  </p>
                </div>
                <div className="flex gap-1 bg-dark-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'messages' ? 'bg-fizzia-500 text-white' : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    Mensajes
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'files' ? 'bg-fizzia-500 text-white' : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    Archivos
                  </button>
                </div>
              </div>
              {activeTab === 'messages' && (
                <div className="mt-3 flex w-fit gap-1 rounded-lg bg-dark-800 p-0.5">
                  <button
                    onClick={() => setConversationMode('client')}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      conversationMode === 'client' ? 'bg-fizzia-500 text-white' : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    Cliente
                  </button>
                  <button
                    onClick={() => setConversationMode('internal')}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      conversationMode === 'internal' ? 'bg-purple-500 text-white' : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    Equipo interno
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'messages' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-dark-400 text-sm">No hay mensajes aún. Inicia la conversación.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === myId
                      const status = getDeliveryStatus(msg, isMine)
                      const author = getMessageAuthor(msg, messageAuthors)
                      const authorName = getMessageAuthorName({ message: msg, isMine, author, clientName: conversationMode === 'internal' ? 'Developer' : selectedProject.clients?.name || 'Cliente' })
                      const avatarId = getMessageAvatarId({ message: msg, isMine, author, currentUser: messageAuthors[myId] })
                      const time = new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                      const showTime = visibleTimeMessageId === msg.id
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {!isMine && (
                            <div className="h-8 w-8 rounded-full bg-white overflow-hidden shrink-0">
                              <AvatarIcon id={avatarId} size={32} />
                            </div>
                          )}
                          <div className={`flex max-w-[70%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            <span className={`mb-1 text-[11px] font-medium ${isMine ? 'text-fizzia-400' : 'text-dark-400'}`}>
                              {authorName}
                            </span>
                            <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                              <button
                                type="button"
                                onClick={() => setVisibleTimeMessageId(prev => prev === msg.id ? null : msg.id)}
                                className={`cursor-pointer rounded-2xl px-4 py-3 text-left text-sm ${
                                  isMine
                                    ? status === 'error' ? 'bg-red-500/80 text-white rounded-br-sm' : 'bg-fizzia-500 text-white rounded-br-sm'
                                    : 'bg-dark-800 text-dark-100 rounded-bl-sm'
                                }`}
                              >
                                <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                              </button>
                              {isMine && (
                                <span className={`mb-1 flex h-4 w-4 items-center justify-center ${status === 'error' ? 'text-red-400' : 'text-dark-500'}`}>
                                  {status === 'sending' && <span className="h-3 w-3 animate-spin rounded-full border-2 border-dark-500 border-t-transparent" />}
                                  {status === 'sent' && <span className="material-symbols-rounded text-[13px]">check</span>}
                                  {status === 'read' && <span className="material-symbols-rounded text-[13px] text-sky-400">done_all</span>}
                                  {status === 'error' && <span className="material-symbols-rounded text-[13px] text-red-400">error</span>}
                                </span>
                              )}
                            </div>
                            {showTime && <span className="mt-1 text-[10px] text-dark-500">{time}</span>}
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
                <form onSubmit={handleSend} className="p-3 border-t border-dark-800 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 text-sm"
                    placeholder={conversationMode === 'internal' ? 'Responder al developer...' : 'Responder al cliente...'}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="cursor-pointer px-4 py-2.5 bg-fizzia-500 text-white rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </form>
              </>
            )}

            {activeTab === 'files' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-dark-800/50 rounded-xl p-4">
                  <h4 className="text-white text-sm font-medium mb-3">Enviar archivos al cliente</h4>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.zip,.rar,.psd,.ai,.fig,.sketch,.mp4,.mov,.svg"
                  />
                  <textarea
                    value={fileNote}
                    onChange={(e) => setFileNote(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-fizzia-500 resize-none transition-all mb-2"
                    rows={2}
                    placeholder="Nota opcional (ej: versión final del diseño...)"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="cursor-pointer w-full py-2.5 bg-fizzia-500/10 border border-fizzia-500/30 text-fizzia-400 text-sm font-medium rounded-lg hover:bg-fizzia-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {uploadingFile ? 'Subiendo...' : (
                      <>
                        <span className="material-symbols-rounded text-base">cloud_upload</span>
                        Seleccionar archivos
                      </>
                    )}
                  </button>
                </div>

                {projectFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-dark-400 text-sm">No hay archivos en este proyecto</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 bg-dark-800/50 rounded-xl p-3 group"
                      >
                        <div className="w-9 h-9 bg-dark-700 rounded-lg flex items-center justify-center shrink-0">
                          <span className="material-symbols-rounded text-fizzia-400 text-lg">{getFileIcon(file)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-dark-500 text-xs">
                            {getFileSize(file.file_size)}
                            {file.note && ` · ${file.note}`}
                          </p>
                        </div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-700 transition-all"
                        >
                          <span className="material-symbols-rounded text-lg">download</span>
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.id, file.storage_path)}
                          className="cursor-pointer p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-rounded text-lg">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
