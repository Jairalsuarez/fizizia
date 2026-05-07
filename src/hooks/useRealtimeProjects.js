import { useEffect } from 'react'
import { supabase } from '../services/supabase'

export function mergeRealtimeProject(projects, payload) {
  if (!payload?.id) return projects
  const exists = projects.some(project => project.id === payload.id)
  if (!exists) return [payload, ...projects]
  return projects.map(project => project.id === payload.id ? { ...project, ...payload } : project)
}

export function useRealtimeProject(projectId, onProjectChange) {
  useEffect(() => {
    if (!projectId) return undefined
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        payload => {
          if (payload.eventType === 'DELETE') onProjectChange(null, payload)
          else onProjectChange(payload.new, payload)
        }
      )
      .subscribe()
    return () => channel.unsubscribe()
  }, [projectId, onProjectChange])
}

export function useRealtimeProjects(onProjectChange) {
  useEffect(() => {
    const channel = supabase
      .channel('projects:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        payload => onProjectChange(payload)
      )
      .subscribe()
    return () => channel.unsubscribe()
  }, [onProjectChange])
}
