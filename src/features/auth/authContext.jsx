import { createContext, useContext } from 'react'

export const AuthContext = createContext({ session: null, loading: true, user: null, signOut: () => {}, updateUser: () => {} })

export function useAuth() {
  return useContext(AuthContext)
}
