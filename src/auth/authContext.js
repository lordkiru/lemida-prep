import { createContext, useContext } from 'react'

// What every page can ask about the signed-in student. Provided by AuthProvider.
//   status: 'loading' (asking the server who this is) | 'ready' | 'error' (the server could not be reached)
//   user:   the student as GET /api/prep/me returns it, or null when signed out
export const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
