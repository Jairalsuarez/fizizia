import { fallbackProjects } from '../data/fizziaContent'
import { isSupabaseConfigured, supabase } from './supabaseClient'

export async function getPortfolioProjects() {
  if (!isSupabaseConfigured()) {
    return fallbackProjects
  }

  const { data, error } = await supabase
    .from('portfolio_projects')
    .select('id,slug,title,summary,industry,website_url,is_featured,sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .limit(3)

  if (error) {
    return fallbackProjects
  }

  return data.length ? data : fallbackProjects
}
