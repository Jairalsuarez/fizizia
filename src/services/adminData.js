import { supabase } from './supabase'

export function getSession() {
  return supabase.auth.getSession()
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signUp(email, password, fullName, metadata) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: 'client', ...metadata } }
  })
}

export async function checkEmailExists(email) {
  const { data, error } = await supabase.rpc('check_email_exists', { check_email: email })
  if (error) {
    console.error('RPC error:', error)
    return false
  }
  return data || false
}

export async function signOut() {
  return supabase.auth.signOut()
}

export function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
}

export async function loadDashboardData() {
  const [clients, projects, invoices, payments, expenses, leads, appointments] =
    await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(80),
      supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }).limit(80),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(80),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(80),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(80),
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(80),
      supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(80)
    ])

  return {
    clients: clients.data || [],
    projects: projects.data || [],
    invoices: invoices.data || [],
    payments: payments.data || [],
    expenses: expenses.data || [],
    leads: leads.data || [],
    appointments: appointments.data || []
  }
}

export async function createClient(payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('clients').insert(cleaned).select().single()
}

export async function deleteClient(id) {
  return supabase.from('clients').delete().eq('id', id)
}

export async function createProject(payload) {
  const cleaned = cleanPayload({
    ...payload,
    currency: payload.currency || 'USD',
    status: payload.status || 'solicitado'
  })
  return supabase.from('projects').insert(cleaned).select().single()
}

export async function updateProject(id, payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('projects').update(cleaned).eq('id', id).select().single()
}

export async function updateLead(id, payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('leads').update(cleaned).eq('id', id).select().single()
}

export async function convertLeadToInformal(lead) {
  const { data: client } = await createClient({
    name: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    source: lead.source || 'informal',
    notes: lead.notes || `Lead informal - ${lead.need_summary || 'Sin resumen'}`,
  })

  await supabase.from('leads').update({ status: 'informal' }).eq('id', lead.id)

  return client
}

export async function createInformalProject(clientId, projectData) {
  return createProject({
    client_id: clientId,
    name: projectData.name,
    description: projectData.description,
    budget: projectData.budget,
    status: 'discovery',
  })
}

export async function convertLeadToClient(lead) {
  const { data: client } = await createClient({
    name: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source
  })

  await supabase.from('leads').update({ status: 'won' }).eq('id', lead.id)

  return client
}

export async function createCharge(payload) {
  const { paid_amount, ...invoiceData } = payload
  const { data: invoice } = await supabase
    .from('invoices')
    .insert(cleanInvoiceData(invoiceData))
    .select()
    .single()

  if (paid_amount > 0) {
    await supabase.from('payments').insert({
      invoice_id: invoice.id,
      amount: paid_amount,
      payment_date: new Date().toISOString()
    })
  }

  return invoice
}

function cleanInvoiceData(data) {
  return cleanPayload(data)
}

export async function createPayment(payload) {
  const cleaned = cleanPayload(payload)
  const { data: payment } = await supabase
    .from('payments')
    .insert(cleaned)
    .select()
    .single()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount, payments:payments(amount)')
    .eq('id', cleaned.invoice_id)
    .single()

  if (invoice) {
    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
    if (totalPaid >= invoice.total_amount) {
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', cleaned.invoice_id)
    }
  }

  return payment
}

export async function createExpense(payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('expenses').insert(cleaned).select().single()
}

export async function getAllClients() {
  const { data } = await supabase
    .from('clients')
    .select(`
      *,
      projects:projects(count)
    `)
    .order('created_at', { ascending: false })
  return (data || []).map(c => ({
    ...c,
    project_count: c.projects?.[0]?.count || 0,
    projects: undefined,
  }))
}

export async function getAllProjects() {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getProjectsWithMessages() {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getAdminProjectMessages(projectId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) console.error('Error fetching admin messages:', error)
  return data || []
}

export async function sendAdminMessage(projectId, content) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('messages')
    .insert({ project_id: projectId, sender_id: user.id, content, is_admin_sender: true })
    .select()
    .single()
  return data
}

export function subscribeToAdminMessages(projectId, callback) {
  return supabase
    .channel(`admin-messages:${projectId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
      (payload) => callback(payload.new)
    )
    .subscribe()
}

export async function getPendingProjectRequests() {
  const { data } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('status', 'solicitado')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getOpenCharges() {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return data || []
}

export async function createInvoice(payload) {
  const cleaned = cleanPayload(payload)
  const { data } = await supabase
    .from('invoices')
    .insert(cleaned)
    .select()
    .single()
  return data
}

export async function getLeads() {
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function updateLeadStatus(id, status) {
  const { data } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  return data
}

export async function deleteLead(id) {
  return supabase.from('leads').delete().eq('id', id)
}

export async function readTable(table, columns = '*', orderColumn = 'created_at') {
  return supabase
    .from(table)
    .select(columns)
    .order(orderColumn, { ascending: false })
}

export function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )
}

export async function uploadProjectFileAdmin(projectId, file, note = '') {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
  const filePath = `${projectId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, file, { contentType: file.type, cacheControl: '3600' })

  if (uploadError) return { data: null, error: uploadError }

  const { data: publicUrl } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath)

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      uploader_id: user.id,
      file_name: file.name,
      file_url: publicUrl.publicUrl,
      storage_path: filePath,
      file_type: file.type,
      file_size: file.size,
      visibility: 'client',
      note,
    })
    .select()
    .single()

  return { data, error }
}

export async function getAllProjectFiles(projectId) {
  const { data } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function deleteProjectFile(fileId, storagePath) {
  if (storagePath) {
    await supabase.storage.from('project-files').remove([storagePath])
  }
  return supabase.from('project_files').delete().eq('id', fileId)
}

export async function getProjectInvoices(projectId) {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getProjectPayments(projectId) {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('project_id', projectId)
  const invoiceIds = invoices.map(i => i.id)
  if (!invoiceIds.length) return []
  const { data } = await supabase
    .from('payments')
    .select('*, invoices(invoice_number)')
    .in('invoice_id', invoiceIds)
    .order('paid_at', { ascending: false })
  return data || []
}

export async function getProjectInvoicesWithPayments(projectId) {
  const { data } = await supabase
    .from('invoices')
    .select('*, payments(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getProjectMilestones(projectId) {
  const { data } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
  return data || []
}

export async function createMilestone(payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('project_milestones').insert(cleaned).select().single()
}

export async function updateMilestone(id, payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('project_milestones').update(cleaned).eq('id', id).select().single()
}

export async function deleteMilestone(id) {
  return supabase.from('project_milestones').delete().eq('id', id)
}

export async function createInvoiceForProject(payload) {
  const cleaned = cleanPayload(payload)
  const { data } = await supabase
    .from('invoices')
    .insert(cleaned)
    .select()
    .single()
  return data
}

export async function getAllPendingPayments() {
  const { data } = await supabase
    .from('payments')
    .select(`
      *,
      projects(name, final_price, budget, client_id),
      clients(name, email)
    `)
    .eq('admin_status', 'pending')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getAllPayments() {
  console.log('Fetching all payments...')
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      projects!left(name, final_price, budget, client_id),
      clients!left(name, email)
    `)
    .order('created_at', { ascending: false })
  console.log('Payments result:', data?.length, 'rows, error:', error)
  return data || []
}

export async function approvePayment(paymentId, reviewedBy) {
  const { data } = await supabase
    .from('payments')
    .update({
      admin_status: 'approved',
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: reviewedBy,
    })
    .eq('id', paymentId)
    .select()
    .single()
  return { data, error: data ? null : { message: 'Error aprobando pago' } }
}

export async function rejectPayment(paymentId, reviewedBy, reason) {
  const { data } = await supabase
    .from('payments')
    .update({
      admin_status: 'rejected',
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: reviewedBy,
      admin_rejection_reason: reason,
    })
    .eq('id', paymentId)
    .select()
    .single()
  return { data, error: data ? null : { message: 'Error rechazando pago' } }
}

export async function getProjectTasks(projectId) {
  const { data } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
  return data || []
}

export async function createProjectTask(payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('project_tasks').insert(cleaned).select().single()
}

export async function updateProjectTask(id, payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('project_tasks').update(cleaned).eq('id', id).select().single()
}

export async function deleteProjectTask(id) {
  return supabase.from('project_tasks').delete().eq('id', id)
}

export async function getProjectFileRequests(projectId) {
  const { data } = await supabase
    .from('project_file_requests')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function createProjectFileRequest(projectId, requestText) {
  const { data } = await supabase
    .from('project_file_requests')
    .insert({ project_id: projectId, request_text: requestText })
    .select()
    .single()
  return data
}

export async function deleteProjectFileRequest(id) {
  return supabase.from('project_file_requests').delete().eq('id', id)
}

export async function updateClient(id, payload) {
  const cleaned = cleanPayload(payload)
  return supabase.from('clients').update(cleaned).eq('id', id).select().single()
}

export async function getAllClientProjects(clientId) {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function uploadPaymentProof(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
  const filePath = `payment-proofs/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, file, { contentType: file.type, cacheControl: '3600' })

  if (uploadError) return { data: null, error: uploadError }

  const { data: publicUrl } = supabase.storage
    .from('project-files')
    .getPublicUrl(filePath)

  return { data: publicUrl.publicUrl, error: null }
}
