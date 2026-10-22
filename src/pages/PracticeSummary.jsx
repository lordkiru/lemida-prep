import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'
import { optionLetter, scoreMessage } from '../practice/helpers'

// The end of a round: the score, and every question that was missed, with the right answer and why.
export default function PracticeSummary() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', summary: null, error: '' })
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.practice
      .summary(sessionId)
      .catch((err) => (err.code === 'NOT_FINISHED' ? api.practice.finish(sessionId) : Promise.reject(err)))
      .then((data) => !cancelled && setState({ status: 'ready', summary: data.summary, error: '' }))
      .catch((err) => !cancelled && setState({ status: 'error', summary: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [sessionId])

  async function again() {
    setBusy(true)
    setStartError('')
    try {
      const data = await api.practice.start({ subject: state.summary.subject })
      navigate(`/practice/session/${data.session.id}`)
    } catch (err) {
      setStartError(err.message)
      setBusy(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-2 text-2xl font-extrabold">
          Your results
        </h1>
        <p role="status" className="text-muted">
          Adding up your score...
        </p>
      </section>
    )
  }
  if (state.status === 'error') {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-3 text-2xl font-extrabold">
          Your results
        </h1>
        <Notice kind="error">{state.error}</Notice>
        <Link to="/practice" className="btn-primary mt-4">
          Back to subjects
        </Link>
      </section>
    )
  }

  const s = state.summary
  return (
    <section aria-labelledby="page-title">
      <div className="glass mb-5 p-6 text-center sm:p-8">
        <p className="m-0 text-sm font-semibold text-muted">
          {s.subject}
          {s.allSeen ? ' · Revision' : ''}
        </p>
        <h1 id="page-title" className="mb-1 mt-2 text-5xl font-extrabold">
          {s.correct} <span className="text-muted">/ {s.total}</span>
        </h1>
        <p className="m-0 text-lg font-bold">{s.percent}%</p>
        <p className="mb-5 mt-3 text-muted">{scoreMessage(s.percent, s.total)}</p>
        {startError && <Notice kind="error" className="mb-4 text-left">{startError}</Notice>}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn-primary" onClick={again} disabled={busy}>
            {busy ? 'Starting...' : 'Practise again'}
          </button>
          <Link to="/practice" className="btn-secondary">
            Back to subjects
          </Link>
        </div>
      </div>

      {s.missed.length > 0 ? (
        <>
          <h2 className="mb-3 text-xl font-extrabold">Questions to look at again</h2>
          <ol className="m-0 grid list-none gap-4 p-0">
            {s.missed.map((m, n) => (
              <li key={m.id} className="glass p-5">
                <p className="m-0 mb-3 font-bold leading-snug">
                  {n + 1}. {m.text}
                </p>
                <p className="m-0 mb-1 text-sm">
                  <span className="font-semibold text-danger">Your answer: </span>
                  {optionLetter(m.chosenIndex)}. {m.options[m.chosenIndex]}
                </p>
                <p className="m-0 mb-3 text-sm">
                  <span className="font-semibold text-accent">Correct answer: </span>
                  {optionLetter(m.correctIndex)}. {m.options[m.correctIndex]}
                </p>
                {m.explanation && <p className="m-0 leading-relaxed">{m.explanation}</p>}
              </li>
            ))}
          </ol>
        </>
      ) : (
        s.answered > 0 && <p className="text-center font-semibold">Nothing to look at again. Every answer was right.</p>
      )}
    </section>
  )
}
