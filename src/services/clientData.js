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
    .select('*, payments(*)')
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
  if (!userId) return { data: null, error: 'No se pudo identificar tu usuario' }

  const cleaned = Object.fromEntries(
    Object.entries(payload)
      .filter(([k, v]) => k !== 'email' && v !== null && v !== undefined && v !== '')
  )

  if (Object.keys(cleaned).length === 0) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(cleaned)
    .eq('id', userId)
    .select()
    .maybeSingle()

  return { data: data ? { ...data } : null, error }
}

export async function updatePassword(currentPassword, newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  })
  return { data, error }
}

export async function getProjectMessages(projectId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('channel', 'client')
    .order('created_at', { ascending: true })
  if (error?.code === '42703' || String(error?.message || '').includes('channel')) {
    const fallback = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (fallback.error) console.error('Error fetching messages:', fallback.error)
    return fallback.data || []
  }
  if (error) console.error('Error fetching messages:', error)
  return data || []
}

export async function sendProjectMessage(projectId, content) {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from('messages')
    .insert({ project_id: projectId, sender_id: userId, content, channel: 'client' })
    .select()
    .single()
  if (error?.code === '42703' || String(error?.message || '').includes('channel')) {
    const fallback = await supabase
      .from('messages')
      .insert({ project_id: projectId, sender_id: userId, content })
      .select()
      .single()
    if (fallback.error) console.error('Error sending message:', fallback.error)
    return fallback.data
  }
  if (error) console.error('Error sending message:', error)
  return data
}

export async function markProjectMessagesRead(projectId) {
  const userId = await getCurrentUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString(), read_by: userId })
    .eq('project_id', projectId)
    .eq('channel', 'client')
    .neq('sender_id', userId)
    .is('read_at', null)
    .select()
  if (error?.code === '42703' || String(error?.message || '').includes('channel')) {
    const fallback = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString(), read_by: userId })
      .eq('project_id', projectId)
      .neq('sender_id', userId)
      .is('read_at', null)
      .select()
    if (fallback.error) console.error('Error marking messages as read:', fallback.error)
    return fallback.data || []
  }
  if (error) console.error('Error marking messages as read:', error)
  return data || []
}

export function subscribeToMessages(projectId, callback) {
  return supabase
    .channel(`messages:${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
      (payload) => {
        if (!payload.new) return
        if (!payload.new?.channel || payload.new.channel === 'client') callback(payload.new)
      }
    )
    .subscribe()
}

export async function getProjectFiles(projectId) {
  const { data } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .in('visibility', ['client', 'public'])
    .order('created_at', { ascending: false })
  return data || []
}

export async function createProjectRequest(name, description, budget, details) {
  const userId = await getCurrentUserId()
  if (!userId) return { project: null, error: 'No se pudo identificar tu usuario' }

  let client = await getMyClient()

  if (!client) {
    const profile = await getProfile(userId)
    const clientName = profile?.full_name || profile?.email || 'Cliente'
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: clientName,
        email: profile?.email || '',
        phone: profile?.phone || '',
        status: 'active'
      })
      .select()
      .single()

    if (clientError || !newClient) {
      console.error('Error creating client:', clientError)
      return { project: null, error: clientError?.message || 'No se pudo crear tu perfil de cliente' }
    }

    const { error: linkError } = await supabase
      .from('client_users')
      .insert({ user_id: userId, client_id: newClient.id })

    if (linkError) {
      console.error('Error linking client:', linkError)
      return { project: null, error: 'No se pudo vincular tu cuenta' }
    }

    client = newClient
  }

  const { data, error: projectError } = await supabase
    .from('projects')
    .insert({
      client_id: client.id,
      name,
      description: details ? `${description}\n\n${details}` : description,
      status: 'solicitado',
      budget: budget || 0,
    })
    .select()
    .single()

  if (projectError) {
    console.error('Error creating project:', projectError)
    return { project: null, error: projectError.message }
  }

  return { project: data, error: null }
}

export async function getProjectFileRequests(projectId) {
  const { data } = await supabase
    .from('project_file_requests')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function fulfillFileRequest(requestId, fileId = null) {
  const { data, error } = await supabase
    .from('project_file_requests')
    .update({ fulfilled: true, fulfilled_file_id: fileId, fulfilled_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  return { data, error }
}

export async function getProjectInvoices(projectId) {
  const { data } = await supabase
    .from('invoices')
    .select('*, payments(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getProjectDirectPayments(projectId) {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .is('invoice_id', null)
    .order('created_at', { ascending: false })
  return data || []
}

export async function createClientPayment(payload) {
  const userId = await getCurrentUserId()
  if (!userId) return { data: null, error: 'No autenticado' }

  let client_id = payload.client_id

  if (!client_id) {
    const { data: link } = await supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', userId)
      .maybeSingle()

    client_id = link?.client_id

    if (!client_id) {
      const profile = await getProfile(userId)
      const clientEmail = profile?.email || ''
      const clientName = profile?.full_name || clientEmail || 'Cliente'

      // Try to find existing client by email first
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', clientEmail)
        .maybeSingle()

      let newClient
      if (existingClient) {
        console.log('Found existing client by email:', existingClient.id)
        newClient = { id: existingClient.id }
      } else {
        console.log('Creating client record for user:', userId)
        const { data, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: clientName,
            email: clientEmail,
            phone: profile?.phone || '',
            status: 'active'
          })
          .select()
          .single()

        if (clientError) {
          console.error('Error creating client:', JSON.stringify(clientError))
          return { data: null, error: clientError.message }
        }
        if (!data) {
          return { data: null, error: 'No se pudo crear tu perfil de cliente' }
        }
        newClient = data
      }

      console.log('Linking client:', newClient.id, 'to user:', userId)
      const { error: linkError } = await supabase
        .from('client_users')
        .insert({ user_id: userId, client_id: newClient.id })

      if (linkError) {
        console.error('Error linking client:', JSON.stringify(linkError))
        return { data: null, error: 'No se pudo vincular tu cuenta: ' + linkError.message }
      }

      client_id = newClient.id
      console.log('Client linked successfully. client_id:', client_id)
    }
  }

  const insertData = {
    client_id,
    project_id: payload.project_id || undefined,
    amount: payload.amount,
    currency: payload.currency || 'USD',
    method: payload.method,
    reference: payload.reference || undefined,
    notes: payload.notes || undefined,
    paid_at: payload.paid_at || new Date().toISOString(),
    admin_status: payload.admin_status || 'pending',
    account_holder_name: payload.account_holder_name || undefined,
    account_cedula: payload.account_cedula || undefined,
    proof_url: payload.proof_url || undefined,
  }

  if (payload.invoice_id) {
    insertData.invoice_id = payload.invoice_id
  }

  const cleaned = Object.fromEntries(
    Object.entries(insertData).filter(([, v]) => v !== null && v !== undefined)
  )

  console.log('Inserting payment:', cleaned)

  const { data, error } = await supabase
    .from('payments')
    .insert(cleaned)
    .select()
    .maybeSingle()

  if (error) {
    console.error('Supabase payment insert error:', JSON.stringify(error))
    return { data: null, error }
  }

  if (data) {
    console.log('Payment inserted successfully:', data)
    return { data, error: null }
  }

  // INSERT succeeded but SELECT returned null (RLS blocking read).
  // Return the data we sent so the UI can still show success.
  console.warn('Payment saved but RLS blocked SELECT return. Using local data.')
  return {
    data: {
      id: null,
      ...cleaned,
      created_at: new Date().toISOString(),
    },
    error: null,
  }
}

export async function uploadPaymentProof(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
  const filePath = `payment-proofs/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, file, { contentType: file.type, cacheControl: '3600' })

  if (uploadError) return { data: null, error: uploadError }

  return { data: filePath, error: null }
}

export async function uploadProjectFile(projectId, file, uploaderId = null, note = '') {
  const userId = uploaderId || await getCurrentUserId()
  if (!userId) return { data: null, error: 'No autenticado' }

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
      uploader_id: userId,
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
