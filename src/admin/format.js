// Wording for the admin page: dates in Nigerian time, plan names, and the plain-English status. No server and no browser needed.
const PLAN_NAMES = { free: 'Free', monthly: 'Monthly', term: '3 months' }
const STATUS_NAMES = { active: 'Active', expired: 'Expired', none: 'None' }

export const planName = (plan) => PLAN_NAMES[plan] || String(plan || '')
export const statusName = (status) => STATUS_NAMES[status] || String(status || '')

// "25 Oct 2026, 09:26" in Nigerian time (the same clock the monthly revenue uses), or "-" when there is no date
export function dateTimeText(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  try {
    return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Lagos' })
  } catch {
    return '-'
  }
}

export function dateText(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  try {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
  } catch {
    return '-'
  }
}

// ₦1,522.85 (kobo kept when there are any), ₦8,343 when it is a whole number of naira
export function nairaText(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '₦0'
  return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`
}

// "October 2026" from the server's "2026-10"
export function monthText(label) {
  const match = /^(\d{4})-(\d{2})$/.exec(label || '')
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return ''
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${names[Number(match[2]) - 1] || ''} ${match[1]}`.trim()
}

// The three numbers at the top of the page, as the cards show them
export function summaryCards(counts) {
  if (!counts) return []
  return [
    { key: 'free', label: 'Free-plan students', value: String(counts.freeStudents), note: 'Confirmed email, no paid plan' },
    { key: 'paying', label: 'Paying students', value: String(counts.payingStudents), note: counts.expiredStudents ? `${counts.expiredStudents} more with a plan that has ended` : 'Plan running now' },
    { key: 'revenue', label: `Revenue, ${monthText(counts.month) || 'this month'}`, value: nairaText(counts.revenueThisMonthNaira), note: `${counts.paymentsThisMonth} payment${counts.paymentsThisMonth === 1 ? '' : 's'} this month` },
  ]
}
