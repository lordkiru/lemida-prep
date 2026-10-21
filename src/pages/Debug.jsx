import { useEffect, useState } from 'react'
import { api } from '../api'

// A hidden page (/debug, not in the menu) to check that this build can reach the API: it calls GET /api/prep/health.
export default function Debug() {
  const [attempt, setAttempt] = useState(0)
  // the last answer, tagged with the attempt it belongs to, so "checking" is simply "no answer for this attempt yet"
  const [result, setResult] = useState({ attempt: -1, ok: false, message: '' })

  useEffect(() => {
    let cancelled = false
    api
      .health()
      .then((ok) => !cancelled && setResult({ attempt, ok, message: ok ? '' : 'The server answered, but not with { ok: true }.' }))
      .catch((err) => !cancelled && setResult({ attempt, ok: false, message: err.message }))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const answered = result.attempt === attempt

  return (
    <section className="glass p-6 sm:p-8" aria-labelledby="debug-title">
      <h1 id="debug-title" className="mb-4 text-2xl font-extrabold">
        Debug
      </h1>
      <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">API address</dt>
        <dd className="m-0 break-all font-semibold">{api.baseUrl || 'not set (VITE_API_URL)'}</dd>
        <dt className="text-muted">Health check</dt>
        <dd className="m-0 font-semibold">GET /api/prep/health</dd>
      </dl>

      <p role="status" className="mb-4 text-lg font-extrabold">
        {!answered ? 'Checking...' : result.ok ? <span className="text-accent">Connected</span> : <span>Not connected</span>}
      </p>
      {answered && !result.ok && <p className="mb-4 text-sm text-muted">{result.message}</p>}

      <button type="button" onClick={() => setAttempt((n) => n + 1)} disabled={!answered} className="btn-primary">
        Check again
      </button>
    </section>
  )
}
