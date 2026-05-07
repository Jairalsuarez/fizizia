import { useState, useEffect, useCallback, useRef } from 'react'
import { AuthContext } from './authContext'
import { getSession, onAuthChange, signOut as signOutSession } from '../../api/authApi'
import { getProfile } from '../../api/profilesApi'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data } = await getSession()
        if (!mounted) return

        const currentSession = data.session
        setSession(currentSession)

        if (currentSession?.user) {
          try {
            const u = await loadProfile(currentSession.user.id)
            if (mounted) {
              setUser(u)
              userRef.current = u
            }
          } catch {
            if (mounted) {
              const fallback = { role: 'client', full_name: currentSession.user.email }
              setUser(fallback)
              userRef.current = fallback
            }
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: listener } = onAuthChange((_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id)
          .then(u => { if (mounted) { setUser(u); userRef.current = u } })
          .catch(() => {
            if (mounted) {
              const fb = { role: 'client', full_name: newSession.user.email }
              setUser(fb)
              userRef.current = fb
            }
          })
      } else {
        setUser(null)
        userRef.current = null
      }
    })

    window.addEventListener('auth-profile-update', () => {
      if (userRef.current) {
        loadProfile(userRef.current.id)
          .then(u => { if (mounted) { setUser(u); userRef.current = u } })
      }
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const updateUser = useCallback((newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData }
      userRef.current = updated
      return updated
    })
  }, [])

  const signOut = useCallback(async () => {
    await signOutSession()
    setSession(null)
    setUser(null)
    userRef.current = null
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, user, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

async function loadProfile(userId) {
  const profile = await getProfile(userId)
  if (!profile) return { role: 'client', full_name: 'Usuario' }
  return { ...profile, role: profile.role || 'client' }
}
