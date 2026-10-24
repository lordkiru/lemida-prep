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

// ── mock exams ──

// 2700 -> "45:00", 65 -> "1:05", 3725 -> "1:02:05" (never negative)
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

// 750 -> "12 min 30 s", 600 -> "10 min", 45 -> "45 s"
export function durationLabel(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const m = Math.floor(s / 60)
  const rest = s % 60
  if (m === 0) return `${rest} s`
  return rest === 0 ? `${m} min` : `${m} min ${rest} s`
}

// Time warnings are read out once as the clock passes these many seconds left (10 minutes, 5 minutes, 1 minute)
export const TIME_WARNINGS = [600, 300, 60]
// The warning to give now, or '' - `before` and `now` are the seconds left a moment ago and now, so each warning is given once
export function timeWarning(before, now) {
  const crossed = TIME_WARNINGS.find((t) => before > t && now <= t)
  if (crossed === undefined) return ''
  return crossed === 60 ? 'One minute left.' : `${crossed / 60} minutes left.`
}

// ── choosing the length and the time of a mock ──
// `timing` is what the API sends with the mocks list: { minQuestions, maxQuestions, secondsPerQuestion, minSecondsPerQuestion, maxSecondsPerQuestion, maxMinutes }.
// These must give the same numbers as the server's rules (server/modules/prep/mocks/timing.js), which have the last word.

// The minutes a student may choose for a paper of `size` questions, and the standard time
// `pace` is the subject's standard (exam) seconds a question, which differs by subject; without it the general pace in `timing` is used
export function mockBounds(size, timing, pace = timing.secondsPerQuestion) {
  const min = Math.max(1, Math.ceil((size * timing.minSecondsPerQuestion) / 60))
  const max = Math.min(timing.maxMinutes, Math.max(min, Math.floor((size * timing.maxSecondsPerQuestion) / 60)))
  const standard = Math.min(max, Math.max(min, Math.ceil(Math.ceil(size * pace) / 60)))
  return { min, max, standard }
}

// The paper sizes offered: 10, 20, 30 ... up to 80 and what the subject can give, plus the biggest paper itself (a subject with 12 ready offers 10 and 12)
export function questionChoices(biggest, minQuestions) {
  if (biggest <= 0) return []
  const sizes = new Set([10, 20, 30, 40, 50, 60, 70, 80].filter((n) => n >= Math.min(minQuestions, biggest) && n <= biggest))
  sizes.add(biggest)
  return [...sizes].sort((a, b) => a - b)
}

// Keeps a typed number of minutes inside the allowed range (a blank or rubbish entry becomes the standard)
export function clampMinutes(value, bounds) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n <= 0) return bounds.standard
  return Math.min(bounds.max, Math.max(bounds.min, n))
}

// Quick choices: a tighter time (three quarters of the exam timing), the exam timing itself, and a more relaxed one (half as long again), kept inside the bounds
export function timePresets(bounds) {
  const at = (factor) => clampMinutes(bounds.standard * factor, bounds)
  return [
    { key: 'tight', label: 'Tighter', minutes: at(0.75) },
    { key: 'standard', label: 'Exam timing', minutes: bounds.standard },
    { key: 'relaxed', label: 'More relaxed', minutes: at(1.5) },
  ]
}

// Is the typed time acceptable as it stands?
export const minutesProblem = (value, bounds) => {
  const n = Number(value)
  return Number.isInteger(n) && n >= bounds.min && n <= bounds.max ? '' : `Choose between ${bounds.min} and ${bounds.max} minutes.`
}

// The colour family of a score label, for the badge (words always come with it)
export const labelTone = (label) => (label === 'Excellent' || label === 'Good' ? 'good' : label === 'Fair' ? 'fair' : 'low')

// "3 of 5 answered" / how many are left
export const unansweredCount = (total, answered) => Math.max(0, total - answered)

// The label of a round: practice rounds have none, a mistakes round says so
export const roundLabel = (mode) => (mode === 'mistakes' ? 'Mistakes' : '')
