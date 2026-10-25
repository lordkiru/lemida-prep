import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/authContext'
import { examLabel } from '../auth/rules'
import { PasswordField } from '../components/Field'
import Notice from '../components/Notice'

export default function Profile() {
  const { user, logout, endSession } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false) // the "delete my account" panel is open
  const [password, setPassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

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

  async function deleteAccount(e) {
    e.preventDefault()
    if (!password) {
      setDeleteError('Enter your password to confirm.')
      return document.getElementById('delete-password')?.focus()
    }
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await api.me.deleteAccount(password)
      endSession('Your account has been deleted: your profile, practice history and mock exams are gone. Payment records are kept for accounting purposes.')
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(err.message)
      setDeleteBusy(false)
    }
  }

  return (
    <section aria-labelledby="page-title">
      <div className="glass p-6 sm:p-8">
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

        <p className="mb-0 mt-6 text-sm text-muted">
          <Link to="/privacy" className="link font-semibold">
            Privacy policy
          </Link>
          {' · '}
          <Link to="/terms" className="link font-semibold">
            Terms of use
          </Link>
        </p>
      </div>

      <div className="glass mt-5 p-6 sm:p-8" aria-labelledby="delete-title">
        <h2 id="delete-title" className="mb-2 text-lg font-extrabold">
          Delete my account
        </h2>
        {!deleting ? (
          <>
            <p className="mb-4 text-sm text-muted">This removes your account, your setup, your practice rounds and your progress for good. It cannot be undone.</p>
            <button type="button" className="btn-secondary" onClick={() => setDeleting(true)}>
              Delete my account...
            </button>
          </>
        ) : (
          <form onSubmit={deleteAccount} noValidate className="grid gap-4">
            <p className="m-0 text-sm">
              <strong>This cannot be undone.</strong> Your account, your setup, your practice rounds and your progress will be deleted straight away. To
              carry on, type your password.
            </p>
            {deleteError && <Notice kind="error">{deleteError}</Notice>}
            <PasswordField id="delete-password" label="Your password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-danger" disabled={deleteBusy}>
                {deleteBusy ? 'Deleting...' : 'Delete everything'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={deleteBusy}
                onClick={() => {
                  setDeleting(false)
                  setPassword('')
                  setDeleteError('')
                }}
              >
                Keep my account
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
