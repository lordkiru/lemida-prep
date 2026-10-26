import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { dateText } from '../admin/format'
import { createdMessage, earnedText, inviteMessage, marketerFormProblems, marketerPayload, marketerProgress, marketerStatusText } from '../admin/marketers'
import Field from '../components/Field'
import Notice from '../components/Notice'

// The admin page's Marketers section: create a marketer, see everyone, send an invite again. A new marketer is emailed a link to choose a password, and signs in
// at /marketer. Creating and inviting are all it does: nothing here touches money, wallets or students.
const th = 'whitespace-nowrap px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted'
const td = 'px-3 py-2 align-top text-sm'

export default function AdminMarketers({ token, onEnded }) {
  const [list, setList] = useState({ status: 'loading', marketers: [], error: '' })
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { kind: 'success' | 'error', text }
  const [sending, setSending] = useState('') // the marketer whose invite is being sent
  const [rowNotes, setRowNotes] = useState({}) // marketerId -> what happened to the last invite
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const load = useCallback(async () => {
    try {
      const data = await api.admin.marketers.list(token)
      setList({ status: 'ready', marketers: data.marketers, error: '' })
    } catch (err) {
      if (err.status === 401) return onEnded()
      setList((l) => ({ ...l, status: 'error', error: err.message }))
    }
  }, [token, onEnded])

  useEffect(() => {
    load()
  }, [load])

  async function create(e) {
    e.preventDefault()
    setResult(null)
    const found = marketerFormProblems(form)
    setErrors(found)
    const first = ['name', 'email', 'phone'].find((f) => found[f])
    if (first) return document.getElementById(`marketer-${first}`)?.focus()

    setBusy(true)
    try {
      const data = await api.admin.marketers.create(token, marketerPayload(form))
      setResult({ kind: 'success', text: createdMessage(data) })
      setForm({ name: '', email: '', phone: '' })
      await load()
    } catch (err) {
      if (err.status === 401) return onEnded()
      setResult({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function sendAgain(marketer) {
    setSending(marketer.id)
    setRowNotes((n) => ({ ...n, [marketer.id]: '' }))
    try {
      const data = await api.admin.marketers.sendInvite(token, marketer.id)
      setRowNotes((n) => ({ ...n, [marketer.id]: inviteMessage(marketer, data.inviteSent) }))
    } catch (err) {
      if (err.status === 401) return onEnded()
      setRowNotes((n) => ({ ...n, [marketer.id]: err.message }))
    } finally {
      setSending('')
    }
  }

  return (
    <section aria-labelledby="marketers-title" className="glass p-5">
      <h2 id="marketers-title" className="m-0 mb-1 text-lg font-extrabold">
        Marketers
      </h2>
      <p className="m-0 mb-4 text-xs text-muted">
        A new marketer is emailed a link to choose a password, then signs in at <strong>/marketer</strong>. Their referral code is made for them.
      </p>

      <form onSubmit={create} noValidate className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Create a marketer">
        <Field id="marketer-name" label="Name" autoComplete="off" value={form.name} onChange={set('name')} error={errors.name} />
        <Field id="marketer-email" label="Email" type="email" autoComplete="off" value={form.email} onChange={set('email')} error={errors.email} />
        <Field id="marketer-phone" label="Phone" type="tel" autoComplete="off" value={form.phone} onChange={set('phone')} error={errors.phone} hint="For example 08012345678" />
        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating...' : 'Create marketer'}
          </button>
        </div>
      </form>
      {result && (
        <Notice kind={result.kind === 'success' ? 'success' : 'error'} className="mb-5">
          {result.text}
        </Notice>
      )}

      {list.status === 'loading' && (
        <p role="status" className="m-0 text-sm text-muted">
          Loading marketers...
        </p>
      )}
      {list.status === 'error' && <Notice kind="error">{list.error}</Notice>}
      {list.status === 'ready' && list.marketers.length === 0 && <p className="m-0 text-sm text-muted">No marketers yet.</p>}
      {list.marketers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Phone</th>
                <th className={th}>Code</th>
                <th className={th}>Status</th>
                <th className={th}>Getting started</th>
                <th className={th}>Earned</th>
                <th className={th}>Added</th>
                <th className={th}>Invite</th>
              </tr>
            </thead>
            <tbody>
              {list.marketers.map((m) => (
                <tr key={m.id} className="border-t border-[var(--input-border)]">
                  <td className={td}>{m.name}</td>
                  <td className={`${td} break-all`}>{m.email}</td>
                  <td className={`${td} whitespace-nowrap`}>{m.phone}</td>
                  <td className={`${td} font-semibold`}>{m.referralCode}</td>
                  <td className={td}>{marketerStatusText(m)}</td>
                  <td className={td}>{marketerProgress(m)}</td>
                  <td className={`${td} whitespace-nowrap`}>{earnedText(m)}</td>
                  <td className={`${td} whitespace-nowrap`}>{dateText(m.createdAt)}</td>
                  <td className={td}>
                    <button type="button" className="btn-secondary" disabled={sending === m.id || m.status !== 'active'} onClick={() => sendAgain(m)}>
                      {sending === m.id ? 'Sending...' : 'Send invite again'}
                    </button>
                    {rowNotes[m.id] && (
                      <p role="status" className="m-0 mt-1 text-xs text-muted">
                        {rowNotes[m.id]}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
