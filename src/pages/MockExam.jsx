import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'
import { formatClock, ofLabel, optionForKey, optionLetter, timeWarning, unansweredCount } from '../practice/helpers'

// One mock exam, sat on the screen. The server owns the clock and keeps every choice as soon as it is made; this page shows the countdown, lets the
// student move between questions and change answers, and hands the paper in (or is handed in by the clock). Nothing here ever shows whether an
// answer is right: that comes only with the results.
export default function MockExam() {
  const { mockId } = useParams()
  const navigate = useNavigate()
  const [load, setLoad] = useState({ status: 'loading', error: '' })
  const [mock, setMock] = useState(null)
  const [answers, setAnswers] = useState({}) // questionId -> chosen index
  const [unsaved, setUnsaved] = useState({}) // questionId -> chosen index (or null) the server has not confirmed yet
  const [index, setIndex] = useState(0)
  const [left, setLeft] = useState(0)
  const [announce, setAnnounce] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const deadline = useRef(0) // when the paper ends, by this device's clock, worked out from the seconds the server says are left
  const lastLeft = useRef(0)
  const handedIn = useRef(false)
  const chains = useRef({}) // saves for one question go to the server one after another, so a quick change of mind cannot arrive out of order
  const unsavedRef = useRef({})
  const lastTry = useRef(0) // when handing in by the clock was last attempted, so a failing connection is retried every few seconds, not every tick
  const confirmYes = useRef(null)

  // load (or reload) the paper
  useEffect(() => {
    let cancelled = false
    api.mocks
      .get(mockId)
      .then(({ mock: m }) => {
        if (cancelled) return
        if (m.status === 'submitted') {
          navigate(`/mocks/${m.id}/result`, { replace: true })
          return
        }
        setMock(m)
        setAnswers(m.answers || {})
        deadline.current = Date.now() + m.secondsLeft * 1000
        lastLeft.current = m.secondsLeft
        setLeft(m.secondsLeft)
        setLoad({ status: 'ready', error: '' })
      })
      .catch((err) => !cancelled && setLoad({ status: 'error', error: err.message }))
    return () => {
      cancelled = true
    }
  }, [mockId, navigate])

  // hand the paper in, by the student or by the clock
  const handIn = useCallback(
    async (byClock) => {
      if (handedIn.current) return
      handedIn.current = true
      setBusy(true)
      setError('')
      // make sure the server has every choice first (the server grades what it holds)
      for (const [questionId, chosenIndex] of Object.entries(unsavedRef.current)) {
        try {
          await api.mocks.saveAnswer(mockId, { questionId, chosenIndex })
          delete unsavedRef.current[questionId]
        } catch (err) {
          if (err.code === 'MOCK_ENDED') break
          if (!byClock) {
            handedIn.current = false
            setBusy(false)
            setError('Some of your answers could not be saved. Check your connection and try again.')
            return
          }
        }
      }
      try {
        const data = await api.mocks.submit(mockId)
        navigate(`/mocks/${data.result.id}/result`, { replace: true, state: { byClock } })
      } catch (err) {
        handedIn.current = false
        setBusy(false)
        setError(byClock ? 'Time is up, but we could not hand your paper in. Keep this page open and press the button below.' : err.message)
      }
    },
    [mockId, navigate],
  )

  // the countdown
  useEffect(() => {
    if (load.status !== 'ready') return undefined
    const timer = setInterval(() => {
      const now = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      const warning = timeWarning(lastLeft.current, now)
      lastLeft.current = now
      setLeft(now)
      if (warning) setAnnounce(warning)
      if (now === 0 && Date.now() - lastTry.current > 3000) {
        lastTry.current = Date.now()
        handIn(true)
      }
    }, 500)
    return () => clearInterval(timer)
  }, [load.status, handIn])

  // coming back to the page (unlocking the phone, switching tab): ask the server how much time is really left
  useEffect(() => {
    if (load.status !== 'ready') return undefined
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      api.mocks
        .get(mockId)
        .then(({ mock: m }) => {
          if (m.status === 'submitted') navigate(`/mocks/${m.id}/result`, { replace: true, state: { byClock: true } })
          else deadline.current = Date.now() + m.secondsLeft * 1000
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load.status, mockId, navigate])

  // save one choice (null takes it back), one after another per question
  const save = useCallback(
    (questionId, chosenIndex) => {
      unsavedRef.current[questionId] = chosenIndex
      setUnsaved({ ...unsavedRef.current })
      chains.current[questionId] = (chains.current[questionId] || Promise.resolve()).then(async () => {
        try {
          await api.mocks.saveAnswer(mockId, { questionId, chosenIndex })
          if (unsavedRef.current[questionId] === chosenIndex) delete unsavedRef.current[questionId]
        } catch (err) {
          if (err.code === 'MOCK_ENDED') handIn(true)
          // any other failure leaves it in the unsaved list, with a "try again" on screen
        }
        setUnsaved({ ...unsavedRef.current })
      })
    },
    [mockId, handIn],
  )

  const questions = mock ? mock.questions : []
  const current = questions[index]
  const answeredCount = Object.keys(answers).length

  const choose = useCallback(
    (i) => {
      if (!current || busy) return
      setAnswers((a) => ({ ...a, [current.id]: i }))
      save(current.id, i)
    },
    [current, busy, save],
  )

  function clear() {
    if (!current) return
    setAnswers((a) => {
      const { [current.id]: removed, ...rest } = a
      void removed
      return rest
    })
    save(current.id, null)
  }

  function retrySaves() {
    for (const [questionId, chosenIndex] of Object.entries(unsavedRef.current)) save(questionId, chosenIndex)
  }

  // opening the "hand in?" question moves focus into it, so a keyboard or screen-reader user lands on its first button
  useEffect(() => {
    if (confirming && confirmYes.current) confirmYes.current.focus()
  }, [confirming])

  // the keyboard: a-d or 1-4 choose an answer
  useEffect(() => {
    if (!current || confirming) return undefined
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const i = optionForKey(e.key, current.options.length)
      if (i >= 0) choose(i)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, confirming, choose])

  if (load.status === 'loading') {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-2 text-2xl font-extrabold">
          Mock exam
        </h1>
        <p role="status" className="text-muted">
          Getting your paper...
        </p>
      </section>
    )
  }
  if (load.status === 'error') {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-3 text-2xl font-extrabold">
          Mock exam
        </h1>
        <Notice kind="error">{load.error}</Notice>
        <Link to="/mocks" className="btn-primary mt-4">
          Back to mock exams
        </Link>
      </section>
    )
  }
  if (!current) {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-3 text-2xl font-extrabold">
          Mock exam
        </h1>
        <p className="mb-4">There are no questions left on this paper.</p>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => handIn(false)}>
          Hand in
        </button>
      </section>
    )
  }

  const chosen = answers[current.id]
  const unsavedCount = Object.keys(unsaved).length
  // "running low" is the last five minutes of a long paper, or the last quarter of a short one (a 4-minute paper is not "low" from the start)
  const low = left <= Math.min(300, Math.floor(mock.durationSeconds / 4))

  return (
    <section aria-labelledby="question-heading">
      <p role="status" className="sr-only">
        {announce}
      </p>

      <div className="glass mb-4 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="m-0 text-sm font-semibold text-muted">Mock exam</p>
          <p className="m-0 font-bold">{mock.subject}</p>
        </div>
        <div className="text-right">
          <p className="m-0 text-xs font-semibold text-muted">Time left</p>
          <p role="timer" aria-live="off" aria-label={`${formatClock(left)} left`} className={`m-0 text-2xl font-extrabold tabular-nums ${low ? 'text-danger' : ''}`}>
            {formatClock(left)}
          </p>
        </div>
      </div>
      {low && <Notice kind="error" className="mb-4">Time is running out. Answers you have chosen are already saved.</Notice>}

      <div className="mb-2 flex items-baseline justify-between text-sm font-semibold">
        <span>Question {ofLabel(index + 1, questions.length)}</span>
        <span className="text-muted">{answeredCount} answered</span>
      </div>

      <div className="glass p-5 sm:p-7">
        <h1 id="question-heading" className="mb-5 text-xl font-bold leading-snug">
          {current.text}
        </h1>
        <div role="radiogroup" aria-labelledby="question-heading" className="grid gap-3">
          {current.options.map((option, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={chosen === i}
              className={`answer ${chosen === i ? 'is-selected' : ''}`}
              onClick={() => choose(i)}
              disabled={busy}
            >
              <span className="answer-letter" aria-hidden="true">
                {optionLetter(i)}
              </span>
              <span className="flex-1 text-left">
                <span className="sr-only">Answer {optionLetter(i)}: </span>
                {option}
              </span>
              {chosen === i && <span className="answer-tag">Your choice</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 hidden text-xs text-muted lg:block">Tip: press A, B, C or D on your keyboard.</p>
          {chosen !== undefined && (
            <button type="button" className="link min-h-11 border-0 bg-transparent p-0 text-sm font-semibold" onClick={clear} disabled={busy}>
              Clear my answer
            </button>
          )}
        </div>
      </div>

      {unsavedCount > 0 && (
        <Notice kind="error" className="mt-4">
          {unsavedCount === 1 ? 'One answer is' : `${unsavedCount} answers are`} not saved yet. Check your connection.{' '}
          <button type="button" className="link border-0 bg-transparent p-0 font-semibold" onClick={retrySaves}>
            Try again
          </button>
        </Notice>
      )}
      {error && <Notice kind="error" className="mt-4">{error}</Notice>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-secondary" disabled={index === 0 || busy} onClick={() => setIndex((n) => n - 1)}>
          Previous
        </button>
        {index < questions.length - 1 ? (
          <button type="button" className="btn-primary" disabled={busy} onClick={() => setIndex((n) => n + 1)}>
            Next question
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={busy} onClick={() => setConfirming(true)}>
            Review and hand in
          </button>
        )}
      </div>

      <div className="glass mt-5 p-4">
        <p className="mb-3 mt-0 text-sm font-semibold">Jump to a question</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Questions">
          {questions.map((qn, n) => (
            <button
              key={qn.id}
              type="button"
              className={`qnum ${answers[qn.id] !== undefined ? 'is-answered' : ''} ${n === index ? 'is-current' : ''}`}
              aria-label={`Question ${n + 1}, ${answers[qn.id] !== undefined ? 'answered' : 'not answered'}`}
              aria-current={n === index ? 'true' : undefined}
              onClick={() => setIndex(n)}
              disabled={busy}
            >
              {n + 1}
              {answers[qn.id] !== undefined && <span className="qdot" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <p className="mb-0 mt-3 text-xs text-muted">A dot under a number means you have answered it.</p>
      </div>

      <div className="mt-5">
        {!confirming ? (
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(true)}>
            Hand in my paper
          </button>
        ) : (
          <div className="glass grid gap-3 p-5" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-text">
            <h2 id="confirm-title" className="m-0 text-lg font-extrabold">
              Hand in your paper?
            </h2>
            <p id="confirm-text" className="m-0">
              You have answered {ofLabel(answeredCount, questions.length)} questions.
              {unansweredCount(questions.length, answeredCount) > 0 ? ` ${unansweredCount(questions.length, answeredCount)} have no answer and will score nothing.` : ''} Once you hand in, you cannot change your answers.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button ref={confirmYes} type="button" className="btn-primary" disabled={busy} onClick={() => handIn(false)}>
                {busy ? 'Handing in...' : 'Yes, hand in'}
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>
                Keep working
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
