// Small checks the forms run BEFORE asking the server, so a typo is caught instantly. The server repeats and enforces every rule
// (server/modules/prep/security/passwords.js and validators.js): nothing here is a security measure, only a convenience.
export const MIN_PASSWORD = 8
export const MAX_PASSWORD_BYTES = 72

export const cleanEmail = (value) => String(value ?? '').trim().toLowerCase()

export const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value)) && cleanEmail(value).length <= 254

// The problem with a new password in plain English, or '' when it passes. (The server also refuses very common passwords.)
export function passwordProblem(password, { email = '', name = '' } = {}) {
  if (!password) return 'Enter a password.'
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return `Use at most ${MAX_PASSWORD_BYTES} characters.`
  const lower = password.toLowerCase()
  const local = cleanEmail(email).split('@')[0]
  if (local.length >= 4 && lower.includes(local)) return 'Your password should not contain your email address.'
  if (name.trim().length >= 4 && lower === name.trim().toLowerCase()) return 'Your password should not be your name.'
  return ''
}

// Where a student belongs right now: the sign-in screen, the first-time setup, or the app.
//   user: what GET /api/prep/me returned, or null when signed out.
export function landingFor(user) {
  if (!user) return '/login'
  return user.profileComplete ? '/' : '/setup'
}

// After signing in we go back to the page the student was trying to reach, but only a page inside this app.
// (A "next" like //evil.com or https://evil.com must never be followed.)
export function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return ''
  if (/^\/(login|signup|forgot|reset|verify)(\/|\?|$)/.test(value)) return ''
  return value
}

// "WAEC" -> "WAEC", "BOTH" -> "WAEC and NECO"
export const examLabel = (exam) => (exam === 'BOTH' ? 'WAEC and NECO' : exam || '')
