// The admin page's sign-in. The Prep admin page is for the super admin only: it signs in with the same account and the same login as School Manager
// (POST /auth/login), and the server decides what that account may see (GET /superadmin/prep-admin/overview refuses anyone who is not a super admin).
//
// The token is kept for this browser TAB only (sessionStorage), never in localStorage: closing the tab ends it. It is separate from the students' cookie
// sign-in, so a student can never reach the admin page and the admin is never "a student".
export const ADMIN_KEY = 'prep-admin-session'

const defaultStorage = () => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

// only a super admin may stay signed in here (the server says so again on every request)
export const isSuperAdmin = (user) => Boolean(user) && user.role === 'super_admin'

export function saveAdminSession({ token, user }, { storage = defaultStorage() } = {}) {
  if (!storage || typeof token !== 'string' || !token || !isSuperAdmin(user)) return false
  try {
    storage.setItem(ADMIN_KEY, JSON.stringify({ token, name: user.name || '', email: user.email || '' }))
    return true
  } catch {
    return false
  }
}

// { token, name, email } or null
export function loadAdminSession({ storage = defaultStorage() } = {}) {
  if (!storage) return null
  try {
    const value = JSON.parse(storage.getItem(ADMIN_KEY) || 'null')
    return value && typeof value.token === 'string' && value.token ? value : null
  } catch {
    return null
  }
}

export function clearAdminSession({ storage = defaultStorage() } = {}) {
  try {
    if (storage) storage.removeItem(ADMIN_KEY)
  } catch {
    // nothing to clear
  }
}
