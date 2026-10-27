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
    // referralCode / referralSource ('cookie' or 'manual_entry') are sent only when the student has one; the answer never says whether a code was real
    signup: ({ name, email, password, referralCode, referralSource }) =>
      send('POST', '/api/prep/auth/signup', { name, email, password, ...(referralCode ? { referralCode, referralSource } : {}) }),
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
    // deletes the student's account and everything attached to it; the password is asked for again
    deleteAccount: (password) => send('DELETE', '/api/prep/me', { password }),
  }

  // Practice. A question arrives WITHOUT its answer; the answer and explanation come back only after answering it (the server checks the answer).
  const enc = encodeURIComponent
  const practice = {
    subjects: () => request('/api/prep/practice/subjects'),
    // mode 'mistakes' starts a round made only of the questions the student got wrong; restart throws away the open round first
    start: ({ subject, restart, mode }) => send('POST', '/api/prep/practice/sessions', { subject, ...(mode === 'mistakes' ? { mode } : {}), ...(restart ? { restart: true } : {}) }),
    // the questions the student got wrong last time, with the right answer and explanation (they have already answered each one)
    mistakes: (subject) => request(`/api/prep/practice/mistakes${subject ? `?subject=${enc(subject)}` : ''}`),
    // tell us a question has a problem (only a question the student has answered); the reply says nothing about the question
    reportQuestion: (questionId, { reason, comment }) => send('POST', `/api/prep/practice/questions/${enc(questionId)}/report`, comment ? { reason, comment } : { reason }),
    get: (sessionId) => request(`/api/prep/practice/sessions/${enc(sessionId)}`),
    answer: (sessionId, { questionId, chosenIndex }) => send('POST', `/api/prep/practice/sessions/${enc(sessionId)}/answer`, { questionId, chosenIndex }),
    finish: (sessionId) => send('POST', `/api/prep/practice/sessions/${enc(sessionId)}/finish`, {}),
    summary: (sessionId) => request(`/api/prep/practice/sessions/${enc(sessionId)}/summary`),
  }

  // Mock exams: a timed paper in one subject. The server owns the clock and keeps the saved choices; questions arrive without answers, and the
  // right answers come only with the result, after the paper is handed in or time runs out.
  const mocks = {
    list: () => request('/api/prep/mocks'),
    // questions and minutes are the student's own choices; left out, a mock is the biggest paper at the standard pace
    start: ({ subject, questions, minutes }) => send('POST', '/api/prep/mocks', { subject, ...(questions ? { questions } : {}), ...(minutes ? { minutes } : {}) }),
    get: (mockId) => request(`/api/prep/mocks/${enc(mockId)}`),
    // chosenIndex null takes the answer back
    saveAnswer: (mockId, { questionId, chosenIndex }) => send('PUT', `/api/prep/mocks/${enc(mockId)}/answer`, { questionId, chosenIndex }),
    submit: (mockId) => send('POST', `/api/prep/mocks/${enc(mockId)}/submit`, {}),
    result: (mockId) => request(`/api/prep/mocks/${enc(mockId)}/result`),
  }

  // Plans and payment. initialize only asks for a Paystack payment page ({ authorizationUrl }); the plan switches on later, when Paystack tells the
  // server the money arrived, and /api/prep/me then shows it.
  const billing = {
    plans: () => request('/api/prep/billing/plans'),
    initialize: (plan) => send('POST', '/api/prep/billing/initialize', { plan }),
  }

  // The admin page (/admin): the super admin signs in with the School Manager account (POST /auth/login) and reads the Prep overview with that token.
  // Read-only: there is nothing here that changes anything.
  const admin = {
    login: ({ email, password }) => send('POST', '/auth/login', { email, password }),
    overview: (token) => request('/superadmin/prep-admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
  }

  // The marketer's own page (/marketer). Marketers have their own accounts and their own cookie, apart from the students'. Read-only apart from signing in,
  // out, signing up, and choosing a password.
  const marketer = {
    login: ({ email, password }) => send('POST', '/api/prep/marketer/auth/login', { email, password }),
    logout: () => send('POST', '/api/prep/marketer/auth/logout', {}),
    signUp: ({ name, email, phone }) => send('POST', '/api/prep/marketer/auth/signup', { name, email, phone }),
    rules: () => request('/api/prep/marketer/rules'),
    forgotPassword: (email) => send('POST', '/api/prep/marketer/auth/forgot-password', { email }),
    setPassword: ({ token, password }) => send('POST', '/api/prep/marketer/auth/set-password', { token, password }),
    me: () => request('/api/prep/marketer/me'),
    dashboard: () => request('/api/prep/marketer/dashboard'),
  }

  return { baseUrl: base, request, health, auth, me, practice, mocks, billing, admin, marketer, onSessionEnded }
}

export const api = createApi({ baseUrl: import.meta.env?.VITE_API_URL })
