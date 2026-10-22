import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AuthContext } from './authContext'

// Asks the server who is signed in (GET /api/prep/me) when the app opens, and keeps the answer for every page.
// The sign-in itself is a cookie that only the server can read or write; nothing about it is stored here.
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.me
      .get()
      .then((data) => !cancelled && setState({ status: 'ready', user: data.user, error: '' }))
      .catch((err) => {
        if (cancelled) return
        // 401 only means "nobody is signed in"; anything else means we could not find out
        if (err.status === 401) setState({ status: 'ready', user: null, error: '' })
        else setState({ status: 'error', user: null, error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const setUser = useCallback((user) => setState({ status: 'ready', user, error: '' }), [])

  const login = useCallback(async (credentials) => {
    const data = await api.auth.login(credentials)
    setState({ status: 'ready', user: data.user, error: '' })
    return data.user
  }, [])

  // Throws if the server could not be reached: the cookie is still there then, so the student must not be shown as signed out.
  const logout = useCallback(async () => {
    await api.auth.logout()
    setState({ status: 'ready', user: null, error: '' })
  }, [])

  const value = useMemo(() => ({ ...state, retry, setUser, login, logout }), [state, retry, setUser, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
