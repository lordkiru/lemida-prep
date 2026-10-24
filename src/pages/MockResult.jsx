import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'
import ReportQuestion from '../components/ReportQuestion'
import { durationLabel, labelTone, optionLetter } from '../practice/helpers'

const FILTERS = [
  ['all', 'All'],
  ['wrong', 'Wrong'],
  ['blank', 'Not answered'],
]

// The end of a mock exam: the score and what it means in plain words, how long it took, how it went topic by topic, and every question with the
// right answer and the explanation.
export default function MockResult() {
  const { mockId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.mocks
      .result(mockId)
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((err) => {
        if (cancelled) return
        // still open and time is left: carry on with the paper instead
        if (err.code === 'NOT_SUBMITTED') navigate(`/mocks/${mockId}`, { replace: true })
        else setState({ status: 'error', data: null, error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [mockId, navigate])

  // another paper of the same length and time (the server refuses it, with a plain message, if that is no longer possible)
  async function again(subject, questions, seconds) {
    setBusy(true)
    setStartError('')
    try {
      const data = await api.mocks.start({ subject, questions, minutes: seconds && seconds % 60 === 0 ? seconds / 60 : undefined })
      navigate(`/mocks/${data.mock.id}`)
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
        <Link to="/mocks" className="btn-primary mt-4">
          Back to mock exams
        </Link>
      </section>
    )
  }

  const { mock: m, review } = state.data
  const wrong = review.filter((r) => r.correct === false)
  const blank = review.filter((r) => r.correct === null)
  const shown = filter === 'wrong' ? wrong : filter === 'blank' ? blank : review
  const counts = { all: review.length, wrong: wrong.length, blank: blank.length }

  return (
    <section aria-labelledby="page-title">
      <div className="glass mb-5 p-6 text-center sm:p-8">
        <p className="m-0 text-sm font-semibold text-muted">Mock exam · {m.subject}</p>
        <h1 id="page-title" className="mb-1 mt-2 text-5xl font-extrabold">
          {m.correct} <span className="text-muted">/ {m.total}</span>
        </h1>
        <p className="m-0 text-lg font-bold">{m.percent}%</p>
        <p className="mb-3 mt-3">
          <span className={`score-badge is-${labelTone(m.label)}`}>{m.label}</span>
        </p>
        <p className="m-0 text-sm text-muted">
          Time taken {durationLabel(m.timeTakenSeconds)} of {durationLabel(m.durationSeconds)} · {m.answered} of {m.total} answered
        </p>
        {(m.timedOut || location.state?.byClock) && (
          <Notice kind="info" className="mt-4 text-left">
            Time ran out, so your paper was handed in automatically with the answers you had chosen.
          </Notice>
        )}
        {startError && <Notice kind="error" className="mt-4 text-left">{startError}</Notice>}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => again(m.subject, m.total, m.durationSeconds)}>
            {busy ? 'Starting...' : 'Take another mock'}
          </button>
          {wrong.length > 0 && (
            <Link to="/mistakes" className="btn-secondary">
              Practise my mistakes
            </Link>
          )}
          <Link to="/mocks" className="btn-secondary">
            All mock exams
          </Link>
        </div>
        <p className="mb-0 mt-4 text-xs text-muted">This label is only for practice. It is not a WAEC or NECO grade and does not predict one.</p>
      </div>

      {m.byTopic.length > 0 && (
        <div className="glass mb-5 p-5 sm:p-6">
          <h2 className="mb-3 mt-0 text-lg font-extrabold">How you did by topic</h2>
          <ul className="m-0 grid list-none gap-4 p-0">
            {m.byTopic.map((t) => {
              const percent = Math.round((t.correct / t.total) * 100)
              return (
                <li key={t.topic}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="font-semibold">{t.topic}</span>
                    <span className="text-muted">
                      {t.correct} of {t.total} right
                    </span>
                  </div>
                  <div className="meter" role="progressbar" aria-label={`${t.topic}: ${t.correct} of ${t.total} right`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                    <div className="meter-fill" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <h2 className="mb-3 text-xl font-extrabold">Every question</h2>
      <div role="group" aria-label="Show questions" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-10 rounded-full border-[1.5px] px-4 text-sm font-semibold ${filter === value ? 'border-accent bg-[var(--choice-on)] text-accent' : 'border-[var(--input-border)]'}`}
          >
            {label} ({counts[value]})
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-muted">Nothing here: {filter === 'wrong' ? 'you got no answer wrong.' : 'every question was answered.'}</p>}
      <ol className="m-0 grid list-none gap-4 p-0">
        {shown.map((r) => {
          const number = review.indexOf(r) + 1
          const status = r.correct === true ? 'Right' : r.correct === false ? 'Wrong' : 'Not answered'
          return (
            <li key={r.id} className="glass p-5">
              <p className="m-0 mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                <span>
                  Question {number} · {r.topic}
                </span>
                <span className={`status-chip is-${r.correct === true ? 'right' : r.correct === false ? 'wrong' : 'blank'}`}>{status}</span>
              </p>
              <p className="m-0 mb-3 font-bold leading-snug">{r.text}</p>
              <ul className="m-0 mb-3 grid list-none gap-2 p-0">
                {r.options.map((option, i) => {
                  const isRight = i === r.correctIndex
                  const isWrongChoice = i === r.chosenIndex && !isRight
                  return (
                    <li key={i} className={`answer is-static ${isRight ? 'is-right' : ''} ${isWrongChoice ? 'is-wrong' : ''}`}>
                      <span className="answer-letter" aria-hidden="true">
                        {optionLetter(i)}
                      </span>
                      <span className="flex-1">
                        <span className="sr-only">Answer {optionLetter(i)}: </span>
                        {option}
                      </span>
                      {isRight && <span className="answer-tag">Correct answer</span>}
                      {isWrongChoice && <span className="answer-tag">Your answer</span>}
                    </li>
                  )
                })}
              </ul>
              {r.explanation && <p className="m-0 mb-3 leading-relaxed">{r.explanation}</p>}
              {r.chosenIndex !== null && <ReportQuestion key={r.id} questionId={r.id} />}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
