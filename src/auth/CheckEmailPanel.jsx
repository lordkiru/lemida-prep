import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'

const WAIT_SECONDS = 60 // the server also refuses a second email within a minute

// "We sent you a link" with a Resend button. Used after sign-up, and when someone signs in before confirming their email.
//   The server answers "resend" the same whether or not the address has an account, so this panel can say nothing more than that.
export default function CheckEmailPanel({ email, title = 'Check your email', children, backTo = '/signup', backLabel = 'Use a different email' }) {
  const [wait, setWait] = useState(0)
  const [note, setNote] = useState({ kind: '', text: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (wait <= 0) return undefined
    const timer = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  async function resend() {
    setBusy(true)
    setNote({ kind: '', text: '' })
    try {
      const data = await api.auth.resendVerification(email)
      setNote({ kind: 'success', text: data.message || 'We have sent it again.' })
      setWait(WAIT_SECONDS)
    } catch (err) {
      setNote({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="check-title">
      <h1 id="check-title" className="mb-3 text-2xl font-extrabold">
        {title}
      </h1>
      <p className="mb-2">
        We sent a link to <strong className="break-all">{email}</strong>. Open it on this phone or computer to confirm your email.
      </p>
      {children}
      <p className="mb-5 text-sm text-muted">The link works for 24 hours. If you cannot find it, look in your spam or promotions folder.</p>

      {note.text && <Notice kind={note.kind} className="mb-4">{note.text}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={resend} disabled={busy || wait > 0} className="btn-primary">
          {busy ? 'Sending...' : wait > 0 ? `Send again in ${wait}s` : 'Send the email again'}
        </button>
        <Link to={backTo} className="link text-sm font-semibold">
          {backLabel}
        </Link>
      </div>
    </section>
  )
}
