import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { MAX_REPORT_NOTE, REPORT_REASONS } from '../practice/helpers'
import Notice from './Notice'

// "Report a problem with this question": the student says what is wrong (and may add a note). It goes to the people who review the questions.
// The API only accepts it for a question the student has already answered, and says nothing back about the question itself.
// Give it a `key` of the question's id, so a new question starts with a fresh form.
//
// Keyboard and screen-reader users are never left stranded: opening the form moves focus to its first choice, cancelling puts focus back on the
// link that opened it, and sending moves focus to the thank-you message.
export default function ReportQuestion({ questionId, className = '' }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('') // '' | 'sent' | 'already'
  const openButton = useRef(null)
  const firstChoice = useRef(null)
  const thanks = useRef(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && firstChoice.current) firstChoice.current.focus()
    // the form was closed again without sending: back to the link that opened it
    if (!open && wasOpen.current && openButton.current) openButton.current.focus()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (done && thanks.current) thanks.current.focus()
  }, [done])

  async function send(e) {
    e.preventDefault()
    if (!reason) {
      setError('Choose what is wrong with the question.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await api.practice.reportQuestion(questionId, { reason, comment: comment.trim() })
      setDone(data.already ? 'already' : 'sent')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p ref={thanks} tabIndex={-1} role="status" className={`m-0 text-sm font-semibold ${className}`}>
        {done === 'already' ? 'You have already reported this question. Thank you.' : 'Thank you. We will check this question.'}
      </p>
    )
  }

  if (!open) {
    return (
      <button ref={openButton} type="button" onClick={() => setOpen(true)} className={`link inline-flex min-h-11 items-center border-0 bg-transparent p-0 text-left text-sm font-semibold ${className}`}>
        Report a problem with this question
      </button>
    )
  }

  const id = `report-${questionId}`
  return (
    <form onSubmit={send} noValidate className={`grid gap-3 rounded-2xl border border-[var(--glass-border)] p-4 ${className}`} aria-label="Report a problem with this question">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 text-sm font-bold">What is wrong?</legend>
        <div className="grid gap-2">
          {REPORT_REASONS.map((r, i) => (
            <label key={r.value} className="choice">
              <input
                ref={i === 0 ? firstChoice : undefined}
                type="radio"
                name={id}
                value={r.value}
                checked={reason === r.value}
                onChange={() => {
                  setReason(r.value)
                  setError('')
                }}
                className="choice-input"
              />
              <span className="flex-1 text-sm font-semibold">{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-note`} className="mb-1 block text-sm font-semibold">
          Tell us more (optional)
        </label>
        <textarea id={`${id}-note`} className="field-input" rows={3} maxLength={MAX_REPORT_NOTE} value={comment} onChange={(e) => setComment(e.target.value)} />
        <p className="mb-0 mt-1 text-xs text-muted">{MAX_REPORT_NOTE - comment.length} characters left</p>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Sending...' : 'Send report'}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setOpen(false); setError('') }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
