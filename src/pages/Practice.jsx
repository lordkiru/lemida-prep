import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'
import { practiceGate } from '../billing'
import { ofLabel, questionsLabel, seenPercent } from '../practice/helpers'

// Practice: the student's own subjects, how much of each they have seen, and a button to start or carry on.
export default function Practice() {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', subjects: [], error: '' })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState('') // the subject being started
  const [errors, setErrors] = useState({}) // per subject

  useEffect(() => {
    let cancelled = false
    api.practice
      .subjects()
      .then((data) => !cancelled && setState({ status: 'ready', subjects: data.subjects, error: '' }))
      .catch((err) => !cancelled && setState({ status: 'error', subjects: [], error: err.message }))
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function start(subject, restart = false) {
    setBusy(subject)
    setErrors((e) => ({ ...e, [subject]: '' }))
    try {
      const data = await api.practice.start({ subject, restart })
      navigate(`/practice/session/${data.session.id}`)
    } catch (err) {
      setErrors((e) => ({ ...e, [subject]: err.message }))
      setBusy('')
      // today's free questions in this subject ran out since this page loaded (another tab or device): load the list again so the card says so
      if (err.code === 'PRACTICE_LIMIT_REACHED') setAttempt((n) => n + 1)
    }
  }

  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="mb-1 text-2xl font-extrabold">
        Practice
      </h1>
      <p className="mb-5 text-muted">Choose a subject. Each round is up to 10 questions, and you see the answer after every one.</p>

      {state.status === 'loading' && (
        <p role="status" className="text-muted">
          Loading your subjects...
        </p>
      )}
      {state.status === 'error' && (
        <div className="glass p-5">
          <Notice kind="error">{state.error}</Notice>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => {
              setState({ status: 'loading', subjects: [], error: '' })
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {state.subjects.map((s) => {
            const ready = s.available > 0
            const percent = seenPercent(s.seen, s.available)
            const gate = practiceGate(s.daily)
            return (
              <li key={s.name} className="glass flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="m-0 text-lg font-extrabold">{s.name}</h2>
                  {!ready && <span className="chip-amber shrink-0">Coming soon</span>}
                </div>

                {ready ? (
                  <>
                    <p className="m-0 text-sm text-muted">
                      {questionsLabel(s.available)} ready. You have seen {ofLabel(s.seen, s.available)}.
                    </p>
                    <div className="meter" role="progressbar" aria-label={`${s.name}: questions seen`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                      <div className="meter-fill" style={{ width: `${percent}%` }} />
                    </div>
                    {s.seen >= s.available && !s.active && !gate.blocked && <p className="m-0 text-sm font-semibold">You have seen every question here, so a new round is revision: we start with the ones you missed.</p>}
                    {gate.limited && !gate.blocked && <p className="m-0 text-sm text-muted">{gate.message}</p>}
                    {gate.blocked && (
                      <Notice kind="info">
                        <strong>{gate.message}</strong> {gate.detail}
                      </Notice>
                    )}
                  </>
                ) : (
                  <p className="m-0 text-sm text-muted">We are still adding questions for this subject.</p>
                )}

                {errors[s.name] && <Notice kind="error">{errors[s.name]}</Notice>}

                {ready && gate.blocked && (
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    <Link to="/plans" className="btn-primary">
                      See plans
                    </Link>
                  </div>
                )}
                {ready && !gate.blocked && (
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    {s.active ? (
                      <>
                        <button type="button" className="btn-primary" disabled={busy === s.name} onClick={() => start(s.name)}>
                          Continue ({ofLabel(s.active.answered, s.active.total)} answered)
                        </button>
                        <button type="button" className="btn-secondary" disabled={busy === s.name} onClick={() => start(s.name, true)}>
                          Start a new round
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn-primary" disabled={busy === s.name} onClick={() => start(s.name)}>
                        {busy === s.name ? 'Starting...' : 'Start practice'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {state.status === 'ready' && state.subjects.length > 0 && (
        <p className="mt-5 text-sm text-muted">
          Want different subjects? <Link to="/setup" className="link font-semibold">Change my setup</Link>.
        </p>
      )}
    </section>
  )
}
