// Run with:  npm test   (no browser, no server)
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { ApiError, createApi } from '../api.js'
import { commissionStatusText, earnNote, shareMessage, stateText, walletCards } from './format.js'

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => fs.readFileSync(path.join(src, ...parts), 'utf8')

const RULES = { commissionNaira: { monthly: 300, term: 500 }, holdDays: 5, minWithdrawalNaira: 2000 }

// ---------- the wording ----------

test('a referred student is shown to their marketer as a state only', () => {
  assert.equal(stateText('free'), 'Signed up')
  assert.equal(stateText('paying'), 'Paying')
  assert.equal(stateText('plan ended'), 'Plan ended')
  assert.equal(stateText(undefined), '')
})

test('a commission is "Held until" its date, or "Available"', () => {
  assert.equal(commissionStatusText({ status: 'held', availableFrom: '2026-10-30T12:00:00.000Z' }), 'Held until 30 Oct 2026')
  assert.equal(commissionStatusText({ status: 'available', availableFrom: '2026-10-20T12:00:00.000Z' }), 'Available')
  assert.equal(commissionStatusText(undefined), 'Available')
})

test('the wallet is three cards: available now, held, and earned in total', () => {
  const cards = walletCards({ availableNaira: 300, heldNaira: 1400, earnedNaira: 1700, withdrawnNaira: 0 }, RULES)
  assert.deepEqual(cards.map((c) => [c.key, c.label, c.value]), [['available', 'Available now', '₦300'], ['held', 'Held', '₦1,400'], ['earned', 'Earned in total', '₦1,700']])
  assert.equal(cards[0].note, 'Past its 5-day hold')
  assert.equal(cards[1].note, 'Becomes available 5 days after each payment')
  assert.equal(cards[2].note, 'Nothing withdrawn yet')
  assert.equal(walletCards({ availableNaira: 0, heldNaira: 0, earnedNaira: 800, withdrawnNaira: 500 }, RULES)[2].note, '₦500 already withdrawn')
  assert.deepEqual(walletCards(undefined, RULES), [])
  assert.equal(walletCards({ availableNaira: 1.5, heldNaira: 0, earnedNaira: 1.5, withdrawnNaira: 0 }, undefined)[0].value, '₦1.50', 'kobo are kept')
})

test('the earning rules are explained with the server\'s numbers, and withdrawals are not promised as open', () => {
  const note = earnNote(RULES)
  assert.match(note, /₦300 each time a student you referred pays for the Monthly plan/)
  assert.match(note, /₦500 each time they pay for the 3-month plan, including every renewal/)
  assert.match(note, /held for 5 days/)
  assert.match(note, /Withdrawals are not open yet; when they are, the minimum will be ₦2,000/)
  assert.match(earnNote({ ...RULES, commissionNaira: { monthly: 400, term: 700 }, holdDays: 7 }), /₦400.*₦700.*held for 7 days/)
  assert.equal(earnNote(undefined), '')
})

test('the message a marketer shares carries the link', () => {
  assert.equal(shareMessage('https://prep.lemidaitsolutions.com/?ref=FEST2026'), 'Practise for WAEC and NECO on Lemida Exam Prep: https://prep.lemidaitsolutions.com/?ref=FEST2026')
})

// ---------- the API calls ----------

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const recorder = (answer) => {
  const calls = []
  return { calls, impl: async (url, options) => { calls.push({ url, options }); return answer } }
}

test('the marketer calls: sign-in, sign-out, forgotten and chosen passwords are POSTs; the page itself is two GETs', async () => {
  const f = recorder(json(200, {}))
  const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl })
  await api.marketer.login({ email: 'm@example.com', password: 'pw', extra: 'ignored' })
  await api.marketer.logout()
  await api.marketer.forgotPassword('m@example.com')
  await api.marketer.setPassword({ token: 'tok', password: 'pw2' })
  await api.marketer.me()
  await api.marketer.dashboard()
  const calls = f.calls.map((c) => `${c.options.method || 'GET'} ${c.url.replace('https://api.example.com/api/prep', '')}`)
  assert.deepEqual(calls, ['POST /marketer/auth/login', 'POST /marketer/auth/logout', 'POST /marketer/auth/forgot-password', 'POST /marketer/auth/set-password', 'GET /marketer/me', 'GET /marketer/dashboard'])
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { email: 'm@example.com', password: 'pw' })
  assert.deepEqual(JSON.parse(f.calls[3].options.body), { token: 'tok', password: 'pw2' })
  for (const c of f.calls) assert.equal(c.options.credentials, 'include', 'the sign-in is a cookie')
  assert.deepEqual(Object.keys(api.marketer).sort(), ['dashboard', 'forgotPassword', 'login', 'logout', 'me', 'setPassword'], 'nothing that changes a marketer\'s money or details')
})

test('a marketer whose session ended elsewhere does NOT sign a student out: it has its own code', async () => {
  const heard = []
  const api = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(401, { error: 'You were signed out because this account was signed in on another device.', code: 'MARKETER_SESSION_ENDED' })).impl })
  api.onSessionEnded((m) => heard.push(m))
  await assert.rejects(api.marketer.dashboard(), (err) => err instanceof ApiError && err.status === 401 && err.code === 'MARKETER_SESSION_ENDED')
  assert.deepEqual(heard, [], 'the students\' "signed in elsewhere" handler was not triggered')
})

test('a refused sign-in or link says why', async () => {
  const bad = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(401, { error: 'Incorrect email or password.', code: 'BAD_CREDENTIALS' })).impl })
  await assert.rejects(bad.marketer.login({ email: 'a@b.co', password: 'x' }), (err) => err.status === 401 && err.code === 'BAD_CREDENTIALS')
  const expired = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(400, { error: 'This link is invalid or has expired.', code: 'BAD_TOKEN' })).impl })
  await assert.rejects(expired.marketer.setPassword({ token: 'a', password: 'b' }), (err) => err.code === 'BAD_TOKEN')
  const suspended = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(403, { error: 'This marketer account is not active.', code: 'ACCOUNT_SUSPENDED' })).impl })
  await assert.rejects(suspended.marketer.dashboard(), (err) => err.status === 403 && err.code === 'ACCOUNT_SUSPENDED')
})

// ---------- where it lives, and what it shows ----------

test('the marketer pages are their own routes, outside the student app and its menu, and kept out of search engines', () => {
  const app = read('App.jsx')
  for (const p of ['marketer', 'marketer/set-password', 'marketer/forgot']) assert.match(app, new RegExp(`<Route path="${p}" element=`), p)
  const marketerAt = app.indexOf('path="marketer"')
  assert.ok(marketerAt > -1 && marketerAt < app.indexOf('<RequireAuth />'), 'before the signed-in student routes, not inside them')
  assert.doesNotMatch(read('navItems.js'), /marketer/i, 'not in the menu')
  assert.match(fs.readFileSync(path.join(src, '..', 'public', 'robots.txt'), 'utf8'), /^Disallow: \/marketer$/m)
})

test('the marketer page shows no student: no name or email is read from a sign-up, and the only buttons are refresh, sign out, copy and share', () => {
  const page = read('pages', 'marketer', 'Marketer.jsx')
  assert.doesNotMatch(page, /\b(s|signup|student)\.(email|name|id)\b/, 'a sign-up row is a date and a state')
  assert.doesNotMatch(page, /api\.(me|auth|billing|admin|mocks|practice)\b/, 'nothing from the student side')
  assert.doesNotMatch(page, /api\.marketer\.(?!login|logout|me|dashboard)/)
  const labels = [...page.matchAll(/<button[^>]*>\s*([^<{]*?)\s*(?:<|\{)/g)].map((m) => m[1]).filter(Boolean)
  for (const label of labels) assert.doesNotMatch(label, /withdraw|delete|edit|remove|refund|cancel|approve|reset/i, label)
})

test('a password link is taken out of the address bar as soon as it has been read', () => {
  const page = read('pages', 'marketer', 'Password.jsx')
  assert.match(page, /navigate\(location\.pathname, \{ replace: true \}\)/)
  assert.match(page, /params\.get\('token'\)/)
})
