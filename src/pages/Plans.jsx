import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/authContext'
import Notice from '../components/Notice'
import { POLL_EVERY_MS, POLL_FOR_MS, clearPlanBefore, formatNaira, isPaid, loadPlanBefore, paymentConfirmed, planFeatures, planLine, rememberPlanBefore, returnedFromPaystack, termDeal } from '../billing'

// The plans: Free, Monthly, and 3 months. Paying happens on Paystack's own page; the student comes back here, and this page waits for the server to
// say the plan is active (it can take a few seconds) before it says so.
export default function Plans() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [catalog, setCatalog] = useState({ status: 'loading', plans: [], free: { mocksPerWeek: 2 }, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  // 'idle' | 'waiting' (back from Paystack, not on the plan yet) | 'paid' | 'late' (waited a minute and still nothing)
  const [payment, setPayment] = useState(() => (returnedFromPaystack(search.toString()) ? 'waiting' : 'idle'))

  useEffect(() => {
    let cancelled = false
    api.billing
      .plans()
      .then((data) => !cancelled && setCatalog({ status: 'ready', plans: data.plans, free: data.free, error: '' }))
      .catch((err) => !cancelled && setCatalog({ status: 'error', plans: [], free: { mocksPerWeek: 2 }, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [attempt])

  // The address keeps ?reference=... only until we have read it: a refresh must not start the waiting again.
  useEffect(() => {
    if (returnedFromPaystack(search.toString())) navigate('/plans', { replace: true })
  }, [search, navigate])

  // Back from Paystack: ask the server who has what, every few seconds, until the payment shows up or a minute has passed.
  const check = useCallback(async () => {
    try {
      const data = await api.me.get()
      setUser(data.user)
      if (paymentConfirmed(loadPlanBefore(), data.user)) {
        clearPlanBefore()
        setPayment('paid')
        return true
      }
    } catch {
      // a failed check is just tried again
    }
    return false
  }, [setUser])

  useEffect(() => {
    if (payment !== 'waiting') return undefined
    const stopAt = Date.now() + POLL_FOR_MS
    let timer
    let cancelled = false
    const tick = async () => {
      if (await check()) return
      if (cancelled) return
      if (Date.now() >= stopAt) return setPayment('late')
      timer = setTimeout(tick, POLL_EVERY_MS)
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [payment, check])

  async function subscribe(planId) {
    setBusy(planId)
    setError('')
    try {
      const data = await api.billing.initialize(planId)
      rememberPlanBefore(user)
      window.location.assign(data.authorizationUrl)
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  const deal = termDeal(catalog.plans)
  const paid = isPaid(user)

  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="mb-1 text-2xl font-extrabold">
        Plans
      </h1>
      <p className="mb-5 text-muted">Practice is free, always. Choose a plan when you want more mock exams.</p>

      {payment === 'waiting' && (
        <Notice kind="info" className="mb-5">
          <strong>Confirming your payment...</strong> This usually takes a few seconds. Please keep this page open.
        </Notice>
      )}
      {payment === 'paid' && (
        <Notice kind="success" className="mb-5">
          <strong>Payment received.</strong> You are on the {planLine(user, catalog.plans)}. Thank you!
        </Notice>
      )}
      {payment === 'late' && (
        <Notice kind="info" className="mb-5">
          <strong>We have not seen your payment yet.</strong> If you paid, it can take a few minutes, and your plan will switch on by itself. If you cancelled, nothing was charged.
          <div className="mt-3">
            <button type="button" className="btn-secondary" onClick={() => setPayment('waiting')}>
              Check again
            </button>
          </div>
        </Notice>
      )}

      <div className="glass mb-5 p-4">
        <p className="m-0 text-sm text-muted">Your plan</p>
        <p className="m-0 text-lg font-extrabold">{planLine(user, catalog.plans)}</p>
      </div>

      {catalog.status === 'loading' && (
        <p role="status" className="text-muted">
          Loading...
        </p>
      )}
      {catalog.status === 'error' && (
        <div className="glass p-5">
          <Notice kind="error">{catalog.error}</Notice>
          <button type="button" className="btn-primary mt-4" onClick={() => { setCatalog((c) => ({ ...c, status: 'loading' })); setAttempt((n) => n + 1) }}>
            Try again
          </button>
        </div>
      )}
      {error && <Notice kind="error" className="mb-4">{error}</Notice>}

      {catalog.status === 'ready' && (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {catalog.plans.map((plan) => {
            const isFree = plan.id === 'free'
            const current = isFree ? !paid : paid && user.plan === plan.id
            return (
              <li key={plan.id} className="glass flex flex-col gap-3 p-5" aria-label={`${plan.name} plan`}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="m-0 text-lg font-extrabold">{plan.name}</h2>
                  {plan.id === 'term' && deal && deal.saves > 0 && <span className="chip-amber shrink-0">Save {formatNaira(deal.saves)}</span>}
                </div>
                <p className="m-0">
                  <span className="text-3xl font-extrabold">{isFree ? 'Free' : formatNaira(plan.priceNaira)}</span>
                  {!isFree && <span className="text-sm text-muted"> {plan.months === 1 ? 'a month' : `for ${plan.months} months`}</span>}
                </p>
                {plan.id === 'term' && deal && <p className="m-0 text-sm text-muted">That is {formatNaira(deal.perMonth)} a month.</p>}
                <ul className="m-0 grid list-none gap-2 p-0 text-sm">
                  {planFeatures(plan, catalog.free).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  {isFree ? (
                    <p className="m-0 text-sm font-semibold text-muted">{current ? 'Your plan' : 'Always available'}</p>
                  ) : (
                    <button type="button" className="btn-primary" disabled={Boolean(busy) || payment === 'waiting'} onClick={() => subscribe(plan.id)}>
                      {busy === plan.id ? 'Opening Paystack...' : current ? `Renew ${plan.name.toLowerCase()}` : 'Subscribe'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {catalog.status === 'ready' && (
        <p className="mt-4 text-xs text-muted">
          You pay on Paystack&apos;s secure page; we never see your card details. Renewing adds time after your current plan ends and gives you a fresh set of mock exams. Mock exams you have not used from your current plan do not carry over, so it is best to renew once you have used them.
        </p>
      )}
    </section>
  )
}
