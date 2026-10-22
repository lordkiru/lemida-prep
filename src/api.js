// Talks to the Lemida backend (lemida-server). The address comes from VITE_API_URL (see .env.example); there is no default, so
// a build that forgot to set it says so plainly instead of calling the wrong server.
//
// Questions and answers must never be stored on the device by accident, so every request asks the browser for `no-store`
// and the service worker has no rule that touches API calls (see pwa.config.js). The API answers with Cache-Control: no-store too.
//
// Signing in is a cookie the server sets (httpOnly, so no script here can read it). `credentials: 'include'` is what makes the
// browser send it to the API, which lives on another subdomain.
export class ApiError extends Error {
  constructor(message, status = 0, code = '') {
    super(message)
    this.status = status
    this.code = code
  }
}

export const normaliseBaseUrl = (value) => (typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '')

// `baseUrl` and `fetchImpl` are parameters so this can be tested without a browser or a server.
export function createApi({ baseUrl, fetchImpl } = {}) {
  const base = normaliseBaseUrl(baseUrl)
  const doFetch = fetchImpl || ((...args) => fetch(...args))

  // An account has ONE active sign-in: signing in on another device (or changing the password) ends this one, and the server then
  // answers 401 with the code SESSION_ENDED. Whoever is listening (AuthProvider) hears about it from any request, not only the first.
  const endedListeners = new Set()
  const onSessionEnded = (fn) => {
    endedListeners.add(fn)
    return () => endedListeners.delete(fn)
  }

  async function request(path, options = {}) {
    if (!base) throw new ApiError('VITE_API_URL is not set. Copy .env.example to .env and set it, then restart.')

    let res
    try {
      res = await doFetch(`${base}${path}`, {
        ...options,
        cache: 'no-store',
        credentials: 'include',
        headers: { Accept: 'application/json', ...options.headers },
      })
    } catch {
      throw new ApiError('Cannot reach the server. Check your internet connection and try again.')
    }

    let data = null
    try {
      data = await res.json()
    } catch {
      // an empty or non-JSON body
    }
    if (res.status === 401 && data && data.code === 'SESSION_ENDED') endedListeners.forEach((fn) => fn(data.error))
    if (!res.ok) throw new ApiError((data && data.error) || `Something went wrong (${res.status})`, res.status, (data && data.code) || '')
    return data
  }

  // a request with a JSON body
  const send = (method, path, body) =>
    request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })

  // GET /api/prep/health: resolves true when the Prep API says { ok: true }
  const health = async () => {
    const data = await request('/api/prep/health')
    return Boolean(data && data.ok === true)
  }

  // Sign-up, sign-in and the student's own account. Each returns the server's answer; failures throw an ApiError whose
  // `message` is plain English and whose `code` (BAD_CREDENTIALS, EMAIL_NOT_VERIFIED, WEAK_PASSWORD, BAD_TOKEN...) is for the code.
  const auth = {
    signup: ({ name, email, password }) => send('POST', '/api/prep/auth/signup', { name, email, password }),
    verifyEmail: (token) => send('POST', '/api/prep/auth/verify-email', { token }),
    resendVerification: (email) => send('POST', '/api/prep/auth/resend-verification', { email }),
    login: ({ email, password }) => send('POST', '/api/prep/auth/login', { email, password }),
    logout: () => send('POST', '/api/prep/auth/logout', {}),
    forgotPassword: (email) => send('POST', '/api/prep/auth/forgot-password', { email }),
    resetPassword: ({ token, password }) => send('POST', '/api/prep/auth/reset-password', { token, password }),
  }
  const me = {
    get: () => request('/api/prep/me'),
    saveProfile: ({ exam, classLevel, examYear, subjects }) => send('PUT', '/api/prep/me/profile', { exam, classLevel, examYear, subjects }),
    setupOptions: () => request('/api/prep/setup-options'),
  }

  // Practice. A question arrives WITHOUT its answer; the answer and explanation come back only after answering it (the server checks the answer).
  const enc = encodeURIComponent
  const practice = {
    subjects: () => request('/api/prep/practice/subjects'),
    start: ({ subject, restart }) => send('POST', '/api/prep/practice/sessions', restart ? { subject, restart: true } : { subject }),
    get: (sessionId) => request(`/api/prep/practice/sessions/${enc(sessionId)}`),
    answer: (sessionId, { questionId, chosenIndex }) => send('POST', `/api/prep/practice/sessions/${enc(sessionId)}/answer`, { questionId, chosenIndex }),
    finish: (sessionId) => send('POST', `/api/prep/practice/sessions/${enc(sessionId)}/finish`, {}),
    summary: (sessionId) => request(`/api/prep/practice/sessions/${enc(sessionId)}/summary`),
  }

  return { baseUrl: base, request, health, auth, me, practice, onSessionEnded }
}

export const api = createApi({ baseUrl: import.meta.env?.VITE_API_URL })
