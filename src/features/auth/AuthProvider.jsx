import { useState, useEffect, useCallback } from 'react'
import { AuthContext } from './authContext'
import { getSession, onAuthChange, signOut as signOutAdmin } from '../../services/adminData'
import { getProfile } from '../../services/clientData'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        if (data.session?.user) {
          loadProfile(data.session.user.id).then((u) => {
            if (mounted) setUser(u)
          }).catch(() => {
            if (mounted) setUser({ role: 'client', full_name: data.session.user.email })
          })
        }
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: listener } = onAuthChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id).then((u) => {
          if (mounted) setUser(u)
        }).catch(() => {
          if (mounted) setUser({ role: 'client', full_name: newSession.user.email })
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await signOutAdmin()
    setSession(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

async function loadProfile(userId) {
  const profile = await getProfile(userId)
  return profile || { role: 'client', full_name: 'Usuario' }
}
