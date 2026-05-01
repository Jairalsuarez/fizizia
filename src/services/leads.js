import { isSupabaseConfigured, supabase } from './supabaseClient'

export async function saveLead(leadData) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured, skipping lead save:', leadData)
    return { success: true }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert([
      { 
        full_name: leadData.name, 
        email: leadData.email, 
        need_summary: leadData.project,
        source: 'chatbot'
      }
    ])

  if (error) {
    console.error('Error saving lead:', error)
    return { success: false, error }
  }

  return { success: true, data }
}
