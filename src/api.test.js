// Run with:  npm test   (no browser, no server)
import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, createApi, normaliseBaseUrl } from './api.js'

// a pretend fetch that records what it was asked and answers as told
function fakeFetch(answer) {
  const calls = []
  const impl = async (url, options) => {
    calls.push({ url, options })
    if (answer instanceof Error) throw answer
    return answer
  }
  return { impl, calls }
}
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

test('the base address is trimmed and loses trailing slashes', () => {
  assert.equal(normaliseBaseUrl('https://api.example.com/'), 'https://api.example.com')
  assert.equal(normaliseBaseUrl('  https://api.example.com//  '), 'https://api.example.com')
  assert.equal(normaliseBaseUrl('http://localhost:5000'), 'http://localhost:5000')
  assert.equal(normaliseBaseUrl(undefined), '')
  assert.equal(normaliseBaseUrl(42), '')
})

test('health calls <VITE_API_URL>/api/prep/health and says true for { ok: true }', async () => {
  const f = fakeFetch(json(200, { ok: true }))
  const api = createApi({ baseUrl: 'https://api.example.com/', fetchImpl: f.impl })
  assert.equal(await api.health(), true)
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].url, 'https://api.example.com/api/prep/health')
})

test('every request asks for no-store, so questions and answers are never kept by the browser', async () => {
  const f = fakeFetch(json(200, { ok: true }))
  await createApi({ baseUrl: 'http://localhost:5000', fetchImpl: f.impl }).request('/api/prep/anything')
  assert.equal(f.calls[0].options.cache, 'no-store')
  assert.equal(f.calls[0].options.headers.Accept, 'application/json')
})

test('a server that answers something other than { ok: true } is not "connected"', async () => {
  const api = createApi({ baseUrl: 'http://x', fetchImpl: fakeFetch(json(200, { ok: false })).impl })
  assert.equal(await api.health(), false)
  const api2 = createApi({ baseUrl: 'http://x', fetchImpl: fakeFetch(json(200, {})).impl })
  assert.equal(await api2.health(), false)
})

test('a missing VITE_API_URL says so plainly and makes no request', async () => {
  const f = fakeFetch(json(200, { ok: true }))
  const api = createApi({ baseUrl: undefined, fetchImpl: f.impl })
  await assert.rejects(() => api.health(), (err) => err instanceof ApiError && /VITE_API_URL is not set/.test(err.message))
  assert.equal(f.calls.length, 0)
})

test('an unreachable server is a clear error, not a crash', async () => {
  const api = createApi({ baseUrl: 'http://x', fetchImpl: fakeFetch(new TypeError('Failed to fetch')).impl })
  await assert.rejects(() => api.health(), (err) => err instanceof ApiError && /Cannot reach the server/.test(err.message))
})

test('an error answer carries the server\'s message and status; a non-JSON error still gets a message', async () => {
  const api = createApi({ baseUrl: 'http://x', fetchImpl: fakeFetch(json(404, { error: 'Not found' })).impl })
  await assert.rejects(() => api.health(), (err) => err.status === 404 && err.message === 'Not found')
  const bad = { ok: false, status: 502, json: async () => { throw new Error('not json') } }
  const api2 = createApi({ baseUrl: 'http://x', fetchImpl: fakeFetch(bad).impl })
  await assert.rejects(() => api2.health(), (err) => err.status === 502 && /502/.test(err.message))
})

// ── sign-in: cookie session, JSON bodies, error codes ──
test('every request sends the sign-in cookie to the API (credentials: include)', async () => {
  const f = fakeFetch(json(200, { ok: true }))
  await createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl }).request('/api/prep/me')
  assert.equal(f.calls[0].options.credentials, 'include')
})

test('auth calls are POSTs with a JSON body and the right path; only the named fields are sent', async () => {
  const f = fakeFetch(json(202, { message: 'ok' }))
  const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl })
  await api.auth.signup({ name: 'Ada', email: 'a@b.co', password: 'pw', extra: 'ignored' })
  await api.auth.login({ email: 'a@b.co', password: 'pw' })
  await api.auth.verifyEmail('tok')
  await api.auth.resendVerification('a@b.co')
  await api.auth.forgotPassword('a@b.co')
  await api.auth.resetPassword({ token: 't', password: 'p' })
  await api.auth.logout()
  assert.deepEqual(
    f.calls.map((c) => c.url.replace('https://api.example.com/api/prep', '')),
    ['/auth/signup', '/auth/login', '/auth/verify-email', '/auth/resend-verification', '/auth/forgot-password', '/auth/reset-password', '/auth/logout'],
  )
  for (const c of f.calls) {
    assert.equal(c.options.method, 'POST')
    assert.equal(c.options.headers['Content-Type'], 'application/json')
  }
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { name: 'Ada', email: 'a@b.co', password: 'pw' })
  assert.deepEqual(JSON.parse(f.calls[2].options.body), { token: 'tok' })
})

test('the profile is saved with PUT, only the four setup fields, and the options come from GET', async () => {
  const f = fakeFetch(json(200, {}))
  const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl })
  await api.me.saveProfile({ exam: 'WAEC', classLevel: 'SS3', examYear: 2027, subjects: ['Biology'], plan: 'premium' })
  await api.me.setupOptions()
  await api.me.get()
  assert.equal(f.calls[0].options.method, 'PUT')
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { exam: 'WAEC', classLevel: 'SS3', examYear: 2027, subjects: ['Biology'] })
  assert.equal(f.calls[1].url, 'https://api.example.com/api/prep/setup-options')
  assert.equal(f.calls[2].url, 'https://api.example.com/api/prep/me')
})

test('a refused request throws an ApiError with the plain-English message, status and code from the server', async () => {
  const f = fakeFetch(json(403, { error: 'Confirm your email first.', code: 'EMAIL_NOT_VERIFIED' }))
  const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl })
  await assert.rejects(api.auth.login({ email: 'a@b.co', password: 'pw' }), (err) => err instanceof ApiError && err.message === 'Confirm your email first.' && err.status === 403 && err.code === 'EMAIL_NOT_VERIFIED')
  const g = fakeFetch(json(500, null))
  await assert.rejects(createApi({ baseUrl: 'https://x.test', fetchImpl: g.impl }).me.get(), (err) => err.status === 500 && err.code === '' && /500/.test(err.message))
})
