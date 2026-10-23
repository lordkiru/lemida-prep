import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/authContext'
import { examLabel } from '../auth/rules'
import { ofLabel, seenPercent } from '../practice/helpers'

// Home: a greeting, where to carry on, how far each subject has got, and the mistakes waiting to be looked at.
// If the overview cannot be loaded the page still works: the greeting and a link to Practice are always there.
export default function Home() {
  const { user } = useAuth()
  const first = (user.name || '').split(' ')[0]
  const [subjects, setSubjects] = useState(null) // null while loading or if it failed

  useEffect(() => {
    let cancelled = false
    api.practice
      .subjects()
      .then((data) => !cancelled && setSubjects(data.subjects))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const carryOn = (subjects || []).find((s) => s.active)
  const mistakes = (subjects || []).reduce((sum, s) => sum + (s.mistakes || 0), 0)
  const ready = (subjects || []).filter((s) => s.available > 0)

  return (
    <section aria-labelledby="page-title" className="grid gap-5">
      <div className="glass p-6 sm:p-8">
        <h1 id="page-title" className="mb-2 text-2xl font-extrabold">
          {first ? `Hi, ${first}` : 'Hi'}
        </h1>
        <p className="mb-5 text-muted">
          You are preparing for {examLabel(user.exam)} {user.examYear} in {user.classLevel}, with {user.subjects.length} subject{user.subjects.length === 1 ? '' : 's'}.
        </p>
        {carryOn ? (
          <Link to={`/practice/session/${carryOn.active.id}`} className="btn-primary">
            Continue {carryOn.name} ({ofLabel(carryOn.active.answered, carryOn.active.total)} answered)
          </Link>
        ) : (
          <Link to="/practice" className="btn-primary">
            Start practising
          </Link>
        )}
      </div>

      {mistakes > 0 && (
        <div className="glass flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="m-0 font-semibold">
            You have {mistakes} mistake{mistakes === 1 ? '' : 's'} to learn from.
          </p>
          <Link to="/mistakes" className="btn-secondary">
            Review my mistakes
          </Link>
        </div>
      )}

      {ready.length > 0 && (
        <div className="glass p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-extrabold">Your progress</h2>
          <ul className="m-0 grid list-none gap-4 p-0">
            {ready.map((s) => {
              const percent = seenPercent(s.seen, s.available)
              return (
                <li key={s.name}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-muted">
                      Seen {ofLabel(s.seen, s.available)}
                      {s.mistakes > 0 ? ` · ${s.mistakes} to review` : ''}
                    </span>
                  </div>
                  <div className="meter" role="progressbar" aria-label={`${s.name}: questions seen`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                    <div className="meter-fill" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="m-0 text-sm text-muted">
        Mocks are on their way. <span className="chip-amber ml-2">Coming soon</span>
      </p>
    </section>
  )
}
