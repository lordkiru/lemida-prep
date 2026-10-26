import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { clearAdminSession, isSuperAdmin, loadAdminSession, saveAdminSession } from '../admin/adminSession'
import { dateText, dateTimeText, nairaText, planName, statusName, summaryCards } from '../admin/format'
import AdminMarketers from './AdminMarketers'
import Brand from '../components/Brand'
import Field, { PasswordField } from '../components/Field'
import Notice from '../components/Notice'
import ThemeToggle from '../components/ThemeToggle'
import { cleanEmail, looksLikeEmail } from '../auth/rules'

// The admin page (/admin): who is paying and what has been paid. For the super admin only, and READ-ONLY: it shows numbers and lists, nothing here changes
// anything. It has its own sign-in (the School Manager super admin account) and is not part of the student app or its menu.

function SignIn({ onSignedIn }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!looksLikeEmail(form.email) || !form.password) return setError('Enter the admin email and password.')
    setBusy(true)
    try {
      const data = await api.admin.login({ email: cleanEmail(form.email), password: form.password })
      if (!isSuperAdmin(data.user)) {
        setBusy(false)
        return setError('This account is not the super admin.')
      }
      saveAdminSession({ token: data.token, user: data.user })
      onSignedIn({ token: data.token, name: data.user.name || '', email: data.user.email || '' })
    } catch (err) {
      setBusy(false)
      setError(err.message)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="glass mx-auto grid w-full max-w-md gap-4 p-6">
      <h1 className="m-0 text-2xl font-extrabold">Admin sign-in</h1>
      <p className="m-0 text-sm text-muted">For the Lemida super admin only.</p>
      {error && <Notice kind="error">{error}</Notice>}
      <Field id="admin-email" label="Email" type="email" autoComplete="username" value={form.email} onChange={set('email')} />
      <PasswordField id="admin-password" label="Password" autoComplete="current-password" value={form.password} onChange={set('password')} />
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

function SummaryCard({ label, value, note }) {
  return (
    <div className="glass p-5">
      <p className="m-0 text-sm text-muted">{label}</p>
      <p className="m-0 mt-1 text-3xl font-extrabold">{value}</p>
      <p className="m-0 mt-1 text-xs text-muted">{note}</p>
    </div>
  )
}

const th = 'whitespace-nowrap px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted'
const td = 'px-3 py-2 align-top text-sm'

function Dashboard({ session, onSignOut }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.admin
      .overview(session.token)
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((err) => {
        if (cancelled) return
        if (err.status === 401) return onSignOut() // the sign-in ran out
        setState({ status: 'error', data: null, error: err.status === 403 ? 'This account is not the super admin.' : err.message })
      })
    return () => {
      cancelled = true
    }
  }, [attempt, session.token, onSignOut])

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((n) => n + 1)
  }, [])

  const data = state.data

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold">Exam Prep admin</h1>
          <p className="m-0 text-sm text-muted">Signed in as {session.email || session.name}. Payments and students are read-only; you can create marketers below.</p>
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
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
            {summaryCards(data.counts).map((card) => (
              <SummaryCard key={card.key} label={card.label} value={card.value} note={card.note} />
            ))}
          </section>

          <section aria-labelledby="students-title" className="glass p-5">
            <h2 id="students-title" className="m-0 mb-1 text-lg font-extrabold">
              Paying students
            </h2>
            <p className="m-0 mb-3 text-xs text-muted">
              Everyone who has a paid plan, most recently subscribed first{data.studentsTotal > data.studentsShown ? ` (showing ${data.studentsShown} of ${data.studentsTotal})` : ''}.
            </p>
            {data.students.length === 0 ? (
              <p className="m-0 text-sm text-muted">Nobody has paid yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Name</th>
                      <th className={th}>Email</th>
                      <th className={th}>Plan</th>
                      <th className={th}>Status</th>
                      <th className={th}>Plan ends</th>
                      <th className={th}>Last paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((s) => (
                      <tr key={s.id} className="border-t border-[var(--input-border)]">
                        <td className={td}>{s.name || '-'}</td>
                        <td className={`${td} break-all`}>{s.email}</td>
                        <td className={td}>{planName(s.plan)}</td>
                        <td className={`${td} font-semibold`}>{statusName(s.planStatus)}</td>
                        <td className={`${td} whitespace-nowrap`}>{dateText(s.planEndsAt)}</td>
                        <td className={`${td} whitespace-nowrap`}>{dateTimeText(s.lastPaidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="payments-title" className="glass p-5">
            <h2 id="payments-title" className="m-0 mb-1 text-lg font-extrabold">
              Recent payments
            </h2>
            <p className="m-0 mb-3 text-xs text-muted">The latest {data.payments.length}, newest first. &ldquo;Applied&rdquo; says the plan was switched on for the student.</p>
            {data.payments.length === 0 ? (
              <p className="m-0 text-sm text-muted">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Student</th>
                      <th className={th}>Amount</th>
                      <th className={th}>Plan</th>
                      <th className={th}>Date</th>
                      <th className={th}>Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.reference} className="border-t border-[var(--input-border)]">
                        <td className={`${td} break-all`}>{p.studentEmail || <span className="text-muted">(account deleted)</span>}</td>
                        <td className={`${td} whitespace-nowrap`}>{nairaText(p.amountNaira)}</td>
                        <td className={td}>{planName(p.plan)}</td>
                        <td className={`${td} whitespace-nowrap`}>{dateTimeText(p.paidAt)}</td>
                        <td className={`${td} font-semibold`}>{p.applied ? 'Yes' : <span className="text-danger">No</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <AdminMarketers token={session.token} onEnded={onSignOut} />
          <p className="m-0 text-xs text-muted">Revenue adds up the amounts customers paid, including any Paystack charge passed on to them. Dates are in Nigerian time.</p>
        </>
      )}
    </div>
  )
}

export default function Admin() {
  const [session, setSession] = useState(() => loadAdminSession())
  const signOut = useCallback(() => {
    clearAdminSession()
    setSession(null)
  }, [])

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-4">
        <Brand size={44} className="!gap-3" />
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-10 pt-6">
        {session ? <Dashboard session={session} onSignOut={signOut} /> : <SignIn onSignedIn={setSession} />}
      </main>
    </div>
  )
}
