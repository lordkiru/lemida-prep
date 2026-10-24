import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import CheckEmailPanel from '../../auth/CheckEmailPanel'
import { cleanEmail, looksLikeEmail, passwordProblem } from '../../auth/rules'
import Field, { PasswordField } from '../../components/Field'
import Notice from '../../components/Notice'
import { clearReferral, loadReferral, referralForSignup } from '../../referral'

export default function Signup() {
  // a code remembered from a ?ref= link fills the box; the student can change or clear it
  const [remembered] = useState(() => loadReferral())
  const [form, setForm] = useState({ name: '', email: '', password: '', referral: remembered })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function check() {
    const found = {}
    if (form.name.trim().length < 2) found.name = 'Enter your name (at least 2 letters).'
    if (!looksLikeEmail(form.email)) found.email = 'Enter a valid email address, like name@example.com.'
    const pw = passwordProblem(form.password, { email: form.email, name: form.name })
    if (pw) found.password = pw
    return found
  }

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    const found = check()
    setErrors(found)
    const first = ['name', 'email', 'password'].find((f) => found[f])
    if (first) return document.getElementById(first)?.focus()

    setBusy(true)
    try {
      const email = cleanEmail(form.email)
      await api.auth.signup({ name: form.name.trim(), email, password: form.password, ...referralForSignup({ typed: form.referral, remembered }) })
      clearReferral()
      setSentTo(email)
    } catch (err) {
      if (err.code === 'WEAK_PASSWORD') {
        setErrors({ password: err.message })
        document.getElementById('password')?.focus()
      } else {
        setFormError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return <CheckEmailPanel email={sentTo} backTo="/signup" backLabel="Use a different email" />
  }

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="signup-title">
      <h1 id="signup-title" className="mb-1 text-2xl font-extrabold">
        Create your account
      </h1>
      <p className="mb-5 text-muted">Practice for your SS2 and SS3 exams. It takes a minute.</p>

      <form onSubmit={submit} noValidate className="grid gap-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <Field id="name" label="Your name" type="text" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
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
          hint="We send a link here to confirm it is yours."
          required
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="At least 8 characters. A few words with numbers works well."
          required
        />
        <Field
          id="referral"
          label="Referral code (optional)"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          value={form.referral}
          onChange={set('referral')}
          hint={remembered && form.referral === remembered ? 'Added from the link you used.' : 'If someone shared a code with you, enter it here.'}
        />
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Creating your account...' : 'Create account'}
        </button>
        <p className="m-0 text-center text-sm text-muted">
          By creating an account you agree to the{' '}
          <Link to="/terms" className="link font-semibold">
            terms of use
          </Link>{' '}
          and the{' '}
          <Link to="/privacy" className="link font-semibold">
            privacy policy
          </Link>
          . If you are under 18, please ask a parent or guardian first.
        </p>
      </form>

      <p className="mt-5 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="link font-semibold">
          Sign in
        </Link>
      </p>
    </section>
  )
}
