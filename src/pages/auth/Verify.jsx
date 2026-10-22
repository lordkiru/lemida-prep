import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth/authContext'
import { landingFor } from '../../auth/rules'

// The page the "confirm your email" link opens. It confirms the email, which also signs the student in.
export default function Verify() {
  const { setUser } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [token] = useState(() => params.get('token') || '')
  const [state, setState] = useState({ phase: token ? 'working' : 'failed', user: null, message: '' })
  const started = useRef(false)

  // take the token out of the address bar, so it is not left in the history or sent on as a referrer
  useEffect(() => {
    if (location.search) navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, navigate])

  // The link works once, so this must run once even where React runs effects twice in development.
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    api.auth
      .verifyEmail(token)
      .then((data) => {
        setUser(data.user)
        setState({ phase: 'done', user: data.user, message: '' })
      })
      .catch((err) => setState({ phase: 'failed', user: null, message: err.code === 'BAD_TOKEN' ? '' : err.message }))
  }, [token, setUser])

  if (state.phase === 'working') {
    return (
      <section className="glass p-6 sm:p-8" aria-labelledby="verify-title">
        <h1 id="verify-title" className="mb-3 text-2xl font-extrabold">
          Confirming your email...
        </h1>
        <p role="status" className="text-muted">
          One moment.
        </p>
      </section>
    )
  }

  if (state.phase === 'done') {
    return (
      <section className="glass p-6 sm:p-8" aria-labelledby="verify-title">
        <h1 id="verify-title" className="mb-3 text-2xl font-extrabold">
          Email confirmed
        </h1>
        <p className="mb-5">You are signed in. {state.user.profileComplete ? '' : 'Next, tell us which exam you are preparing for.'}</p>
        <Link to={landingFor(state.user)} className="btn-primary">
          Continue
        </Link>
      </section>
    )
  }

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="verify-title">
      <h1 id="verify-title" className="mb-3 text-2xl font-extrabold">
        {state.message ? 'We could not confirm your email' : 'This link has expired'}
      </h1>
      <p className="mb-5">
        {state.message ||
          'Confirmation links work for 24 hours and only once. If you already used this one you can simply sign in. Otherwise sign in and we will send you a new link.'}
      </p>
      <Link to="/login" className="btn-primary">
        Go to sign in
      </Link>
    </section>
  )
}
