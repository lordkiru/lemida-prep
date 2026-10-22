import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { passwordProblem } from '../../auth/rules'
import { PasswordField } from '../../components/Field'
import Notice from '../../components/Notice'

export default function Reset() {
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
      await api.auth.resetPassword({ token, password: form.password })
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

  if (done) {
    return (
      <section className="glass p-6 sm:p-8" aria-labelledby="reset-done-title">
        <h1 id="reset-done-title" className="mb-3 text-2xl font-extrabold">
          Password changed
        </h1>
        <p className="mb-5">You can now sign in with your new password. Anywhere you were signed in before has been signed out.</p>
        <Link to="/login" className="btn-primary">
          Sign in
        </Link>
      </section>
    )
  }

  if (badLink) {
    return (
      <section className="glass p-6 sm:p-8" aria-labelledby="reset-bad-title">
        <h1 id="reset-bad-title" className="mb-3 text-2xl font-extrabold">
          This link has expired
        </h1>
        <p className="mb-5">Password links stop working after 60 minutes, and each one can be used only once. Ask for a new one.</p>
        <Link to="/forgot" className="btn-primary">
          Get a new link
        </Link>
      </section>
    )
  }

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="reset-title">
      <h1 id="reset-title" className="mb-1 text-2xl font-extrabold">
        Choose a new password
      </h1>
      <p className="mb-5 text-muted">Pick something you have not used anywhere else.</p>
      <form onSubmit={submit} noValidate className="grid gap-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="At least 8 characters."
          required
        />
        <PasswordField id="again" label="New password again" autoComplete="new-password" value={form.again} onChange={set('again')} error={errors.again} required />
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Saving...' : 'Save new password'}
        </button>
      </form>
    </section>
  )
}
