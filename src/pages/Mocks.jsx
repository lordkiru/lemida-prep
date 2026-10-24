import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'
import { clampMinutes, durationLabel, formatClock, labelTone, minutesProblem, mockBounds, questionChoices, questionsLabel, timePresets } from '../practice/helpers'

const when = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

const chipClass = (on) => `min-h-10 rounded-full border-[1.5px] px-4 text-sm font-semibold ${on ? 'border-accent bg-[var(--choice-on)] text-accent' : 'border-[var(--input-border)]'}`

// What the student chooses before a paper starts: how many questions and how many minutes. The standard (the biggest paper at the standard pace)
// is filled in, so one tap still starts a normal mock.
function MockSetup({ subject, biggest, timing, pace, exam, busy, onStart }) {
  const choices = questionChoices(biggest, timing.minQuestions)
  const [size, setSize] = useState(biggest)
  const bounds = mockBounds(size, timing, pace)
  const [typed, setTyped] = useState(null) // what the student typed; null = follow the standard for the chosen size
  const minutes = typed === null ? String(bounds.standard) : typed
  const problem = minutesProblem(minutes, bounds)
  // on a very short paper two quick choices can land on the same number: show it once
  const presets = timePresets(bounds).filter((p, i, all) => all.findIndex((q) => q.minutes === p.minutes) === i)
  const id = `minutes-${subject.replace(/\W+/g, '-')}`

  return (
    <div className="grid gap-3">
      {choices.length > 1 && (
        <div role="group" aria-label={`Number of questions for ${subject}`}>
          <p className="m-0 mb-2 text-sm font-semibold">Questions</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((n) => (
              <button key={n} type="button" aria-label={questionsLabel(n)} aria-pressed={size === n} className={chipClass(size === n)} onClick={() => {
                  setSize(n)
                  // a time the student typed stays while it still fits the new paper; otherwise the standard for it is used
                  if (typed !== null && minutesProblem(typed, mockBounds(n, timing, pace))) setTyped(null)
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label htmlFor={id} className="mb-2 block text-sm font-semibold">
          Time in minutes
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="field-input"
            style={{ width: '6rem' }}
            value={minutes}
            aria-invalid={problem ? 'true' : undefined}
            aria-describedby={`${id}-help`}
            onChange={(e) => setTyped(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            onBlur={() => {
              if (problem) setTyped(String(clampMinutes(minutes, bounds)))
            }}
          />
          {presets.map((p) => (
            <button key={p.key} type="button" aria-pressed={Number(minutes) === p.minutes} className={chipClass(Number(minutes) === p.minutes)} onClick={() => setTyped(String(p.minutes))}>
              {p.label} ({p.minutes})
            </button>
          ))}
        </div>
        <p id={`${id}-help`} className={`m-0 mt-2 text-xs ${problem ? 'font-semibold text-danger' : 'text-muted'}`} role={problem ? 'alert' : undefined}>
          {problem || `Exam timing for ${questionsLabel(size)} is ${bounds.standard} minutes. You can choose ${bounds.min} to ${bounds.max}.`}
          {!problem && exam && exam.known ? ` The real exam's objective paper lasts ${exam.minutes} minutes.` : ''}
        </p>
      </div>
      <button type="button" className="btn-primary" disabled={busy || Boolean(problem)} onClick={() => onStart({ questions: size, minutes: Number(minutes) === bounds.standard ? undefined : Number(minutes) })}>
        {busy ? 'Starting...' : `Start mock exam (${questionsLabel(size)} · ${minutes} min)`}
      </button>
    </div>
  )
}

// Mock exams: a timed paper in one subject. This page says what each paper is, shows the last and best scores, and lists recent papers.
export default function Mocks() {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    let cancelled = false
    api.mocks
      .list()
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((err) => !cancelled && setState({ status: 'error', data: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function start(subject, choices) {
    setBusy(subject)
    setErrors((e) => ({ ...e, [subject]: '' }))
    try {
      const data = await api.mocks.start({ subject, ...choices })
      navigate(`/mocks/${data.mock.id}`)
    } catch (err) {
      setErrors((e) => ({ ...e, [subject]: err.message }))
      setBusy('')
    }
  }

  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="mb-1 text-2xl font-extrabold">
        Mock exams
      </h1>
      <p className="mb-5 text-muted">
        A mock is a timed paper in one subject. You choose your answers and see how you did at the end, not after each question. You can change an answer until you hand the paper in. The
        clock keeps running if you leave the page.
      </p>

      {state.status === 'loading' && (
        <p role="status" className="text-muted">
          Loading...
        </p>
      )}
      {state.status === 'error' && (
        <div className="glass p-5">
          <Notice kind="error">{state.error}</Notice>
          <button type="button" className="btn-primary mt-4" onClick={() => { setState({ status: 'loading', data: null, error: '' }); setAttempt((n) => n + 1) }}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
            {state.data.subjects.map((s) => {
              const ready = s.questions > 0
              return (
                <li key={s.name} className="glass flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="m-0 text-lg font-extrabold">{s.name}</h2>
                    {!ready && <span className="chip-amber shrink-0">Coming soon</span>}
                  </div>
                  {ready ? (
                    <>
                      <p className="m-0 text-sm text-muted">
                        {questionsLabel(s.questions)} · {s.minutes} minutes
                        {s.questions < (s.exam ? s.exam.questions : 40) ? ' (a shorter paper: more questions are on their way)' : ''}
                      </p>
                      {s.taken > 0 && (
                        <p className="m-0 text-sm">
                          Last score <strong>{s.last}%</strong> · Best <strong>{s.best}%</strong> · Taken {s.taken} time{s.taken === 1 ? '' : 's'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="m-0 text-sm text-muted">We are still adding questions for this subject.</p>
                  )}
                  {errors[s.name] && <Notice kind="error">{errors[s.name]}</Notice>}
                  {ready && (
                    <div className="mt-auto pt-1">
                      {s.active ? (
                        <Link to={`/mocks/${s.active.id}`} className="btn-primary">
                          Continue ({formatClock(s.active.secondsLeft)} left)
                        </Link>
                      ) : (
                        <MockSetup subject={s.name} biggest={s.questions} timing={state.data.timing} pace={s.secondsPerQuestion} exam={s.exam} busy={busy === s.name} onStart={(choices) => start(s.name, choices)} />
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {state.data.history.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-xl font-extrabold">Your recent mocks</h2>
              <ul className="m-0 grid list-none gap-3 p-0">
                {state.data.history.map((h) => (
                  <li key={h.id} className="glass flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="m-0 font-bold">{h.subject}</p>
                      <p className="m-0 text-sm text-muted">
                        {when(h.submittedAt)} · {h.total} questions{h.durationSeconds ? ` in ${durationLabel(h.durationSeconds)}` : ''}
                        {h.timedOut ? ' · handed in when time ran out' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`score-badge is-${labelTone(h.label)}`}>
                        {h.percent}% · {h.label}
                      </span>
                      <Link to={`/mocks/${h.id}/result`} className="link text-sm font-semibold">
                        See results
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
