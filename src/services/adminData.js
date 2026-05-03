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
    options: { data: { full_name: fullName, ...metadata } }
  })
}

export async function checkEmailExists(email) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
  return (data?.length || 0) > 0
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function loadDashboardData() {
  const [clients, projects, invoices, payments, expenses, leads, appointments] =
    await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(80),
      supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(80),
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
    status: payload.status || 'discovery'
  })
  return supabase.from('projects').insert(cleaned).select().single()
}

export async function convertLeadToClient(lead) {
  const { data: client } = await createClient({
    full_name: lead.full_name,
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
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getAllProjects() {
  const { data } = await supabase
    .from('projects')
    .select('*')
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
