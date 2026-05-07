import { supabase } from '../services/supabase'

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
    options: { data: { full_name: fullName, role: 'client', ...metadata } },
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

export function signOut() {
  return supabase.auth.signOut()
}

export function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
}
