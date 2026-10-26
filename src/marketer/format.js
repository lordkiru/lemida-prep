// Wording for the marketer's own page. Money and dates reuse the admin page's (naira with kobo only when there are some, dates in Nigerian time).
// No server and no browser needed.
import { dateText, nairaText, planName } from '../admin/format.js'

export { dateText, nairaText, planName }

// A referred student, as their marketer is told about them: only a state, never who they are
const STATES = { free: 'Signed up', paying: 'Paying', 'plan ended': 'Plan ended' }
export const stateText = (state) => STATES[state] || String(state || '')

// "Held until 30 Oct 2026" or "Available"
export const commissionStatusText = (commission) => (commission && commission.status === 'held' ? `Held until ${dateText(commission.availableFrom)}` : 'Available')

// The three wallet figures, as cards
export function walletCards(wallet, rules) {
  if (!wallet) return []
  const days = rules && rules.holdDays ? rules.holdDays : 5
  return [
    { key: 'available', label: 'Available now', value: nairaText(wallet.availableNaira), note: `Past its ${days}-day hold` },
    { key: 'held', label: 'Held', value: nairaText(wallet.heldNaira), note: `Becomes available ${days} days after each payment` },
    { key: 'earned', label: 'Earned in total', value: nairaText(wallet.earnedNaira), note: wallet.withdrawnNaira ? `${nairaText(wallet.withdrawnNaira)} already withdrawn` : 'Nothing withdrawn yet' },
  ]
}

// How the earning works, in one plain paragraph, with the numbers the server sends
export function earnNote(rules) {
  if (!rules) return ''
  const c = rules.commissionNaira || {}
  return `You earn ${nairaText(c.monthly)} each time a student you referred pays for the Monthly plan, and ${nairaText(c.term)} each time they pay for the 3-month plan, including every renewal. Each commission is held for ${rules.holdDays} days, then it is available. Withdrawals are not open yet; when they are, the minimum will be ${nairaText(rules.minWithdrawalNaira)}.`
}

// What a marketer can send to a student: the message and the link
export const shareMessage = (link) => `Practise for WAEC and NECO on Lemida Exam Prep: ${link}`
