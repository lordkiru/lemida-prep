// Plans and payment: the small rules the Plans page and the Mocks page share. Nothing here talks to the server or the browser, apart from the one
// remembered value below (kept in sessionStorage, and guarded like the referral code in referral.js).
//
// The server decides everything that matters: the prices, what a student has paid for, and how many free mocks are left. This file only
// words it. A payment is NEVER treated as done because the student came back from Paystack: only GET /api/prep/me saying so counts.

// 1500 -> "₦1,500"
export const formatNaira = (amount) => `₦${Number(amount || 0).toLocaleString('en-NG')}`

export function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export const isPaid = (user) => Boolean(user) && user.planStatus === 'active'

// What the student has, in a line: "Free", "Monthly plan · until 25 Nov 2026", "Monthly plan ended on 25 Nov 2026"
export function planLine(user, plans = []) {
  if (!user || user.plan === 'free' || user.planStatus === 'none') return 'Free'
  const name = (plans.find((p) => p.id === user.plan) || {}).name || user.plan
  const label = `${name} plan`
  const date = formatDate(user.planEndsAt)
  if (user.planStatus === 'active') return date ? `${label} · until ${date}` : label
  return date ? `${label} ended on ${date}` : `${label} ended`
}

// "₦900 a month" for the plan that lasts several months, and how much it saves against paying month by month
export function termDeal(plans) {
  const monthly = plans.find((p) => p.id === 'monthly')
  const term = plans.find((p) => p.id === 'term')
  if (!monthly || !term || !term.months) return null
  const perMonth = Math.round(term.priceNaira / term.months)
  const saves = monthly.priceNaira * term.months - term.priceNaira
  return { perMonth, saves: saves > 0 ? saves : 0 }
}

// ---- coming back from Paystack ----
// Paystack sends the student back to /plans?reference=...&trxref=... whether they paid, cancelled or the card failed, so the link itself proves nothing.
export function returnedFromPaystack(search) {
  try {
    const params = new URLSearchParams(search || '')
    const reference = params.get('reference') || params.get('trxref') || ''
    return /^[A-Za-z0-9_.=-]{6,100}$/.test(reference) ? reference : ''
  } catch {
    return ''
  }
}

// Before the student leaves for Paystack, we note how their plan looked. On return, "paid" means it has changed since then (a student who renews
// while still on a plan is already 'active', so 'active' alone would be a false alarm; and the webhook may have landed before this page reloaded).
export const BEFORE_KEY = 'prep-plan-before'
const defaultStorage = () => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function rememberPlanBefore(user, { storage = defaultStorage(), now = Date.now() } = {}) {
  if (!storage || !user) return false
  try {
    storage.setItem(BEFORE_KEY, JSON.stringify({ planStatus: user.planStatus || 'none', planEndsAt: user.planEndsAt || null, savedAt: now }))
    return true
  } catch {
    return false
  }
}

export function loadPlanBefore({ storage = defaultStorage() } = {}) {
  if (!storage) return null
  try {
    const value = JSON.parse(storage.getItem(BEFORE_KEY) || 'null')
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

export function clearPlanBefore({ storage = defaultStorage() } = {}) {
  try {
    if (storage) storage.removeItem(BEFORE_KEY)
  } catch {
    // nothing to do
  }
}

// Has the payment shown up on the student's plan? `before` is what rememberPlanBefore saved (or null: then any active plan counts).
export function paymentConfirmed(before, user) {
  if (!isPaid(user)) return false
  if (!before || before.planStatus !== 'active') return true
  const was = before.planEndsAt ? new Date(before.planEndsAt).getTime() : 0
  const now = user.planEndsAt ? new Date(user.planEndsAt).getTime() : 0
  return now > was
}

// How long the page waits for the webhook, and how often it asks
export const POLL_EVERY_MS = 3000
export const POLL_FOR_MS = 60000

// ---- how many mock exams a student may still start ----
// 'allowance' is what GET /api/prep/mocks returns. Two kinds:
//   kind 'free': { limit, used, remaining, allowed, resetsAt }   the free tier's mocks in any week
//   kind 'plan': { limit, used, remaining, allowed, bonus, includesReferralBonus, periodEndsAt }   the mocks that came with the plan they paid for
// Returns what the Mocks page needs: { kind, limited, blocked, message, detail, actionLabel }.
const mocksText = (n) => n + ' mock exam' + (n === 1 ? '' : 's')

export function mockGate(allowance) {
  if (!allowance || allowance.unlimited) return { kind: null, limited: false, blocked: false, message: '', detail: '', actionLabel: '' }

  if (allowance.kind === 'plan') {
    const bonusNote = allowance.includesReferralBonus && allowance.bonus > 0 ? ' This includes ' + mocksText(allowance.bonus) + ' extra for being referred.' : ''
    if (allowance.allowed) {
      return { kind: 'plan', limited: true, blocked: false, message: allowance.remaining + ' of your ' + mocksText(allowance.limit) + ' left on your plan.' + bonusNote, detail: '', actionLabel: '' }
    }
    const until = allowance.periodEndsAt ? formatDate(allowance.periodEndsAt) : ''
    return {
      kind: 'plan',
      limited: true,
      blocked: true,
      message: 'You have used all ' + mocksText(allowance.limit) + ' that came with your plan.' + bonusNote,
      detail: 'Practice is still unlimited' + (until ? ', and your plan runs until ' + until : '') + '. Renewing your plan gives you a fresh set of mock exams.',
      actionLabel: 'Renew to start another',
    }
  }

  if (allowance.allowed) {
    const left = allowance.remaining
    return { kind: 'free', limited: true, blocked: false, message: left + ' free mock exam' + (left === 1 ? '' : 's') + ' left this week.', detail: '', actionLabel: '' }
  }
  const when = allowance.resetsAt ? formatDate(allowance.resetsAt) : ''
  return {
    kind: 'free',
    limited: true,
    blocked: true,
    message: 'You have used your ' + allowance.limit + ' free mock exams for this week.' + (when ? ' Your next free one opens on ' + when + '.' : ''),
    detail: 'Choose a plan for more mock exams. Practice stays free.',
    actionLabel: 'Upgrade to start another',
  }
}

// ---- how many practice questions a free student may still answer today, in one subject ----
// 'daily' is what the practice routes return: { kind, unlimited, allowed, limit, used, remaining, resetsAt }. A paid plan is unlimited.
// Returns { limited, blocked, message, detail }.
const questionsText = (n) => n + ' free practice question' + (n === 1 ? '' : 's')

export function practiceGate(daily) {
  if (!daily || daily.unlimited) return { limited: false, blocked: false, message: '', detail: '' }
  if (daily.allowed) {
    return { limited: true, blocked: false, message: daily.remaining + ' of your ' + questionsText(daily.limit) + ' left today in this subject.', detail: '' }
  }
  return {
    limited: true,
    blocked: true,
    message: 'You have used your ' + questionsText(daily.limit) + ' in this subject for today.',
    detail: 'They come back tomorrow, and your other subjects have their own. Choose a plan for unlimited practice.',
  }
}

// The line at the top of the Plans page: what you get for free, then what a plan changes. The numbers come from the server.
export function freeIntro(free) {
  const practice = free && free.practicePerSubjectPerDay ? free.practicePerSubjectPerDay : 10
  const mocks = free && free.mocksPerWeek ? free.mocksPerWeek : 2
  return 'Start free: ' + practice + ' practice questions a day in each subject and ' + mocks + ' mock exams a week. A plan gives you unlimited practice and more mock exams.'
}

// What each plan card lists. The numbers come from the server (GET /api/prep/billing/plans), so changing them there changes this page.
export function planFeatures(plan, free) {
  const explained = 'with an explanation for every question'
  const mistakes = 'Your Mistakes list, to learn from what you got wrong'
  if (!plan || plan.id === 'free') {
    const practice = free && free.practicePerSubjectPerDay ? free.practicePerSubjectPerDay : 10
    return [practice + ' practice questions a day in each subject, ' + explained, mistakes, (free && free.mocksPerWeek ? free.mocksPerWeek : 2) + ' mock exams a week']
  }
  const mocks = plan.mockQuota ? mocksText(plan.mockQuota) + ' with this plan' : 'Mock exams'
  const bonus = plan.mockQuota && plan.referralBonusMocks ? ['+' + plan.referralBonusMocks + ' extra mock exams if one of our marketers referred you'] : []
  return ['Unlimited practice, ' + explained, mistakes, mocks, ...bonus]
}
