// Run with:  npm test   (no browser, no server)
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { ApiError, createApi } from '../api.js'
import { ADMIN_KEY, clearAdminSession, isSuperAdmin, loadAdminSession, saveAdminSession } from './adminSession.js'
import { dateText, dateTimeText, monthText, nairaText, planName, statusName, summaryCards } from './format.js'

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// a stand-in for the browser's storage
const fakeStorage = (initial = {}) => {
  const data = { ...initial }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] } }
}
const brokenStorage = () => ({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })

// ---------- the sign-in ----------

test('only a super admin is kept signed in on this page', () => {
  assert.equal(isSuperAdmin({ role: 'super_admin' }), true)
  for (const user of [null, undefined, {}, { role: 'proprietor' }, { role: 'admin' }, { role: 'teacher' }, { role: 'SUPER_ADMIN' }]) assert.equal(isSuperAdmin(user), false, JSON.stringify(user))
  const storage = fakeStorage()
  assert.equal(saveAdminSession({ token: 'tok', user: { role: 'proprietor', email: 'a@b.co' } }, { storage }), false)
  assert.equal(saveAdminSession({ token: '', user: { role: 'super_admin' } }, { storage }), false)
  assert.equal(saveAdminSession({ token: 'tok', user: null }, { storage }), false)
  assert.deepEqual(storage.data, {}, 'nothing was stored for a refused account')
})

test('the sign-in is kept for this tab only, and can be read back and cleared', () => {
  const storage = fakeStorage()
  assert.equal(loadAdminSession({ storage }), null)
  assert.equal(saveAdminSession({ token: 'tok-1', user: { role: 'super_admin', name: 'Admin', email: 'admin@example.com', passwordHash: 'x' } }, { storage }), true)
  assert.deepEqual(JSON.parse(storage.data[ADMIN_KEY]), { token: 'tok-1', name: 'Admin', email: 'admin@example.com' }, 'only the token, name and email are kept')
  assert.deepEqual(loadAdminSession({ storage }), { token: 'tok-1', name: 'Admin', email: 'admin@example.com' })
  clearAdminSession({ storage })
  assert.equal(loadAdminSession({ storage }), null)
})

test('it never uses localStorage, so closing the tab ends the sign-in', () => {
  const code = fs.readFileSync(path.join(src, 'admin', 'adminSession.js'), 'utf8').replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(code, /localStorage/)
  assert.match(code, /sessionStorage/)
})

test('storage that is missing or blocked, or holds rubbish, changes nothing and never throws', () => {
  assert.equal(loadAdminSession({ storage: fakeStorage({ [ADMIN_KEY]: 'not json' }) }), null)
  assert.equal(loadAdminSession({ storage: fakeStorage({ [ADMIN_KEY]: '{"token":42}' }) }), null)
  assert.equal(loadAdminSession({ storage: fakeStorage({ [ADMIN_KEY]: 'null' }) }), null)
  const broken = brokenStorage()
  assert.equal(saveAdminSession({ token: 't', user: { role: 'super_admin' } }, { storage: broken }), false)
  assert.equal(loadAdminSession({ storage: broken }), null)
  assert.doesNotThrow(() => clearAdminSession({ storage: broken }))
  assert.equal(saveAdminSession({ token: 't', user: { role: 'super_admin' } }, { storage: null }), false)
  assert.equal(loadAdminSession({ storage: null }), null)
})

// ---------- the API calls ----------

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const recorder = (answer) => {
  const calls = []
  return { calls, impl: async (url, options) => { calls.push({ url, options }); return answer } }
}

test('signing in is the School Manager login; the overview is a GET that carries the token and nothing else changes', async () => {
  const f = recorder(json(200, { token: 'tok', user: { role: 'super_admin' } }))
  const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl })
  await api.admin.login({ email: 'admin@example.com', password: 'pw', extra: 'ignored' })
  await api.admin.overview('tok-123')
  assert.equal(f.calls[0].url, 'https://api.example.com/auth/login')
  assert.equal(f.calls[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { email: 'admin@example.com', password: 'pw' })
  assert.equal(f.calls[1].url, 'https://api.example.com/superadmin/prep-admin/overview')
  assert.equal(f.calls[1].options.method, undefined, 'a plain GET')
  assert.equal(f.calls[1].options.headers.Authorization, 'Bearer tok-123')
  assert.equal(f.calls[1].options.cache, 'no-store')
})

test('the admin API: a sign-in, the read-only overview, and the marketers (create, list, invite, switch off or on) - nothing that touches money', () => {
  const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: async () => json(200, {}) })
  assert.deepEqual(Object.keys(api.admin).sort(), ['login', 'marketers', 'overview'])
  assert.deepEqual(Object.keys(api.admin.marketers).sort(), ['create', 'list', 'sendInvite', 'setStatus'])
})

test('a refused overview says why: 401 when the sign-in has run out, 403 for an account that is not the super admin', async () => {
  const expired = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(401, { error: 'Invalid or expired token' })).impl })
  await assert.rejects(expired.admin.overview('old'), (err) => err instanceof ApiError && err.status === 401)
  const notAdmin = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(403, { error: 'You do not have permission to access this' })).impl })
  await assert.rejects(notAdmin.admin.overview('tok'), (err) => err.status === 403 && /permission/.test(err.message))
  const wrong = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(401, { error: 'Invalid email or password' })).impl })
  await assert.rejects(wrong.admin.login({ email: 'a@b.co', password: 'bad' }), (err) => err.status === 401 && err.message === 'Invalid email or password')
})

// ---------- the wording ----------

test('plan and status names', () => {
  assert.deepEqual(['free', 'monthly', 'term', 'odd', undefined].map(planName), ['Free', 'Monthly', '3 months', 'odd', ''])
  assert.deepEqual(['active', 'expired', 'none', 'odd', undefined].map(statusName), ['Active', 'Expired', 'None', 'odd', ''])
})

test('dates are in Nigerian time, and a missing or broken date is a dash', () => {
  assert.equal(dateTimeText('2026-10-25T08:26:21.000Z'), '25 Oct 2026, 09:26')
  assert.equal(dateTimeText('2026-10-31T23:30:00.000Z'), '1 Nov 2026, 00:30', 'half past midnight on the 1st in Lagos')
  assert.equal(dateText('2026-10-31T23:30:00.000Z'), '1 Nov 2026')
  for (const bad of [null, undefined, '', 'not a date']) {
    assert.equal(dateTimeText(bad), '-')
    assert.equal(dateText(bad), '-')
  }
})

test('naira keep their kobo only when there are some', () => {
  assert.equal(nairaText(1522.85), '₦1,522.85')
  assert.equal(nairaText(8342.64), '₦8,342.64')
  assert.equal(nairaText(1500), '₦1,500')
  assert.equal(nairaText(0), '₦0')
  assert.equal(nairaText(1234567.5), '₦1,234,567.50')
  for (const bad of [undefined, null, 'x', NaN]) assert.equal(nairaText(bad), '₦0')
})

test('the month is written out', () => {
  assert.equal(monthText('2026-10'), 'October 2026')
  assert.equal(monthText('2027-01'), 'January 2027')
  for (const bad of ['', undefined, '2026-13', 'October', '26-10']) assert.equal(monthText(bad), '', String(bad))
})

test('the three summary cards: free students, paying students, revenue this month', () => {
  const cards = summaryCards({ freeStudents: 12, payingStudents: 3, expiredStudents: 1, revenueThisMonthNaira: 8342.64, paymentsThisMonth: 5, month: '2026-10' })
  assert.deepEqual(cards.map((c) => [c.key, c.label, c.value]), [
    ['free', 'Free-plan students', '12'],
    ['paying', 'Paying students', '3'],
    ['revenue', 'Revenue, October 2026', '₦8,342.64'],
  ])
  assert.match(cards[1].note, /1 more with a plan that has ended/)
  assert.equal(cards[2].note, '5 payments this month')
  assert.equal(summaryCards({ freeStudents: 0, payingStudents: 0, expiredStudents: 0, revenueThisMonthNaira: 0, paymentsThisMonth: 1, month: '2026-10' })[2].note, '1 payment this month')
  assert.equal(summaryCards({ freeStudents: 0, payingStudents: 0, expiredStudents: 0, revenueThisMonthNaira: 0, paymentsThisMonth: 0, month: '2026-10' })[1].note, 'Plan running now')
  assert.deepEqual(summaryCards(null), [])
})

// ---------- where the page lives ----------

test('the admin page is its own route, outside the student app and its menu', () => {
  const app = fs.readFileSync(path.join(src, 'App.jsx'), 'utf8')
  assert.match(app, /<Route path="admin" element={<Admin \/>} \/>/)
  const adminAt = app.indexOf('path="admin"')
  assert.ok(adminAt > -1 && adminAt < app.indexOf('<RequireAuth />'), 'before the signed-in student routes, not inside them')
  const nav = fs.readFileSync(path.join(src, 'navItems.js'), 'utf8')
  assert.doesNotMatch(nav, /admin/i, 'not in the menu')
  const robots = fs.readFileSync(path.join(src, '..', 'public', 'robots.txt'), 'utf8')
  assert.match(robots, /^Disallow: \/admin$/m)
})

test('the admin page only reads: it has no button that changes anything', () => {
  const page = fs.readFileSync(path.join(src, 'pages', 'Admin.jsx'), 'utf8')
  assert.doesNotMatch(page, /api\.admin\.(?!login|overview)/, 'only the sign-in and the overview are called')
  assert.doesNotMatch(page, /api\.(billing|me|auth|mocks|practice)\b/, 'nothing from the student side')
  const buttons = [...page.matchAll(/<button[^>]*>\s*([^<{]*?)\s*(?:<|\{)/g)].map((m) => m[1]).filter(Boolean)
  assert.ok(buttons.length > 0)
  for (const label of buttons) assert.doesNotMatch(label, /refund|delete|edit|remove|cancel|approve|reset|revoke/i, label)
})
