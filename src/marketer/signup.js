// What the marketer sign-up page checks and says. The server checks everything again; these only save a trip and say what is wrong in plain words.
// No server and no browser needed.
import { cleanEmail, looksLikeEmail } from '../auth/rules.js'
import { nairaText } from '../admin/format.js'

// 7 to 20 characters: digits, spaces, brackets, dashes, and one + at the front (the same rule as the server's)
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/

export function signupProblems({ name, email, phone } = {}) {
  const problems = {}
  const n = String(name || '').trim()
  if (n.length < 2 || n.length > 100) problems.name = 'Enter your name (2 to 100 characters).'
  if (!looksLikeEmail(email)) problems.email = 'Enter a valid email address.'
  if (!PHONE_PATTERN.test(String(phone || '').trim())) problems.phone = 'Enter a valid phone number (7 to 20 digits).'
  return problems
}

// Only these three are ever sent: the code, the wallet and the status are the system's
export const signupPayload = ({ name, email, phone }) => ({ name: String(name || '').trim(), email: cleanEmail(email), phone: String(phone || '').trim() })

// What a person is told before they sign up, with the numbers the server sends (so this page can never disagree with the payments)
export function signupPitch(rules) {
  if (!rules || !rules.commissionNaira) return ''
  const c = rules.commissionNaira
  return `Share your link with students. You earn ${nairaText(c.monthly)} each time a student you referred pays for the Monthly plan and ${nairaText(c.term)} for the 3-month plan, including every renewal. Each commission is held for ${rules.holdDays} days, then it is available. Withdrawals are not open yet.`
}
