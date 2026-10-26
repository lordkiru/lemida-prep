// Run with:  npm test   (no browser, no server)
import assert from 'node:assert/strict'
import test from 'node:test'
import { BEFORE_KEY, clearPlanBefore, formatNaira, isPaid, loadPlanBefore, freeIntro, mockGate, paymentConfirmed, planFeatures, planLine, practiceGate, rememberPlanBefore, returnedFromPaystack, termDeal } from './billing.js'

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

const NONE = { kind: null, limited: false, blocked: false, message: '', detail: '', actionLabel: '' }

test('the free mock limit as the Mocks page words it', () => {
  assert.deepEqual(mockGate(undefined), NONE, 'an older server that sends no allowance: no limit is shown')
  assert.deepEqual(mockGate({ unlimited: true, allowed: true }), NONE)
  const some = mockGate({ kind: 'free', unlimited: false, allowed: true, limit: 2, used: 0, remaining: 2 })
  assert.deepEqual([some.kind, some.limited, some.blocked, some.message], ['free', true, false, '2 free mock exams left this week.'])
  assert.equal(mockGate({ kind: 'free', unlimited: false, allowed: true, limit: 2, used: 1, remaining: 1 }).message, '1 free mock exam left this week.')
  const blocked = mockGate({ kind: 'free', unlimited: false, allowed: false, limit: 2, used: 2, remaining: 0, resetsAt: '2026-11-01T09:30:00.000Z' })
  assert.deepEqual([blocked.kind, blocked.limited, blocked.blocked], ['free', true, true])
  assert.equal(blocked.message, 'You have used your 2 free mock exams for this week. Your next free one opens on 1 Nov 2026.')
  assert.equal(blocked.actionLabel, 'Upgrade to start another', 'a free student is invited to choose a plan')
  assert.match(blocked.detail, /Choose a plan/)
  assert.equal(mockGate({ kind: 'free', unlimited: false, allowed: false, limit: 2, used: 2, remaining: 0, resetsAt: null }).message, 'You have used your 2 free mock exams for this week.')
  assert.equal(mockGate({ unlimited: false, allowed: false, limit: 2, used: 2, remaining: 0 }).kind, 'free', 'an allowance with no kind is the free week (an older server)')
})

const plan = (over) => ({ kind: 'plan', unlimited: false, allowed: true, limit: 10, used: 3, remaining: 7, bonus: 0, includesReferralBonus: false, periodEndsAt: '2026-11-25T12:00:00.000Z', resetsAt: null, ...over })

test('a paid student sees how many mock exams are left on their plan', () => {
  const g = mockGate(plan({}))
  assert.deepEqual([g.kind, g.limited, g.blocked, g.detail, g.actionLabel], ['plan', true, false, '', ''])
  assert.equal(g.message, '7 of your 10 mock exams left on your plan.')
  assert.equal(mockGate(plan({ limit: 10, used: 9, remaining: 1 })).message, '1 of your 10 mock exams left on your plan.')
  assert.doesNotMatch(g.message, /free|week|upgrade/i, 'nothing about the free tier')
})

test('a referred student is told the count includes their bonus mocks', () => {
  const g = mockGate(plan({ limit: 13, used: 3, remaining: 10, bonus: 3, includesReferralBonus: true }))
  assert.equal(g.message, '10 of your 13 mock exams left on your plan. This includes 3 mock exams extra for being referred.')
  assert.equal(mockGate(plan({ limit: 26, used: 0, remaining: 26, bonus: 6, includesReferralBonus: true })).message, '26 of your 26 mock exams left on your plan. This includes 6 mock exams extra for being referred.')
  assert.doesNotMatch(mockGate(plan({})).message, /referred/, 'and not when it does not')
})

test('a paid student with no mock exams left is NOT told to upgrade: they are told what happened and that renewing gives a fresh set', () => {
  const g = mockGate(plan({ allowed: false, used: 10, remaining: 0 }))
  assert.deepEqual([g.kind, g.limited, g.blocked], ['plan', true, true])
  assert.equal(g.message, 'You have used all 10 mock exams that came with your plan.')
  assert.equal(g.detail, 'Practice is still unlimited, and your plan runs until 25 Nov 2026. Renewing your plan gives you a fresh set of mock exams.')
  assert.equal(g.actionLabel, 'Renew to start another')
  for (const text of [g.message, g.detail, g.actionLabel]) assert.doesNotMatch(text, /upgrade|free|choose a plan|week/i, text)
  const referred = mockGate(plan({ limit: 13, allowed: false, used: 13, remaining: 0, bonus: 3, includesReferralBonus: true }))
  assert.equal(referred.message, 'You have used all 13 mock exams that came with your plan. This includes 3 mock exams extra for being referred.')
  assert.equal(mockGate(plan({ allowed: false, used: 10, remaining: 0, periodEndsAt: null })).detail, 'Practice is still unlimited. Renewing your plan gives you a fresh set of mock exams.')
})

test('what each plan card lists comes from the server: the practice limit, the quota, and the bonus for a referred student', () => {
  const free = { mocksPerWeek: 2, windowDays: 7, practicePerSubjectPerDay: 10 }
  const mistakes = 'Your Mistakes list, to learn from what you got wrong'
  assert.deepEqual(planFeatures({ id: 'free' }, free), ['10 practice questions a day in each subject, with an explanation for every question', mistakes, '2 mock exams a week'])
  assert.deepEqual(planFeatures({ id: 'monthly', mockQuota: 10, referralBonusMocks: 3 }, free), ['Unlimited practice, with an explanation for every question', mistakes, '10 mock exams with this plan', '+3 extra mock exams if one of our marketers referred you'])
  assert.deepEqual(planFeatures({ id: 'term', mockQuota: 20, referralBonusMocks: 6 }, free), ['Unlimited practice, with an explanation for every question', mistakes, '20 mock exams with this plan', '+6 extra mock exams if one of our marketers referred you'])
  for (const p of [{ id: 'monthly', mockQuota: 10, referralBonusMocks: 3 }, { id: 'term', mockQuota: 20, referralBonusMocks: 6 }]) assert.ok(!planFeatures(p, free).join(' ').match(/unlimited mock/i), 'a paid plan does not promise unlimited mocks')
  assert.doesNotMatch(planFeatures({ id: 'free' }, free).join(' '), /unlimited/i, 'the free plan no longer promises unlimited practice')
  assert.deepEqual(planFeatures({ id: 'monthly' }, free).slice(2), ['Mock exams'], 'an older server that sends no quota')
  assert.match(planFeatures({ id: 'free' }, {})[0], /^10 practice questions a day/, 'an older server that sends no practice limit: the agreed 10')
})

test('the line at the top of the Plans page says what is free and what a plan changes, with the server\'s numbers', () => {
  assert.equal(freeIntro({ mocksPerWeek: 2, practicePerSubjectPerDay: 10 }), 'Start free: 10 practice questions a day in each subject and 2 mock exams a week. A plan gives you unlimited practice and more mock exams.')
  assert.match(freeIntro({ mocksPerWeek: 3, practicePerSubjectPerDay: 15 }), /15 practice questions a day in each subject and 3 mock exams a week/)
  assert.match(freeIntro(undefined), /10 practice questions a day/)
  assert.doesNotMatch(freeIntro({ mocksPerWeek: 2, practicePerSubjectPerDay: 10 }), /Practice is free, always/)
})

const NO_PRACTICE_LIMIT = { limited: false, blocked: false, message: '', detail: '' }
const daily = (over) => ({ kind: 'free', unlimited: false, allowed: true, limit: 10, used: 3, remaining: 7, resetsAt: null, ...over })

test('a free student sees how many free practice questions are left today in a subject', () => {
  assert.deepEqual(practiceGate(undefined), NO_PRACTICE_LIMIT, 'an older server that sends nothing: no limit is shown')
  assert.deepEqual(practiceGate(null), NO_PRACTICE_LIMIT)
  const some = practiceGate(daily({}))
  assert.deepEqual([some.limited, some.blocked, some.detail], [true, false, ''])
  assert.equal(some.message, '7 of your 10 free practice questions left today in this subject.')
  assert.equal(practiceGate(daily({ used: 9, remaining: 1 })).message, '1 of your 10 free practice questions left today in this subject.')
  assert.equal(practiceGate(daily({ limit: 1, used: 0, remaining: 1 })).message, '1 of your 1 free practice question left today in this subject.')
})

test('with none left, the student is told they come back tomorrow, per subject, and that a plan removes the limit', () => {
  const g = practiceGate(daily({ allowed: false, used: 10, remaining: 0, resetsAt: '2026-10-26T23:00:00.000Z' }))
  assert.deepEqual([g.limited, g.blocked], [true, true])
  assert.equal(g.message, 'You have used your 10 free practice questions in this subject for today.')
  assert.equal(g.detail, 'They come back tomorrow, and your other subjects have their own. Choose a plan for unlimited practice.')
})

test('a paid student has no practice limit to show', () => {
  assert.deepEqual(practiceGate({ kind: 'plan', unlimited: true, allowed: true, limit: null, used: null, remaining: null, resetsAt: null }), NO_PRACTICE_LIMIT)
})
