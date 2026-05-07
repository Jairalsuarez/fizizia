import { useState, useEffect, useCallback } from 'react'
import { DashboardDataContext } from './dashboardDataContext'
import { loadDashboardData } from '../api/dashboardApi'
import { buildMetrics } from '../utils/business'
import { supabase } from '../services/supabase'

export function DashboardDataProvider({ children }) {
  const [data, setData] = useState({
    clients: [],
    projects: [],
    invoices: [],
    payments: [],
    expenses: [],
    leads: [],
    appointments: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loadDashboardData()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData()
  }, [refreshData])

  useEffect(() => {
    let timer = null
    const scheduleRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => refreshData(), 250)
    }
    const channel = supabase
      .channel('dashboard:data:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, scheduleRefresh)
      .subscribe()
    return () => {
      clearTimeout(timer)
      channel.unsubscribe()
    }
  }, [refreshData])

  const metrics = buildMetrics(data)

  return (
    <DashboardDataContext.Provider value={{ data, loading, error, refreshData, metrics }}>
      {children}
    </DashboardDataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { useDashboardData } from './dashboardDataContext'
