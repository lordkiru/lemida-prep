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
