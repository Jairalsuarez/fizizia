import { createContext, useContext } from 'react'

export const AuthContext = createContext({ session: null, loading: true, user: null, signOut: () => {} })

export function useAuth() {
  return useContext(AuthContext)
}
