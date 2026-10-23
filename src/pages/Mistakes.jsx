import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'
import ReportQuestion from '../components/ReportQuestion'
import { missedLabel, optionLetter, questionsLabel } from '../practice/helpers'

// Mistakes: the questions the student got wrong last time, with the right answer and why, so they can learn from them. A button starts a round
// made only of the ones in the chosen subject. A question leaves the list the next time it is answered correctly.
export default function Mistakes() {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [subject, setSubject] = useState('') // '' = all
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.practice
      .mistakes()
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((err) => !cancelled && setState({ status: 'error', data: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function practise(name) {
    setStarting(true)
    setStartError('')
    try {
      const data = await api.practice.start({ subject: name, mode: 'mistakes' })
      navigate(`/practice/session/${data.session.id}`)
    } catch (err) {
      setStartError(err.message)
      setStarting(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <section aria-labelledby="page-title">
        <h1 id="page-title" className="mb-2 text-2xl font-extrabold">
          Mistakes
        </h1>
        <p role="status" className="text-muted">
          Loading...
        </p>
      </section>
    )
  }
  if (state.status === 'error') {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-3 text-2xl font-extrabold">
          Mistakes
        </h1>
        <Notice kind="error">{state.error}</Notice>
        <button type="button" className="btn-primary mt-4" onClick={() => { setState({ status: 'loading', data: null, error: '' }); setAttempt((n) => n + 1) }}>
          Try again
        </button>
      </section>
    )
  }

  const { items, counts, total } = state.data
  const subjects = Object.keys(counts)
  const shown = subject ? items.filter((i) => i.subject === subject) : items

  if (total === 0) {
    return (
      <section className="glass p-6 sm:p-8" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-2 text-2xl font-extrabold">
          Mistakes
        </h1>
        <p className="mb-4">You have no mistakes to look at. Questions you get wrong in Practice will appear here, with the right answer and why, so you can learn from them.</p>
        <Link to="/practice" className="btn-primary">
          Go to Practice
        </Link>
      </section>
    )
  }

  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="mb-1 text-2xl font-extrabold">
        Mistakes
      </h1>
      <p className="mb-4 text-muted">
        {questionsLabel(total)} to learn from. A question leaves this list when you answer it correctly.
      </p>

      <div role="group" aria-label="Show mistakes from" className="mb-5 flex flex-wrap gap-2">
        {[['', `All (${total})`], ...subjects.map((s) => [s, `${s} (${counts[s]})`])].map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            aria-pressed={subject === value}
            onClick={() => setSubject(value)}
            className={`min-h-10 rounded-full border-[1.5px] px-4 text-sm font-semibold ${subject === value ? 'border-accent bg-[var(--choice-on)] text-accent' : 'border-[var(--input-border)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {subject && (
        <div className="glass mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="m-0 text-sm font-semibold">Practise your {subject} mistakes in a short round.</p>
          <button type="button" className="btn-primary" disabled={starting} onClick={() => practise(subject)}>
            {starting ? 'Starting...' : `Practise these (${Math.min(counts[subject], 10)})`}
          </button>
        </div>
      )}
      {startError && <Notice kind="error" className="mb-4">{startError}</Notice>}

      <ol className="m-0 grid list-none gap-4 p-0">
        {shown.map((m, n) => (
          <li key={m.id} className="glass p-5">
            <p className="m-0 mb-1 text-xs font-semibold text-muted">
              {m.subject} · {m.topic} · {missedLabel(m.wrong)}
            </p>
            <p className="m-0 mb-3 font-bold leading-snug">
              {n + 1}. {m.text}
            </p>
            <ul className="m-0 mb-3 grid list-none gap-2 p-0">
              {m.options.map((option, i) => (
                <li key={i} className={`answer is-static ${i === m.correctIndex ? 'is-right' : ''}`}>
                  <span className="answer-letter" aria-hidden="true">
                    {optionLetter(i)}
                  </span>
                  <span className="flex-1">
                    <span className="sr-only">Answer {optionLetter(i)}: </span>
                    {option}
                  </span>
                  {i === m.correctIndex && <span className="answer-tag">Correct answer</span>}
                </li>
              ))}
            </ul>
            {m.explanation && <p className="m-0 mb-3 leading-relaxed">{m.explanation}</p>}
            <ReportQuestion key={m.id} questionId={m.id} />
          </li>
        ))}
      </ol>
    </section>
  )
}
