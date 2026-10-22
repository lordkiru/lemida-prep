import { useState } from 'react'

// A labelled text box. The label is always visible (never only a placeholder), a hint sits under it, and an error is tied to the
// box with aria-describedby / aria-invalid so a screen reader reads it with the field.
export default function Field({ id, label, hint, error, className = '', ...input }) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <input id={id} name={id} className="field-input" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...input} />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

// The same, for passwords, with a Show / Hide button (so a phone keyboard slip is easy to spot).
export function PasswordField({ id, label, hint, error, className = '', ...input }) {
  const [shown, setShown] = useState(false)
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={shown ? 'text' : 'password'}
          className="field-input pr-20"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...input}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 min-h-9 -translate-y-1/2 rounded-lg px-3 text-xs font-bold text-accent hover:bg-black/5 dark:hover:bg-white/10"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
