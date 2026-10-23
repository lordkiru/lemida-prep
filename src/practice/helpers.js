// Small pure helpers for the practice screens (no React, so they can be tested with plain Node).

// 0 -> "A", 1 -> "B"...
export const optionLetter = (index) => String.fromCharCode(65 + index)

// The first question of a session that has no result yet, or -1 when every question has been answered.
export function firstUnanswered(questions, results) {
  const answered = new Set(results.map((r) => r.questionId))
  return questions.findIndex((q) => !answered.has(q.id))
}

// A key press chooses an answer: "a".."f" or "1".."6". Returns the option index, or -1 for any other key (or an option that does not exist).
export function optionForKey(key, optionCount) {
  if (typeof key !== 'string' || key.length !== 1) return -1
  const lower = key.toLowerCase()
  const index = /[a-f]/.test(lower) ? lower.charCodeAt(0) - 97 : /[1-6]/.test(lower) ? Number(lower) - 1 : -1
  return index >= 0 && index < optionCount ? index : -1
}

// An honest line under the score. It says what the score means, without promising anything about the real exam.
export function scoreMessage(percent, total) {
  if (total === 0) return 'No questions were answered.'
  if (percent === 100) return 'Perfect. Every answer was right.'
  if (percent >= 70) return 'Well done. Look at the ones you missed below.'
  if (percent >= 40) return 'A good start. Read the explanations below, then try again.'
  return 'Keep going. Read the explanations below, then try this subject again.'
}

// "7 of 10", "1 of 1"
export const ofLabel = (done, total) => `${done} of ${total}`

// How much of a subject's bank the student has seen, as a whole number of percent (never above 100).
export function seenPercent(seen, available) {
  if (!available) return 0
  return Math.min(100, Math.round((seen / available) * 100))
}

export const questionsLabel = (n) => `${n} question${n === 1 ? '' : 's'}`

// What can be wrong with a question, in the student's words. The values are the ones the API accepts.
export const REPORT_REASONS = [
  { value: 'wrong_answer', label: 'The answer marked right is wrong' },
  { value: 'two_answers', label: 'More than one answer could be right' },
  { value: 'typo_unclear', label: 'There is a typo, or the question is unclear' },
  { value: 'other', label: 'Something else' },
]
export const MAX_REPORT_NOTE = 500

// "Missed 1 time", "Missed 3 times"
export const missedLabel = (n) => `Missed ${n} time${n === 1 ? '' : 's'}`

// The label of a round: practice rounds have none, a mistakes round says so
export const roundLabel = (mode) => (mode === 'mistakes' ? 'Mistakes' : '')
