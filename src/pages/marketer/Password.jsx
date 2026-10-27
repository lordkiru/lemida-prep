import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { cleanEmail, looksLikeEmail, passwordProblem } from '../../auth/rules'
import Field, { PasswordField } from '../../components/Field'
import Notice from '../../components/Notice'
import { MarketerFrame } from './Marketer'

// Choosing a password for the marketer page: the link in the invite or sign-up confirmation email (first time) or in a reset email (forgotten). All come here, and all work once.
export function MarketerSetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Read the link's token once, then take it out of the address bar so it is not left in the history or sent on as a referrer.
  const [token] = useState(() => params.get('token') || '')
  useEffect(() => {
    if (location.search) navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, navigate])

  const [form, setForm] = useState({ password: '', again: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [badLink, setBadLink] = useState(!token)
  const [done, setDone] = useState(false)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    const found = {}
    const pw = passwordProblem(form.password)
    if (pw) found.password = pw
    else if (form.again !== form.password) found.again = 'The two passwords are not the same.'
    setErrors(found)
    const first = ['password', 'again'].find((f) => found[f])
    if (first) return document.getElementById(first)?.focus()

    setBusy(true)
    try {
      await api.marketer.setPassword({ token, password: form.password })
      setDone(true)
    } catch (err) {
      if (err.code === 'BAD_TOKEN') setBadLink(true)
      else if (err.code === 'WEAK_PASSWORD') {
        setErrors({ password: err.message })
        document.getElementById('password')?.focus()
      } else setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <MarketerFrame>
      {done ? (
        <section className="glass mx-auto w-full max-w-md p-6" aria-labelledby="done-title">
          <h1 id="done-title" className="mb-3 text-2xl font-extrabold">
            Password saved
          </h1>
          <p className="mb-5">You can now sign in to your marketer page with it.</p>
          <Link to="/marketer" className="btn-primary">
            Sign in
          </Link>
        </section>
      ) : badLink ? (
        <section className="glass mx-auto w-full max-w-md p-6" aria-labelledby="bad-title">
          <h1 id="bad-title" className="mb-3 text-2xl font-extrabold">
            This link has expired
          </h1>
          <p className="mb-5">Each link works only once and for a limited time. If you signed up a while ago, sign up again to get a fresh link. If Lemida set you up, ask Lemida to send your invite again. Otherwise, ask for a new link.</p>
          <Link to="/marketer/forgot" className="btn-primary">
            Get a new link
          </Link>
        </section>
      ) : (
        <form onSubmit={submit} noValidate className="glass mx-auto grid w-full max-w-md gap-4 p-6">
          <h1 className="m-0 text-2xl font-extrabold">Choose your password</h1>
          <p className="m-0 text-sm text-muted">You will use it to open your marketer page. Pick something you have not used anywhere else.</p>
          {formError && <Notice kind="error">{formError}</Notice>}
          <PasswordField id="password" label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters." required />
          <PasswordField id="again" label="Password again" autoComplete="new-password" value={form.again} onChange={set('again')} error={errors.again} required />
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Saving...' : 'Save password'}
          </button>
        </form>
      )}
    </MarketerFrame>
  )
}

// "Forgot your password?" for marketers. The answer is the same whether or not the email belongs to a marketer.
export function MarketerForgot() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!looksLikeEmail(email)) return setError('Enter the email address Lemida has for you.')
    setBusy(true)
    try {
      await api.marketer.forgotPassword(cleanEmail(email))
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <MarketerFrame>
      {sent ? (
        <section className="glass mx-auto w-full max-w-md p-6" aria-labelledby="sent-title">
          <h1 id="sent-title" className="mb-3 text-2xl font-extrabold">
            Check your email
          </h1>
          <p className="mb-5">If that email belongs to a marketer account, we have sent it a link to choose a new password. It works for an hour, and only once.</p>
          <Link to="/marketer" className="link font-semibold">
            Back to sign-in
          </Link>
        </section>
      ) : (
        <form onSubmit={submit} noValidate className="glass mx-auto grid w-full max-w-md gap-4 p-6">
          <h1 className="m-0 text-2xl font-extrabold">Forgot your password?</h1>
          <p className="m-0 text-sm text-muted">Enter your email and we will send you a link to choose a new one.</p>
          {error && <Notice kind="error">{error}</Notice>}
          <Field id="forgot-email" label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Sending...' : 'Send me a link'}
          </button>
          <Link to="/marketer" className="link text-sm font-semibold">
            Back to sign-in
          </Link>
        </form>
      )}
    </MarketerFrame>
  )
}
