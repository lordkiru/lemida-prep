import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { cleanEmail, looksLikeEmail } from '../../auth/rules'
import Field from '../../components/Field'
import Notice from '../../components/Notice'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    if (!looksLikeEmail(email)) {
      setError('Enter the email address you signed up with.')
      return document.getElementById('email')?.focus()
    }
    setError('')
    setBusy(true)
    try {
      await api.auth.forgotPassword(cleanEmail(email))
      setDone(cleanEmail(email))
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="glass p-6 sm:p-8" aria-labelledby="forgot-done-title">
        <h1 id="forgot-done-title" className="mb-3 text-2xl font-extrabold">
          Check your email
        </h1>
        {/* the same words whether or not the address has an account: nobody can use this page to find out who is registered */}
        <p className="mb-2">
          If <strong className="break-all">{done}</strong> has an account, we have sent it a link to choose a new password.
        </p>
        <p className="mb-5 text-sm text-muted">The link works for 60 minutes. Look in your spam folder if it does not arrive.</p>
        <Link to="/login" className="link font-semibold">
          Back to sign in
        </Link>
      </section>
    )
  }

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="forgot-title">
      <h1 id="forgot-title" className="mb-1 text-2xl font-extrabold">
        Forgot your password?
      </h1>
      <p className="mb-5 text-muted">Enter your email and we will send you a link to choose a new one.</p>
      <form onSubmit={submit} noValidate className="grid gap-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <Field
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          required
        />
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Sending...' : 'Send me the link'}
        </button>
      </form>
      <p className="mt-5 text-sm">
        <Link to="/login" className="link font-semibold">
          Back to sign in
        </Link>
      </p>
    </section>
  )
}
