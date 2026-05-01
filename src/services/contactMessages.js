import { isSupabaseConfigured, supabase } from './supabaseClient'

export async function createContactMessage(payload) {
  if (!isSupabaseConfigured()) {
    return { ok: false, skipped: true }
  }

  const { error } = await supabase.from('contact_messages').insert(payload)

  if (error) {
    throw new Error('No se pudo registrar el contacto en Supabase.')
  }

  return { ok: true }
}
