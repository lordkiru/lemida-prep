import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { cleanEmail, looksLikeEmail } from '../../auth/rules'
import Brand from '../../components/Brand'
import Field, { PasswordField } from '../../components/Field'
import Notice from '../../components/Notice'
import ThemeToggle from '../../components/ThemeToggle'
import { commissionStatusText, dateText, earnNote, nairaText, planName, shareMessage, stateText, walletCards } from '../../marketer/format'

// The marketer's own page (/marketer): sign in, then see your referral link, how many students you brought, and what you have earned. READ-ONLY.
// Marketers are not students: they have their own accounts, created by Lemida, and a student's sign-in never opens this page.

export function MarketerFrame({ children }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-4">
        <Brand size={44} className="!gap-3" />
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        {children}
      </main>
    </div>
  )
}

function SignIn({ onSignedIn, notice }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!looksLikeEmail(form.email) || !form.password) return setError('Enter your email and password.')
    setBusy(true)
    try {
      const data = await api.marketer.login({ email: cleanEmail(form.email), password: form.password })
      onSignedIn(data.marketer)
    } catch (err) {
      setBusy(false)
      setError(err.message)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="glass mx-auto grid w-full max-w-md gap-4 p-6">
      <h1 className="m-0 text-2xl font-extrabold">Marketer sign-in</h1>
      <p className="m-0 text-sm text-muted">For Lemida Exam Prep marketers. Your account is set up by Lemida: look for the email with your link to choose a password.</p>
      {notice && <Notice kind="info">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <Field id="marketer-email" label="Email" type="email" autoComplete="username" value={form.email} onChange={set('email')} />
      <PasswordField id="marketer-password" label="Password" autoComplete="current-password" value={form.password} onChange={set('password')} />
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="m-0 text-sm">
        <Link to="/marketer/forgot" className="link font-semibold">
          Forgot your password?
        </Link>
      </p>
    </form>
  )
}

function Card({ label, value, note }) {
  return (
    <div className="glass p-5">
      <p className="m-0 text-sm text-muted">{label}</p>
      <p className="m-0 mt-1 text-3xl font-extrabold">{value}</p>
      {note && <p className="m-0 mt-1 text-xs text-muted">{note}</p>}
    </div>
  )
}

const th = 'whitespace-nowrap px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted'
const td = 'px-3 py-2 align-top text-sm'

function ReferralLink({ link }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // the box below is selectable, so the link can still be copied by hand
      document.getElementById('referral-link')?.select()
    }
  }
  return (
    <section className="glass p-5" aria-labelledby="link-title">
      <h2 id="link-title" className="m-0 mb-1 text-lg font-extrabold">
        Your referral link
      </h2>
      <p className="m-0 mb-3 text-sm text-muted">Share it. A student who signs up after opening it is counted as yours.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input id="referral-link" readOnly value={link} className="field-input min-w-0 flex-1" aria-label="Your referral link" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn-primary" onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(shareMessage(link))}`} target="_blank" rel="noopener noreferrer">
          Share on WhatsApp
        </a>
      </div>
    </section>
  )
}

function Dashboard({ marketer, onSignOut, onEnded }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.marketer
      .dashboard()
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((err) => {
        if (cancelled) return
        if (err.status === 401) return onEnded(err.code === 'MARKETER_SESSION_ENDED' ? err.message : '')
        setState({ status: 'error', data: null, error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [attempt, onEnded])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const data = state.data
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold">Hello, {marketer.name}</h1>
          <p className="m-0 text-sm text-muted">Your Lemida Exam Prep marketer page. Referral code {marketer.referralCode}.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={reload} disabled={state.status === 'loading'}>
            {state.status === 'loading' ? 'Loading...' : 'Refresh'}
          </button>
          <button type="button" className="btn-secondary" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {state.status === 'error' && (
        <div className="glass p-5">
          <Notice kind="error">{state.error}</Notice>
        </div>
      )}
      {state.status === 'loading' && !data && (
        <p role="status" className="text-muted">
          Loading...
        </p>
      )}

      {data && (
        <>
          <ReferralLink link={data.referralLink} />

          <section aria-label="Your earnings" className="grid gap-4 sm:grid-cols-3">
            {walletCards(data.wallet, data.rules).map((card) => (
              <Card key={card.key} label={card.label} value={card.value} note={card.note} />
            ))}
          </section>
          <p className="m-0 -mt-2 text-sm text-muted">{earnNote(data.rules)}</p>

          <section aria-label="Your students" className="grid gap-4 sm:grid-cols-3">
            <Card label="Students who signed up" value={String(data.counts.signups)} note="Through your link or code" />
            <Card label="Paying now" value={String(data.counts.paying)} note="A plan that is running" />
            <Card label="Plan ended" value={String(data.counts.planEnded)} note="Paid before, not renewed yet" />
          </section>

          <section aria-labelledby="commissions-title" className="glass p-5">
            <h2 id="commissions-title" className="m-0 mb-3 text-lg font-extrabold">
              Your commissions
            </h2>
            {data.commissions.length === 0 ? (
              <p className="m-0 text-sm text-muted">No commissions yet. You earn one each time a student you referred pays.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Date</th>
                      <th className={th}>Plan paid for</th>
                      <th className={th}>You earned</th>
                      <th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((c, i) => (
                      <tr key={`${c.date}-${i}`} className="border-t border-[var(--input-border)]">
                        <td className={`${td} whitespace-nowrap`}>{dateText(c.date)}</td>
                        <td className={td}>{c.plan ? planName(c.plan) : '-'}</td>
                        <td className={`${td} whitespace-nowrap font-semibold`}>{nairaText(c.amountNaira)}</td>
                        <td className={td}>{commissionStatusText(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="signups-title" className="glass p-5">
            <h2 id="signups-title" className="m-0 mb-1 text-lg font-extrabold">
              Recent sign-ups
            </h2>
            <p className="m-0 mb-3 text-xs text-muted">For students&apos; privacy you see only when they signed up and whether they are paying, never who they are.</p>
            {data.signups.length === 0 ? (
              <p className="m-0 text-sm text-muted">Nobody has signed up through your link yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Signed up</th>
                      <th className={th}>Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.signups.map((s, i) => (
                      <tr key={`${s.date}-${i}`} className="border-t border-[var(--input-border)]">
                        <td className={`${td} whitespace-nowrap`}>{dateText(s.date)}</td>
                        <td className={`${td} font-semibold`}>{stateText(s.state)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default function Marketer() {
  const [state, setState] = useState({ status: 'loading', marketer: null, notice: '' }) // loading | in | out
  useEffect(() => {
    let cancelled = false
    api.marketer
      .me()
      .then((data) => !cancelled && setState({ status: 'in', marketer: data.marketer, notice: '' }))
      .catch(() => !cancelled && setState({ status: 'out', marketer: null, notice: '' }))
    return () => {
      cancelled = true
    }
  }, [])

  const endSession = useCallback((notice = '') => setState({ status: 'out', marketer: null, notice }), [])
  const signOut = useCallback(async () => {
    try {
      await api.marketer.logout()
    } catch {
      // the cookie is cleared by the server when it can be reached; either way show the sign-in page
    }
    setState({ status: 'out', marketer: null, notice: '' })
  }, [])

  return (
    <MarketerFrame>
      {state.status === 'loading' && (
        <p role="status" className="text-muted">
          Loading...
        </p>
      )}
      {state.status === 'out' && <SignIn notice={state.notice} onSignedIn={(marketer) => setState({ status: 'in', marketer, notice: '' })} />}
      {state.status === 'in' && <Dashboard marketer={state.marketer} onSignOut={signOut} onEnded={endSession} />}
    </MarketerFrame>
  )
}
