import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { examLabel } from '../auth/rules'
import Notice from '../components/Notice'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="page-title">
      <h1 id="page-title" className="mb-5 text-2xl font-extrabold">
        Profile
      </h1>

      <dl className="mb-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
        <dt className="text-muted">Name</dt>
        <dd className="m-0 font-semibold">{user.name}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="m-0 break-all font-semibold">{user.email}</dd>
        <dt className="text-muted">Exam</dt>
        <dd className="m-0 font-semibold">
          {examLabel(user.exam)} {user.examYear}
        </dd>
        <dt className="text-muted">Class</dt>
        <dd className="m-0 font-semibold">{user.classLevel}</dd>
        <dt className="text-muted">Subjects</dt>
        <dd className="m-0">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {user.subjects.map((s) => (
              <li key={s} className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold">
                {s}
              </li>
            ))}
          </ul>
        </dd>
      </dl>

      {error && <Notice kind="error" className="mb-4">{error}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <Link to="/setup" className="btn-secondary">
          Change my setup
        </Link>
        <button type="button" onClick={signOut} disabled={busy} className="btn-secondary">
          {busy ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </section>
  )
}
