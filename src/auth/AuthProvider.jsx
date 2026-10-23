import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AuthContext } from './authContext'

// Asks the server who is signed in (GET /api/prep/me) when the app opens, and keeps the answer for every page.
// The sign-in itself is a cookie that only the server can read or write; nothing about it is stored here.
//
// One sign-in per account: when the same account signs in on another device, the server ends this one. The next request here finds
// out (and the app re-checks whenever the student comes back to it), the student is shown the sign-in page, and `notice` says why.
const signedOut = (notice = '') => ({ status: 'ready', user: null, error: '', notice })

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: '', notice: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.me
      .get()
      .then((data) => !cancelled && setState({ status: 'ready', user: data.user, error: '', notice: '' }))
      .catch((err) => {
        if (cancelled) return
        // 401 only means "nobody is signed in"; anything else means we could not find out
        if (err.status === 401) setState(signedOut(err.code === 'SESSION_ENDED' ? err.message : ''))
        else setState({ status: 'error', user: null, error: err.message, notice: '' })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  // any later request that finds the session ended signs the student out of the screen too
  useEffect(() => api.onSessionEnded((message) => setState(signedOut(message))), [])

  // coming back to the app (switching tab, unlocking the phone): check the sign-in is still the current one
  const signedIn = Boolean(state.user)
  useEffect(() => {
    if (!signedIn) return undefined
    const onVisible = () => {
      if (document.visibilityState === 'visible') api.me.get().catch(() => {}) // a SESSION_ENDED answer is handled by onSessionEnded above
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [signedIn])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const setUser = useCallback((user) => setState({ status: 'ready', user, error: '', notice: '' }), [])

  const login = useCallback(async (credentials) => {
    const data = await api.auth.login(credentials)
    setState({ status: 'ready', user: data.user, error: '', notice: '' })
    return data.user
  }, [])

  // Throws if the server could not be reached: the cookie is still there then, so the student must not be shown as signed out.
  const logout = useCallback(async () => {
    await api.auth.logout()
    setState(signedOut())
  }, [])

  // The student is no longer signed in (their account was deleted): show the sign-in page, with a line saying why.
  const endSession = useCallback((notice) => setState(signedOut(notice)), [])

  const value = useMemo(() => ({ ...state, retry, setUser, login, logout, endSession }), [state, retry, setUser, login, logout, endSession])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
