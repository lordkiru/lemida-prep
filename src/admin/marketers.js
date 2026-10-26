// The admin page's Marketers section: checking the form before it is sent, and wording for the list and the results. No server and no browser needed.
// The server checks everything again (routes/prepMarketers.js); this only saves a round trip and says what is wrong in plain words.
import { cleanEmail, looksLikeEmail } from '../auth/rules.js'
import { dateText, nairaText } from './format.js'

// What the server accepts: a name of 2 to 100 characters, a valid email, and a phone of 7 to 20 digits with an optional leading + (spaces, brackets and dashes allowed)
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/

// { name, email, phone } -> { fieldName: 'what is wrong' } (empty when it is fine)
export function marketerFormProblems({ name = '', email = '', phone = '' } = {}) {
  const problems = {}
  const n = String(name).trim()
  if (n.length < 2 || n.length > 100) problems.name = 'Enter the marketer\'s name (2 to 100 characters).'
  if (!looksLikeEmail(email)) problems.email = 'Enter a valid email address.'
  if (!PHONE_PATTERN.test(String(phone).trim())) problems.phone = 'Enter a valid phone number (7 to 20 digits, with an optional + at the start).'
  return problems
}

// What is sent: the name trimmed, the email cleaned and lower-cased, the phone trimmed. Nothing else is ever sent (the code, wallet and status are the system's).
export const marketerPayload = ({ name, email, phone }) => ({ name: String(name).trim(), email: cleanEmail(email), phone: String(phone).trim() })

// The line shown after creating a marketer
export function createdMessage({ marketer, inviteSent }) {
  const base = `Created ${marketer.name}. Their referral code is ${marketer.referralCode}.`
  return inviteSent ? `${base} The invite email has been sent to ${marketer.email}.` : `${base} The invite email could NOT be sent: use "Send invite again" in the list below.`
}

// The line shown after sending an invite again
export const inviteMessage = (marketer, inviteSent) => (inviteSent ? `Invite sent to ${marketer.email}.` : `The invite to ${marketer.email} could not be sent. Try again in a moment.`)

// Where a marketer is in getting started, from what the server says
export function marketerProgress(marketer) {
  if (!marketer) return ''
  if (marketer.lastLoginAt) return `Signed in ${dateText(marketer.lastLoginAt)}`
  return marketer.passwordSet ? 'Password chosen, not signed in yet' : 'Has not chosen a password'
}

export const marketerStatusText = (marketer) => (marketer && marketer.status === 'suspended' ? 'Suspended' : 'Active')

// What they have earned so far, as the list shows it
export const earnedText = (marketer) => nairaText(marketer && marketer.totalEarned)
