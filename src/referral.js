// Referral codes. A marketer shares a link like https://prep.lemidaitsolutions.com/?ref=FEST2026; opening it remembers the code on this device for 30 days,
// and the sign-up form sends it along (the sign-up page also has a box to type a code). The server decides whether a code is real, and says nothing
// about it either way, so nothing here ever tells the student a code was good or bad.
//
// The code is kept in the browser's own storage (not a cookie), under one key, together with the day it was saved.
export const REFERRAL_KEY = 'prep-ref'
export const REFERRAL_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

// capitals and no spaces, or '' when it cannot be a code (letters and digits, 3 to 20 of them: the same rule the server uses)
export const normalizeReferralCode = (value) => (typeof value === 'string' && /^[A-Za-z0-9]{3,20}$/.test(value.trim()) ? value.trim().toUpperCase() : '')

// the code in a link's query string (?ref=FEST2026), or ''
export function refFromSearch(search) {
  try {
    return normalizeReferralCode(new URLSearchParams(search || '').get('ref') || '')
  } catch {
    return ''
  }
}

const defaultStorage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// Storage can be missing or blocked (private windows, strict settings): every use is guarded, and the app works the same without it.
export function saveReferral(code, { storage = defaultStorage(), now = Date.now() } = {}) {
  const clean = normalizeReferralCode(code)
  if (!clean || !storage) return false
  try {
    storage.setItem(REFERRAL_KEY, JSON.stringify({ code: clean, savedAt: now }))
    return true
  } catch {
    return false
  }
}

// the remembered code, or '' if there is none, it is older than 30 days, or what is stored makes no sense (it is removed then)
export function loadReferral({ storage = defaultStorage(), now = Date.now() } = {}) {
  if (!storage) return ''
  try {
    const raw = storage.getItem(REFERRAL_KEY)
    if (!raw) return ''
    const saved = JSON.parse(raw)
    const code = normalizeReferralCode(saved && saved.code)
    const fresh = saved && Number.isFinite(saved.savedAt) && now - saved.savedAt >= 0 && now - saved.savedAt <= REFERRAL_DAYS * DAY
    if (code && fresh) return code
    storage.removeItem(REFERRAL_KEY)
  } catch {
    // unreadable (not valid JSON, or storage refused): treat as none, and clear it if we can
    try {
      storage.removeItem(REFERRAL_KEY)
    } catch {
      // nothing more to do
    }
  }
  return ''
}

export function clearReferral({ storage = defaultStorage() } = {}) {
  try {
    if (storage) storage.removeItem(REFERRAL_KEY)
  } catch {
    // nothing to do
  }
}

// Run when the app opens: a link with ?ref= remembers its code (a newer link replaces an older one). Returns the code it saved, or ''.
export function captureReferralFromUrl({ search = typeof window !== 'undefined' ? window.location.search : '', storage, now } = {}) {
  const code = refFromSearch(search)
  if (code) saveReferral(code, { storage, now })
  return code ? code : ''
}

// What the sign-up form sends. `typed` is the box, `remembered` the code from a link. Nothing typed sends nothing. The code is "from a link"
// ("cookie" is the name the server uses for that) only if it is exactly the remembered one; anything the student typed or changed is "manual_entry".
export function referralForSignup({ typed, remembered }) {
  const code = normalizeReferralCode(typed)
  if (!code) return {}
  return { referralCode: code, referralSource: code === normalizeReferralCode(remembered) ? 'cookie' : 'manual_entry' }
}
