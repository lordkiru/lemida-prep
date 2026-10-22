import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CheckEmailPanel from '../../auth/CheckEmailPanel'
import { useAuth } from '../../auth/authContext'
import { cleanEmail, landingFor, looksLikeEmail, safeNext } from '../../auth/rules'
import Field, { PasswordField } from '../../components/Field'
import Notice from '../../components/Notice'

export default function Login() {
  const { login, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsConfirming, setNeedsConfirming] = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    const found = {}
    if (!looksLikeEmail(form.email)) found.email = 'Enter the email address you signed up with.'
    if (!form.password) found.password = 'Enter your password.'
    setErrors(found)
    const first = ['email', 'password'].find((f) => found[f])
    if (first) return document.getElementById(first)?.focus()

    setBusy(true)
    try {
      const user = await login({ email: cleanEmail(form.email), password: form.password })
      navigate(safeNext(location.state?.from) || landingFor(user), { replace: true })
    } catch (err) {
      setBusy(false)
      if (err.code === 'EMAIL_NOT_VERIFIED') setNeedsConfirming(cleanEmail(form.email))
      else setFormError(err.message) // "Incorrect email or password." is deliberately the same for a wrong email and a wrong password
    }
  }

  if (needsConfirming) {
    return (
      <CheckEmailPanel email={needsConfirming} title="Confirm your email first" backTo="/login" backLabel="Back to sign in">
        <p className="mb-2">Your password is right, but we need to know this address is yours before you can sign in.</p>
      </CheckEmailPanel>
    )
  }

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="login-title">
      <h1 id="login-title" className="mb-1 text-2xl font-extrabold">
        Welcome back
      </h1>
      <p className="mb-5 text-muted">Sign in to carry on practising.</p>

      <form onSubmit={submit} noValidate className="grid gap-4">
        {/* shown when this device was signed out because the account signed in somewhere else */}
        {notice && !formError && <Notice kind="info">{notice}</Notice>}
        {formError && <Notice kind="error">{formError}</Notice>}
        <Field
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          required
        />
        <PasswordField id="password" label="Password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} required />
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-5 text-sm">
        <Link to="/forgot" className="link font-semibold">
          Forgot your password?
        </Link>
      </p>
      <p className="mt-2 text-sm">
        New here?{' '}
        <Link to="/signup" className="link font-semibold">
          Create an account
        </Link>
      </p>
    </section>
  )
}
