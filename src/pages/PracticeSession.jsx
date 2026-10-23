import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Notice from '../components/Notice'
import ReportQuestion from '../components/ReportQuestion'
import { firstUnanswered, ofLabel, optionForKey, optionLetter } from '../practice/helpers'

// One practice round: a question at a time. Choose an answer, see at once whether it was right and why, then go on.
// The questions arrive without their answers. The server checks each choice and sends the right answer and the explanation back.
export default function PracticeSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [load, setLoad] = useState({ status: 'loading', error: '' })
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [results, setResults] = useState({}) // questionId -> result
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const nextRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api.practice
      .get(sessionId)
      .then(({ session: s }) => {
        if (cancelled) return
        if (s.status !== 'active') {
          navigate(`/practice/session/${s.id}/summary`, { replace: true })
          return
        }
        setSession(s)
        setQuestions(s.questions)
        setResults(Object.fromEntries(s.results.map((r) => [r.questionId, r])))
        setLoad({ status: 'ready', error: '' })
      })
      .catch((err) => !cancelled && setLoad({ status: 'error', error: err.message }))
    return () => {
      cancelled = true
    }
  }, [sessionId, navigate])

  const answeredList = Object.values(results)
  const index = load.status === 'ready' ? firstUnanswered(questions, answeredList) : 0
  // the question on screen: the first one without a result, or (just after answering) the one that was answered last
  const [showing, setShowing] = useState(null)
  const current = questions.find((q) => q.id === showing) || questions[index === -1 ? questions.length - 1 : index]
  const result = current ? results[current.id] : null
  const position = current ? questions.findIndex((q) => q.id === current.id) + 1 : 0
  const isLast = position === questions.length

  // when feedback appears, move the focus to "Next", so a keyboard or screen-reader user lands on it
  useEffect(() => {
    if (result && nextRef.current) nextRef.current.focus()
  }, [result])

  const choose = useCallback(
    async (chosenIndex) => {
      if (!current || result || busy) return
      setBusy(true)
      setError('')
      try {
        const r = await api.practice.answer(sessionId, { questionId: current.id, chosenIndex })
        setResults((all) => ({ ...all, [current.id]: r }))
        setShowing(current.id)
      } catch (err) {
        if (err.code === 'QUESTION_UNAVAILABLE') {
          // taken out of Exam Prep since the round began: drop it and carry on
          setNotice('A question was removed while you were practising. Moving on.')
          setQuestions((qs) => qs.filter((q) => q.id !== current.id))
          setShowing(null)
        } else {
          setError(err.message)
        }
      } finally {
        setBusy(false)
      }
    },
    [current, result, busy, sessionId],
  )

  async function next() {
    setNotice('')
    setShowing(null)
    if (firstUnanswered(questions, Object.values(results)) === -1) await end()
  }

  async function end() {
    setBusy(true)
    setError('')
    try {
      await api.practice.finish(sessionId)
      navigate(`/practice/session/${sessionId}/summary`, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  // the keyboard: a-d or 1-4 choose an answer
  useEffect(() => {
    if (!current || result) return undefined
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const i = optionForKey(e.key, current.options.length)
      if (i >= 0) choose(i)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, result, choose])

  if (load.status === 'loading') {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-2 text-2xl font-extrabold">
          Practice
        </h1>
        <p role="status" className="text-muted">
          Getting your questions...
        </p>
      </section>
    )
  }
  if (load.status === 'error') {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-3 text-2xl font-extrabold">
          Practice
        </h1>
        <Notice kind="error">{load.error}</Notice>
        <Link to="/practice" className="btn-primary mt-4">
          Back to subjects
        </Link>
      </section>
    )
  }
  if (!current) {
    return (
      <section className="glass p-6" aria-labelledby="page-title">
        <h1 id="page-title" className="mb-3 text-2xl font-extrabold">
          Practice
        </h1>
        <p className="mb-4">There are no questions left in this round.</p>
        <button type="button" className="btn-primary" onClick={end} disabled={busy}>
          See my results
        </button>
      </section>
    )
  }

  const answered = answeredList.filter((r) => questions.some((q) => q.id === r.questionId)).length
  const percent = Math.round((answered / questions.length) * 100)

  return (
    <section aria-labelledby="question-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="m-0 text-sm font-semibold text-muted">
          {session.subject}
          {session.mode === 'mistakes' ? ' · Mistakes' : session.allSeen ? ' · Revision' : ''}
        </p>
        <Link to="/practice" className="link text-sm font-semibold">
          Finish later
        </Link>
      </div>

      <div className="mb-1 flex items-baseline justify-between text-sm font-semibold">
        <span>Question {ofLabel(position, questions.length)}</span>
        <span className="text-muted">{answered} answered</span>
      </div>
      <div className="meter mb-5" role="progressbar" aria-label="Progress through this round" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="meter-fill" style={{ width: `${percent}%` }} />
      </div>

      {notice && <Notice kind="info" className="mb-4">{notice}</Notice>}

      <div className="glass p-5 sm:p-7">
        <h1 id="question-heading" className="mb-5 text-xl font-bold leading-snug">
          {current.text}
        </h1>

        <ul className="m-0 grid list-none gap-3 p-0" aria-label="Answers">
          {current.options.map((option, i) => {
            const isRight = result && i === result.correctIndex
            const isWrongChoice = result && i === result.chosenIndex && !result.correct
            const state = isRight ? 'is-right' : isWrongChoice ? 'is-wrong' : ''
            return (
              <li key={i}>
                <button type="button" className={`answer ${state}`} disabled={Boolean(result) || busy} onClick={() => choose(i)} aria-describedby={result ? 'feedback' : undefined}>
                  <span className="answer-letter" aria-hidden="true">
                    {optionLetter(i)}
                  </span>
                  <span className="flex-1 text-left">
                    <span className="sr-only">Answer {optionLetter(i)}: </span>
                    {option}
                  </span>
                  {isRight && <span className="answer-tag">Correct answer</span>}
                  {isWrongChoice && <span className="answer-tag">Your answer</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {!result && <p className="mb-0 mt-4 hidden text-xs text-muted lg:block">Tip: press A, B, C or D on your keyboard.</p>}
        {error && <Notice kind="error" className="mt-4">{error}</Notice>}

        {result && (
          <div id="feedback" className="mt-5" role="status">
            <p className={`m-0 mb-2 text-lg font-extrabold ${result.correct ? 'text-accent' : 'text-danger'}`}>
              {result.correct ? 'Correct!' : `Not quite. The answer is ${optionLetter(result.correctIndex)}.`}
            </p>
            {result.explanation && <p className="m-0 text-base leading-relaxed">{result.explanation}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" ref={nextRef} className="btn-primary" onClick={next} disabled={busy}>
                {isLast ? (busy ? 'Finishing...' : 'See my results') : 'Next question'}
              </button>
            </div>
          </div>
        )}
        {/* outside the live region above, so opening the form is not read out as news */}
        {result && <ReportQuestion key={current.id} questionId={current.id} className="mt-5" />}
      </div>

      {answered > 0 && !result && (
        <p className="mt-4 text-sm">
          <button type="button" className="link border-0 bg-transparent p-0 font-semibold" onClick={end} disabled={busy}>
            End this round now
          </button>
        </p>
      )}
    </section>
  )
}
