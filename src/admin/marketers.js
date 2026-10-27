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
  if (marketer.status === 'pending') return 'Signed up, has not confirmed their email'
  if (marketer.lastLoginAt) return `Signed in ${dateText(marketer.lastLoginAt)}`
  return marketer.passwordSet ? 'Password chosen, not signed in yet' : 'Has not chosen a password'
}

const STATUS_TEXT = { active: 'Active', suspended: 'Suspended', pending: 'Waiting to confirm email' }
export const marketerStatusText = (marketer) => STATUS_TEXT[marketer && marketer.status] || 'Active'

// The one switch an admin has on a marketer: an active marketer can be switched off, a suspended one back on. A marketer who has not confirmed their email has no
// switch (they switch themselves on by confirming), and neither does anything unknown.
export function statusSwitch(marketer) {
  if (!marketer) return null
  if (marketer.status === 'active') return { next: 'suspended', label: 'Suspend' }
  if (marketer.status === 'suspended') return { next: 'active', label: 'Switch back on' }
  return null
}

// The line shown after switching a marketer off or on
export const switchMessage = (marketer, next) =>
  next === 'suspended' ? `${marketer.name} is suspended: they cannot sign in, and their code earns nothing until you switch them back on.` : `${marketer.name} is switched back on.`

// The button on a row that sends the email again: not for a suspended marketer, and worded for what the email is
export const inviteButton = (marketer) => ({ disabled: !marketer || marketer.status === 'suspended', label: marketer && marketer.status === 'pending' ? 'Send link again' : 'Send invite again' })

// What they have earned so far, as the list shows it
export const earnedText = (marketer) => nairaText(marketer && marketer.totalEarned)
