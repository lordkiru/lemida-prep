import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/authContext'
import { examLabel } from '../auth/rules'
import Notice from '../components/Notice'

const EXAM_HELP = { WAEC: 'West African Examinations Council', NECO: 'National Examinations Council', BOTH: 'Practise for both' }

// A group of radio buttons drawn as large tappable cards. The real <input> stays (keyboard, screen readers); the card also shows a
// tick when chosen, so the choice is never shown by colour alone.
function Choice({ name, value, checked, onChange, label, help }) {
  return (
    <label className="choice">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="choice-input" />
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {help && <span className="block text-xs text-muted">{help}</span>}
      </span>
    </label>
  )
}

// First-time setup (and "Change my setup" from Profile): which exam, which class, which year, which subjects.
export default function Setup() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const editing = Boolean(user.profileComplete)

  const [options, setOptions] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [form, setForm] = useState({ exam: user.exam || '', classLevel: user.classLevel || '', examYear: user.examYear || 0, subjects: user.subjects || [] })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.me
      .setupOptions()
      .then((data) => !cancelled && setOptions({ status: 'ready', data, error: '' }))
      .catch((err) => !cancelled && setOptions({ status: 'error', data: null, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [attempt])

  // choosing something clears that group's error straight away
  const clearError = (field) => setErrors((e) => ({ ...e, [field]: undefined }))
  const pick = (field) => (value) => {
    clearError(field)
    setForm((f) => ({ ...f, [field]: value }))
  }
  const toggleSubject = (name) => {
    clearError('subjects')
    setForm((f) => ({ ...f, subjects: f.subjects.includes(name) ? f.subjects.filter((s) => s !== name) : [...f.subjects, name] }))
  }

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    const found = {}
    if (!form.exam) found.exam = 'Choose the exam you are preparing for.'
    if (!form.classLevel) found.classLevel = 'Choose your class.'
    if (!form.examYear) found.examYear = 'Choose the year you will sit the exam.'
    if (form.subjects.length === 0) found.subjects = 'Choose at least one subject.'
    setErrors(found)
    const first = ['exam', 'classLevel', 'examYear', 'subjects'].find((f) => found[f])
    if (first) return document.getElementById(`group-${first}`)?.querySelector('input')?.focus()

    setBusy(true)
    try {
      const data = await api.me.saveProfile(form)
      setUser(data.user)
      navigate(editing ? '/profile' : '/', { replace: true })
    } catch (err) {
      setFormError(err.message)
      setBusy(false)
    }
  }

  if (options.status === 'loading') {
    return (
      <section className="glass p-6" aria-labelledby="setup-title">
        <h1 id="setup-title" className="mb-2 text-2xl font-extrabold">
          Set up your practice
        </h1>
        <p role="status" className="text-muted">
          Loading...
        </p>
      </section>
    )
  }
  if (options.status === 'error') {
    return (
      <section className="glass p-6" aria-labelledby="setup-title">
        <h1 id="setup-title" className="mb-3 text-2xl font-extrabold">
          Set up your practice
        </h1>
        <Notice kind="error">{options.error}</Notice>
        <button type="button" className="btn-primary mt-4" onClick={() => { setOptions({ status: 'loading', data: null, error: '' }); setAttempt((n) => n + 1) }}>
          Try again
        </button>
      </section>
    )
  }

  const { exams, classLevels, examYears, subjects, maxSubjects } = options.data
  const atMax = form.subjects.length >= maxSubjects
  // subjects that already have questions come first; the rest are still choosable (they start working when their questions are added)
  const orderedSubjects = [...subjects].sort((a, b) => Number(b.ready) - Number(a.ready))
  const readyNames = new Set(subjects.filter((s) => s.ready).map((s) => s.name))
  const someNotReady = subjects.some((s) => !s.ready)
  const nothingReadyChosen = form.subjects.length > 0 && !form.subjects.some((name) => readyNames.has(name))

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="setup-title">
      <h1 id="setup-title" className="mb-1 text-2xl font-extrabold">
        {editing ? 'Change your setup' : `Welcome${user.name ? `, ${user.name.split(' ')[0]}` : ''}!`}
      </h1>
      <p className="mb-6 text-muted">{editing ? 'Update what you are preparing for.' : 'Four quick questions so we can set up your practice.'}</p>

      <form onSubmit={submit} noValidate className="grid gap-7">
        {formError && <Notice kind="error">{formError}</Notice>}

        <fieldset id="group-exam" className="m-0 min-w-0 border-0 p-0" aria-describedby={errors.exam ? 'exam-error' : undefined}>
          <legend className="mb-2 text-base font-bold">1. Which exam are you preparing for?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {exams.map((x) => (
              <Choice key={x} name="exam" value={x} checked={form.exam === x} onChange={pick('exam')} label={x === 'BOTH' ? 'Both' : x} help={EXAM_HELP[x]} />
            ))}
          </div>
          {errors.exam && <p id="exam-error" className="mt-2 text-sm font-semibold text-danger">{errors.exam}</p>}
        </fieldset>

        <fieldset id="group-classLevel" className="m-0 min-w-0 border-0 p-0" aria-describedby={errors.classLevel ? 'class-error' : undefined}>
          <legend className="mb-2 text-base font-bold">2. Which class are you in?</legend>
          <div className="grid grid-cols-2 gap-2">
            {classLevels.map((c) => (
              <Choice key={c} name="classLevel" value={c} checked={form.classLevel === c} onChange={pick('classLevel')} label={c} />
            ))}
          </div>
          {errors.classLevel && <p id="class-error" className="mt-2 text-sm font-semibold text-danger">{errors.classLevel}</p>}
        </fieldset>

        <fieldset id="group-examYear" className="m-0 min-w-0 border-0 p-0" aria-describedby={errors.examYear ? 'year-error' : undefined}>
          <legend className="mb-2 text-base font-bold">3. Which year will you sit for the exam?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {examYears.map((y) => (
              <Choice key={y} name="examYear" value={y} checked={form.examYear === y} onChange={pick('examYear')} label={String(y)} />
            ))}
          </div>
          {errors.examYear && <p id="year-error" className="mt-2 text-sm font-semibold text-danger">{errors.examYear}</p>}
        </fieldset>

        <fieldset id="group-subjects" className="m-0 min-w-0 border-0 p-0" aria-describedby={errors.subjects ? 'subjects-error' : undefined}>
          <legend className="mb-1 text-base font-bold">4. Which subjects do you want to practise?</legend>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {form.subjects.length === 0 ? 'Choose all that apply. You can change this later.' : `${form.subjects.length} chosen. You can change this later.`}
          </p>
          {someNotReady && (
            <Notice kind="info" className="mb-3">
              Subjects that say &ldquo;questions ready&rdquo; can be practised today. The others are coming soon: you can still choose them, and they start working when their questions are added.
            </Notice>
          )}
          {nothingReadyChosen && (
            <Notice kind="info" className="mb-3">
              None of the subjects you chose have questions yet, so there is nothing to practise today. You can carry on and come back later, or also choose a subject that is ready.
            </Notice>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {orderedSubjects.map((s) => {
              const checked = form.subjects.includes(s.name)
              return (
                <label key={s.name} className="choice">
                  <input
                    type="checkbox"
                    value={s.name}
                    checked={checked}
                    disabled={!checked && atMax}
                    onChange={() => toggleSubject(s.name)}
                    className="choice-input"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold">{s.name}</span>
                    <span className="block text-xs text-muted">{s.ready ? `${s.questionsReady} questions ready` : 'Questions coming soon'}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {errors.subjects && <p id="subjects-error" className="mt-2 text-sm font-semibold text-danger">{errors.subjects}</p>}
        </fieldset>

        {form.exam && (
          <p className="text-sm text-muted">
            You will practise {form.subjects.length || 'no'} subject{form.subjects.length === 1 ? '' : 's'} for {examLabel(form.exam)}
            {form.examYear ? ` ${form.examYear}` : ''}.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving...' : editing ? 'Save changes' : 'Save and continue'}
          </button>
          {editing && (
            <Link to="/profile" className="link text-sm font-semibold">
              Cancel
            </Link>
          )}
        </div>
      </form>
    </section>
  )
}
