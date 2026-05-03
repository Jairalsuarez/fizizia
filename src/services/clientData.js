import { supabase } from './supabase'

async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id
}

export async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function getMyProfile() {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function getMyClient() {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data: link } = await supabase
    .from('client_users')
    .select('client_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!link) return null
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', link.client_id)
    .maybeSingle()
  return data
}

export async function getMyProjects() {
  const client = await getMyClient()
  if (!client) return []
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', client.id)
  return data || []
}

export async function getMyProjectMilestones(projectId) {
  const { data } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
  return data || []
}

export async function getMyInvoices() {
  const client = await getMyClient()
  if (!client) return []
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', client.id)
  return data || []
}

export async function getMyFiles() {
  const projects = await getMyProjects()
  if (!projects.length) return []
  const projectIds = projects.map(p => p.id)
  const { data } = await supabase
    .from('project_files')
    .select('*')
    .in('project_id', projectIds)
    .eq('visibility', 'client')
  return data || []
}

export async function updateProfile(payload) {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )
  const { data } = await supabase
    .from('profiles')
    .update(cleaned)
    .eq('id', userId)
    .select()
    .maybeSingle()
  return data
}
