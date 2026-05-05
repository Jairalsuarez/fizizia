import { useState, useEffect, useRef } from 'react'
import { getAllProjects, getAdminProjectMessages, sendAdminMessage, subscribeToAdminMessages, uploadProjectFileAdmin, getAllProjectFiles, deleteProjectFile } from '../../services/adminData'
import { supabase } from '../../services/supabase'
import { useToast } from '../../components/Toast'

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
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState(null)
  const [activeTab, setActiveTab] = useState('messages')
  const [projectFiles, setProjectFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileNote, setFileNote] = useState('')
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        setMyId(userData?.user?.id)
        const projects = await getAllProjects()
        setProjects(projects.filter(p => p.name && p.name.trim() !== ''))
      } catch {
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      const loadMessages = async () => {
        const msgs = await getAdminProjectMessages(selectedProject.id)
        setMessages(msgs)
        const files = await getAllProjectFiles(selectedProject.id)
        setProjectFiles(files)
      }
      loadMessages()

      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }

      channelRef.current = subscribeToAdminMessages(selectedProject.id, (payload) => {
        setMessages(prev => [...prev, payload])
      })
    }
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [selectedProject])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedProject) return
    const content = newMessage.trim()
    setNewMessage('')
    try {
      await sendAdminMessage(selectedProject.id, content)
    } catch {
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
                      const isAdmin = msg.sender_id === myId || msg.is_admin_sender
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-sm lg:max-w-md px-4 py-3 rounded-2xl text-sm ${
                            isAdmin
                              ? 'bg-fizzia-500/20 text-fizzia-300 rounded-br-md'
                              : 'bg-dark-800 text-dark-200 rounded-bl-md'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isAdmin ? 'text-fizzia-500/60' : 'text-dark-500'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                              {isAdmin && <span className="ml-1">(tú)</span>}
                            </p>
                          </div>
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
                    placeholder="Responder..."
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
