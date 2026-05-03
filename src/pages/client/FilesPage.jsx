/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Card, Badge, Icon, EmptyState, Skeleton } from '../../components/ui/'
import { getMyFiles } from '../../services/clientData'
import { formatDate } from '../../utils/format'

export function FilesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadFiles() {
    try {
      setLoading(true)
      setError(null)
      const data = await getMyFiles()
      setFiles(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    loadFiles()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  const filesByProject = files.reduce((acc, file) => {
    const projectName = file.project_name || 'Uncategorized'
    if (!acc[projectName]) {
      acc[projectName] = []
    }
    acc[projectName].push(file)
    return acc
  }, {})

  const getFileIcon = (type) => {
    if (type?.includes('image')) return 'image'
    if (type?.includes('pdf')) return 'pdf'
    if (type?.includes('zip') || type?.includes('compressed')) return 'archive'
    if (type?.includes('text') || type?.includes('document')) return 'document'
    return 'file'
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white">Files</h1>

      {files.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(filesByProject).map(([projectName, projectFiles]) => (
            <div key={projectName}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Icon name="folder" className="w-5 h-5 text-primary-500" />
                <span>{projectName}</span>
                <Badge variant="default" className="ml-2">{projectFiles.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectFiles.map((file) => (
                  <Card key={file.id} className="bg-dark-900 border-dark-700 hover:border-dark-600 transition-colors">
                    <div className="p-5">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon
                            name={getFileIcon(file.type)}
                            className="w-5 h-5 text-primary-400"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate" title={file.title || file.name}>
                            {file.title || file.name}
                          </p>
                          <p className="text-dark-400 text-xs mt-1">
                            {formatDate(file.upload_date || file.created_at)}
                          </p>
                          {file.size && (
                            <p className="text-dark-500 text-xs mt-0.5">{file.size}</p>
                          )}
                        </div>
                      </div>
                      {file.url && (
                        <a
                          href={file.url}
                          download
                          className="mt-4 w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg text-sm transition-colors"
                        >
                          <Icon name="download" className="w-4 h-4" />
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Files Available"
          description="Files will appear here once they are uploaded to your projects"
          icon="file"
        />
      )}
    </div>
  )
}
