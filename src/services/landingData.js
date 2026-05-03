import { supabase } from './supabase'

export async function getPublishedServices() {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return data || []
}

export async function getPublishedProjects() {
  const { data } = await supabase
    .from('portfolio_projects')
    .select('*')
    .eq('is_published', true)
    .order('sort_order')
  return data || []
}

export async function getPublishedTestimonials() {
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_published', true)
  return data || []
}

export async function getPublishedFaqs() {
  const { data } = await supabase
    .from('faqs')
    .select('*')
    .eq('is_published', true)
  return data || []
}

export async function getLandingSections() {
  const { data } = await supabase
    .from('landing_sections')
    .select('*')
    .eq('is_published', true)
  return data || []
}

export async function createContactMessage(payload) {
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )
  return supabase.from('contact_messages').insert(cleaned).select().single()
}

export async function createLead(payload) {
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )
  return supabase.from('leads').insert(cleaned).select().single()
}
