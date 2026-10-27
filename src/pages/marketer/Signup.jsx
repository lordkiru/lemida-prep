import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import Field from '../../components/Field'
import Notice from '../../components/Notice'
import { signupPayload, signupPitch, signupProblems } from '../../marketer/signup'
import { MarketerFrame } from './Marketer'

// Anyone can sign up as a marketer here. The account is only switched on when they open the link in the email we send, which proves the address is theirs.
export default function MarketerSignup() {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [pitch, setPitch] = useState('')
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  useEffect(() => {
    let cancelled = false
    api.marketer
      .rules()
      .then((data) => !cancelled && setPitch(signupPitch(data.rules)))
      .catch(() => {
        // the page works without the paragraph about earnings
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    const found = signupProblems(form)
    setErrors(found)
    const first = ['name', 'email', 'phone'].find((f) => found[f])
    if (first) return document.getElementById(`marketer-${first}`)?.focus()

    setBusy(true)
    try {
      const payload = signupPayload(form)
      await api.marketer.signUp(payload)
      setSentTo(payload.email)
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <MarketerFrame>
      {sentTo ? (
        <section className="glass mx-auto w-full max-w-md p-6" aria-labelledby="sent-title">
          <h1 id="sent-title" className="mb-3 text-2xl font-extrabold">
            Check your email
          </h1>
          <p className="mb-3">
            If <strong className="break-all">{sentTo}</strong> can be used, we have sent it a link to confirm your email and choose a password. It works for 7 days, and only once.
          </p>
          <p className="mb-5 text-sm text-muted">Your account is switched on when you open the link. Nothing happens until then, and if you do not, the sign-up is removed after a week.</p>
          <Link to="/marketer" className="link font-semibold">
            Back to sign-in
          </Link>
        </section>
      ) : (
        <form onSubmit={submit} noValidate className="glass mx-auto grid w-full max-w-md gap-4 p-6">
          <h1 className="m-0 text-2xl font-extrabold">Become a marketer</h1>
          <p className="m-0 text-sm text-muted">Earn when students you bring to Lemida Exam Prep pay for a plan. {pitch}</p>
          {formError && <Notice kind="error">{formError}</Notice>}
          <Field id="marketer-name" label="Your name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
          <Field id="marketer-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} hint="We send a link here to confirm it is yours." required />
          <Field id="marketer-phone" label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} hint="For example 0801 234 5678." required />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Signing up...' : 'Sign up'}
          </button>
          <p className="m-0 text-sm">
            Already a marketer?{' '}
            <Link to="/marketer" className="link font-semibold">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </MarketerFrame>
  )
}
