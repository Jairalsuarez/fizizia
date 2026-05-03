/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Card, StatusBadge, Icon, EmptyState, Skeleton } from '../../components/ui/'
import { getMyProjects, getMyProjectMilestones } from '../../services/clientData'
import { formatMoney, formatDate } from '../../utils/format'
import { formatRelative } from '../../utils/dates'

export function ProjectPage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getMyProjects()
      setProjects(data || [])
      if (data && data.length > 0) {
        setSelectedProject(data[0])
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const loadMilestones = async (projectId) => {
    try {
      const data = await getMyProjectMilestones(projectId)
      setMilestones(data || [])
    } catch (err) {
      console.error('Failed to load milestones:', err)
    }
  }

  useEffect(() => { 
    loadProjects()
  }, [])

  useEffect(() => { 
    if (selectedProject) {
      loadMilestones(selectedProject.id)
    }
  }, [selectedProject])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
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

  if (projects.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No Projects Found"
          description="You don't have any projects yet. Please contact us to get started."
          icon="folder"
        />
      </div>
    )
  }

  const progress = milestones.length > 0
    ? Math.round((milestones.filter(m => m.status === 'done').length / milestones.length) * 100)
    : 0

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white">My Projects</h1>

      {projects.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedProject?.id === project.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}

      {selectedProject && (
        <>
          <Card className="bg-dark-900 border-dark-700">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedProject.name}</h2>
                  <StatusBadge status={selectedProject.status} className="mt-2" />
                </div>
                <Icon name="folder" className="w-10 h-10 text-primary-500" />
              </div>

              {selectedProject.description && (
                <p className="text-dark-300 mt-4">{selectedProject.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {selectedProject.budget && (
                  <div className="bg-dark-800 p-4 rounded-lg">
                    <p className="text-dark-400 text-sm">Budget</p>
                    <p className="text-white font-semibold mt-1">
                      {formatMoney(selectedProject.budget)}
                    </p>
                  </div>
                )}
                {selectedProject.start_date && (
                  <div className="bg-dark-800 p-4 rounded-lg">
                    <p className="text-dark-400 text-sm">Start Date</p>
                    <p className="text-white font-semibold mt-1">
                      {formatDate(selectedProject.start_date)}
                    </p>
                  </div>
                )}
                {selectedProject.due_date && (
                  <div className="bg-dark-800 p-4 rounded-lg">
                    <p className="text-dark-400 text-sm">Due Date</p>
                    <p className="text-white font-semibold mt-1">
                      {formatDate(selectedProject.due_date)}
                    </p>
                  </div>
                )}
              </div>

              {(selectedProject.staging_url || selectedProject.production_url) && (
                <div className="flex space-x-3 mt-6">
                  {selectedProject.staging_url && (
                    <a
                      href={selectedProject.staging_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Icon name="external-link" className="w-4 h-4" />
                      <span>Staging</span>
                    </a>
                  )}
                  {selectedProject.production_url && (
                    <a
                      href={selectedProject.production_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Icon name="external-link" className="w-4 h-4" />
                      <span>Production</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-dark-900 border-dark-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Milestones</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-dark-400 text-sm">{progress}%</span>
                </div>
              </div>

              {milestones.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-dark-700" />
                  <div className="space-y-6">
                    {milestones.map((milestone, index) => (
                      <div key={milestone.id} className="flex items-start space-x-4">
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          milestone.status === 'done' ? 'bg-green-600' :
                          milestone.status === 'review' ? 'bg-yellow-600' :
                          milestone.status === 'doing' ? 'bg-blue-600' :
                          milestone.status === 'blocked' ? 'bg-red-600' :
                          'bg-dark-600'
                        }`}>
                          {milestone.status === 'done' ? (
                            <Icon name="check" className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 bg-dark-800 p-4 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-white font-medium">{milestone.title}</h4>
                              {milestone.description && (
                                <p className="text-dark-400 text-sm mt-1">{milestone.description}</p>
                              )}
                              {milestone.due_date && (
                                <p className="text-dark-500 text-xs mt-2">
                                  Due {formatRelative(milestone.due_date)}
                                </p>
                              )}
                            </div>
                            <StatusBadge status={milestone.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No Milestones"
                  description="Milestones will appear here once they are defined"
                  icon="flag"
                />
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
