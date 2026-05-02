import { supabase } from './supabaseClient'

export async function getAdminOverview() {
  if (!supabase) {
    return {
      leads: [],
      clients: [],
      projects: [],
      tasks: [],
      invoices: [],
      landingProjects: [],
    }
  }

  const [leads, clients, projects, tasks, invoices, landingProjects] = await Promise.all([
    supabase
      .from('leads')
      .select('id,full_name,email,phone,company_name,tax_id,province,city,status,service_id,budget_range,need_summary,converted_client_id,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('clients')
      .select('id,name,status,city,province,created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('projects')
      .select('id,client_id,name,status,budget,currency,due_date,created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('project_tasks')
      .select('id,title,status,priority,due_at,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('invoices')
      .select('id,invoice_number,status,total,currency,due_at,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('portfolio_projects')
      .select('id,slug,title,summary,industry,website_url,is_featured,is_published,sort_order,created_at')
      .order('sort_order', { ascending: true })
      .limit(50),
  ])

  return {
    leads: leads.data || [],
    clients: clients.data || [],
    projects: projects.data || [],
    tasks: tasks.data || [],
    invoices: invoices.data || [],
    landingProjects: landingProjects.data || [],
  }
}

export async function createClient(payload) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      city: payload.city || null,
      province: payload.province || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) throwAdminError(error)
  return data
}

export async function convertLeadToClient(lead) {
  if (!lead?.id) {
    throw new Error('No se encontro el lead para convertirlo.')
  }

  if (lead.converted_client_id || lead.status === 'won') {
    throw new Error('Este lead ya fue convertido en cliente.')
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: lead.company_name || lead.full_name,
      legal_name: lead.company_name || null,
      tax_id: lead.tax_id || null,
      email: lead.email || null,
      phone: lead.phone || null,
      province: lead.province || null,
      city: lead.city || null,
      notes: lead.need_summary || null,
      status: 'active',
      created_from_lead_id: lead.id,
    })
    .select()
    .single()

  if (clientError) throwAdminError(clientError)

  if (lead.full_name || lead.email || lead.phone) {
    const { error: contactError } = await supabase
      .from('client_contacts')
      .insert({
        client_id: client.id,
        full_name: lead.full_name || lead.company_name || 'Contacto principal',
        email: lead.email || null,
        phone: lead.phone || null,
        whatsapp: lead.phone || null,
        is_primary: true,
      })

    if (contactError) throwAdminError(contactError)
  }

  const { error: leadError } = await supabase
    .from('leads')
    .update({
      status: 'won',
      converted_client_id: client.id,
      won_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  if (leadError) throwAdminError(leadError)

  return client
}

export async function createProject(payload) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_id: payload.client_id,
      name: payload.name,
      description: payload.description || null,
      status: payload.status || 'discovery',
      budget: payload.budget ? Number(payload.budget) : null,
      currency: 'USD',
      due_date: payload.due_date || null,
    })
    .select()
    .single()

  if (error) throwAdminError(error)
  return data
}

export async function createLandingProject(payload) {
  const normalizedUrl = normalizeProjectUrl(payload.website_url)
  const host = getProjectHost(normalizedUrl)
  const title = payload.title?.trim() || host.replace(/^www\./, '')
  const slug = payload.slug || toSlug(`${title}-${Date.now().toString(36)}`)

  const { data, error } = await supabase
    .from('portfolio_projects')
    .insert({
      slug,
      title,
      industry: payload.industry || null,
      summary: payload.summary || `Proyecto publicado en ${host}.`,
      website_url: normalizedUrl,
      is_featured: Boolean(payload.is_featured),
      is_published: Boolean(payload.is_published),
      sort_order: payload.sort_order ? Number(payload.sort_order) : 10,
    })
    .select()
    .single()

  if (error) throwAdminError(error)
  return data
}

export async function deleteLandingProject(projectId) {
  const { error } = await supabase
    .from('portfolio_projects')
    .delete()
    .eq('id', projectId)

  if (error) throwAdminError(error)
}

export async function updateLandingProjectVisibility(projectId, updates) {
  const { data, error } = await supabase
    .from('portfolio_projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throwAdminError(error)
  return data
}

export async function getCurrentProfile() {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id

  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id,role,is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error) throwAdminError(error)
  return data
}

function normalizeProjectUrl(value) {
  const trimmedValue = value.trim()
  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`
}

function getProjectHost(value) {
  try {
    return new URL(value).hostname || 'proyecto'
  } catch {
    return 'proyecto'
  }
}

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function throwAdminError(error) {
  if (error?.code === '42501' || error?.message?.toLowerCase().includes('row-level security')) {
    throw new Error('Supabase bloqueo esta accion por RLS. Ejecuta supabase/admin_app_policies.sql y confirma que tu profile tenga role admin.')
  }

  throw error
}
