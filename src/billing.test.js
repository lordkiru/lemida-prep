// Run with:  npm test   (no browser, no server)
import assert from 'node:assert/strict'
import test from 'node:test'
import { BEFORE_KEY, clearPlanBefore, formatNaira, isPaid, loadPlanBefore, mockGate, paymentConfirmed, planLine, rememberPlanBefore, returnedFromPaystack, termDeal } from './billing.js'

// a stand-in for the browser's storage
const fakeStorage = (initial = {}) => {
  const data = { ...initial }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] } }
}
const brokenStorage = () => ({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })

const PLANS = [
  { id: 'free', name: 'Free', priceNaira: 0, months: 0 },
  { id: 'monthly', name: 'Monthly', priceNaira: 1500, months: 1 },
  { id: 'term', name: '3 months', priceNaira: 2700, months: 3 },
]

test('prices are shown in naira with thousands separators', () => {
  assert.equal(formatNaira(1500), '₦1,500')
  assert.equal(formatNaira(2700), '₦2,700')
  assert.equal(formatNaira(900), '₦900')
  assert.equal(formatNaira(0), '₦0')
  assert.equal(formatNaira(undefined), '₦0')
})

test('the 3-month plan: what a month costs and what it saves against paying monthly', () => {
  assert.deepEqual(termDeal(PLANS), { perMonth: 900, saves: 1800 })
  assert.equal(termDeal([PLANS[0]]), null, 'no deal to show without both plans')
  assert.deepEqual(termDeal([PLANS[1], { id: 'term', priceNaira: 5000, months: 3 }]), { perMonth: 1667, saves: 0 }, 'a dearer "deal" never claims a saving')
})

test('only an active plan counts as paid', () => {
  assert.equal(isPaid({ plan: 'monthly', planStatus: 'active' }), true)
  for (const user of [null, undefined, {}, { plan: 'free', planStatus: 'none' }, { plan: 'monthly', planStatus: 'expired' }]) assert.equal(isPaid(user), false, JSON.stringify(user))
})

test('the plan in a line: free, running with its end date, or ended', () => {
  assert.equal(planLine({ plan: 'free', planStatus: 'none', planEndsAt: null }, PLANS), 'Free')
  assert.equal(planLine(null, PLANS), 'Free')
  assert.equal(planLine({ plan: 'monthly', planStatus: 'active', planEndsAt: '2026-11-25T12:00:00.000Z' }, PLANS), 'Monthly plan · until 25 Nov 2026')
  assert.equal(planLine({ plan: 'term', planStatus: 'active', planEndsAt: '2027-01-25T12:00:00.000Z' }, PLANS), '3 months plan · until 25 Jan 2027')
  assert.equal(planLine({ plan: 'monthly', planStatus: 'expired', planEndsAt: '2026-10-01T12:00:00.000Z' }, PLANS), 'Monthly plan ended on 1 Oct 2026')
  assert.equal(planLine({ plan: 'monthly', planStatus: 'expired', planEndsAt: null }, PLANS), 'Monthly plan ended')
  assert.equal(planLine({ plan: 'monthly', planStatus: 'active', planEndsAt: null }, []), 'monthly plan', 'works before the plan list has loaded')
})

test('coming back from Paystack is recognised by its reference, and nothing else is trusted', () => {
  assert.equal(returnedFromPaystack('?reference=prep_64b000000000000000000001_ab12cd34ef56ab12'), 'prep_64b000000000000000000001_ab12cd34ef56ab12')
  assert.equal(returnedFromPaystack('?trxref=prep_abc123456789'), 'prep_abc123456789')
  assert.equal(returnedFromPaystack('?foo=1&reference=abcdef123456'), 'abcdef123456')
  for (const none of ['', '?', '?reference=', '?reference=ab', '?reference=<script>alert(1)</script>', '?status=success', undefined, null]) assert.equal(returnedFromPaystack(none), '', String(none))
})

test('a payment counts only once the plan has changed since the student left for Paystack', () => {
  const free = { planStatus: 'none', planEndsAt: null }
  const paidNow = { plan: 'monthly', planStatus: 'active', planEndsAt: '2026-11-25T12:00:00.000Z' }
  assert.equal(paymentConfirmed(free, free), false, 'back from Paystack, nothing yet')
  assert.equal(paymentConfirmed(free, { plan: 'free', planStatus: 'none', planEndsAt: null }), false)
  assert.equal(paymentConfirmed(free, paidNow), true, 'free to paid')
  assert.equal(paymentConfirmed(free, { plan: 'monthly', planStatus: 'expired', planEndsAt: '2026-10-01T00:00:00.000Z' }), false, 'an old plan that ended is not a payment')
  // already on a plan and renewing: "active" is not news, a later end date is
  assert.equal(paymentConfirmed({ planStatus: 'active', planEndsAt: '2026-11-25T12:00:00.000Z' }, paidNow), false)
  assert.equal(paymentConfirmed({ planStatus: 'active', planEndsAt: '2026-11-25T12:00:00.000Z' }, { ...paidNow, planEndsAt: '2026-12-25T12:00:00.000Z' }), true)
  // a plan that had run out and was bought again
  assert.equal(paymentConfirmed({ planStatus: 'expired', planEndsAt: '2026-10-01T00:00:00.000Z' }, paidNow), true)
  // no note about before (another tab, blocked storage): an active plan is taken as paid
  assert.equal(paymentConfirmed(null, paidNow), true)
  assert.equal(paymentConfirmed(null, free), false)
  assert.equal(paymentConfirmed(free, null), false)
})

test('the plan before paying is remembered for this tab only, and storage that is blocked changes nothing', () => {
  const storage = fakeStorage()
  assert.equal(loadPlanBefore({ storage }), null)
  assert.equal(rememberPlanBefore({ planStatus: 'active', planEndsAt: '2026-11-25T12:00:00.000Z' }, { storage, now: 1000 }), true)
  assert.deepEqual(JSON.parse(storage.data[BEFORE_KEY]), { planStatus: 'active', planEndsAt: '2026-11-25T12:00:00.000Z', savedAt: 1000 })
  assert.deepEqual(loadPlanBefore({ storage }), { planStatus: 'active', planEndsAt: '2026-11-25T12:00:00.000Z', savedAt: 1000 })
  clearPlanBefore({ storage })
  assert.equal(loadPlanBefore({ storage }), null)

  assert.equal(rememberPlanBefore({ planStatus: 'none' }, { storage: fakeStorage(), now: 1 }), true)
  assert.equal(rememberPlanBefore(null, { storage }), false, 'nobody signed in: nothing to remember')
  assert.equal(loadPlanBefore({ storage: fakeStorage({ [BEFORE_KEY]: 'not json' }) }), null)
  assert.equal(loadPlanBefore({ storage: fakeStorage({ [BEFORE_KEY]: '"a string"' }) }), null)
  const broken = brokenStorage()
  assert.equal(rememberPlanBefore({ planStatus: 'none' }, { storage: broken }), false)
  assert.equal(loadPlanBefore({ storage: broken }), null)
  assert.doesNotThrow(() => clearPlanBefore({ storage: broken }))
  assert.equal(rememberPlanBefore({ planStatus: 'none' }, { storage: null }), false)
})

test('the free mock limit as the Mocks page words it', () => {
  assert.deepEqual(mockGate(undefined), { limited: false, blocked: false, message: '' }, 'an older server that sends no allowance: no limit is shown')
  assert.deepEqual(mockGate({ unlimited: true, allowed: true }), { limited: false, blocked: false, message: '' })
  assert.deepEqual(mockGate({ unlimited: false, allowed: true, limit: 2, used: 0, remaining: 2 }), { limited: true, blocked: false, message: '2 free mock exams left this week.' })
  assert.equal(mockGate({ unlimited: false, allowed: true, limit: 2, used: 1, remaining: 1 }).message, '1 free mock exam left this week.')
  const blocked = mockGate({ unlimited: false, allowed: false, limit: 2, used: 2, remaining: 0, resetsAt: '2026-11-01T09:30:00.000Z' })
  assert.equal(blocked.blocked, true)
  assert.equal(blocked.limited, true)
  assert.equal(blocked.message, 'You have used your 2 free mock exams for this week. Your next free one opens on 1 Nov 2026.')
  assert.equal(mockGate({ unlimited: false, allowed: false, limit: 2, used: 2, remaining: 0, resetsAt: null }).message, 'You have used your 2 free mock exams for this week.')
})
