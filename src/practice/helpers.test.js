// Run with:  npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { firstUnanswered, ofLabel, optionForKey, optionLetter, questionsLabel, scoreMessage, seenPercent } from './helpers.js'

test('options are lettered A, B, C, D', () => {
  assert.deepEqual([0, 1, 2, 3].map(optionLetter), ['A', 'B', 'C', 'D'])
})

test('the first question without a result is where a session carries on', () => {
  const qs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.equal(firstUnanswered(qs, []), 0)
  assert.equal(firstUnanswered(qs, [{ questionId: 'a' }]), 1)
  assert.equal(firstUnanswered(qs, [{ questionId: 'a' }, { questionId: 'c' }]), 1, 'answers can come in any order')
  assert.equal(firstUnanswered(qs, [{ questionId: 'a' }, { questionId: 'b' }, { questionId: 'c' }]), -1)
  assert.equal(firstUnanswered([], []), -1)
})

test('keys choose an answer: a-f or 1-6, only when that option exists', () => {
  assert.equal(optionForKey('a', 4), 0)
  assert.equal(optionForKey('D', 4), 3)
  assert.equal(optionForKey('e', 4), -1)
  assert.equal(optionForKey('1', 4), 0)
  assert.equal(optionForKey('4', 4), 3)
  assert.equal(optionForKey('5', 4), -1)
  assert.equal(optionForKey('0', 4), -1)
  for (const other of ['Enter', ' ', 'ab', '', undefined, null, 5, 'z', '-']) assert.equal(optionForKey(other, 4), -1, String(other))
})

test('the message under the score is honest at every level', () => {
  assert.match(scoreMessage(100, 10), /Perfect/)
  assert.match(scoreMessage(80, 10), /Well done/)
  assert.match(scoreMessage(70, 10), /Well done/)
  assert.match(scoreMessage(50, 10), /good start/)
  assert.match(scoreMessage(10, 10), /Keep going/)
  assert.match(scoreMessage(0, 0), /No questions/)
})

test('labels and progress', () => {
  assert.equal(ofLabel(3, 10), '3 of 10')
  assert.equal(questionsLabel(1), '1 question')
  assert.equal(questionsLabel(14), '14 questions')
  assert.equal(questionsLabel(0), '0 questions')
  assert.equal(seenPercent(5, 10), 50)
  assert.equal(seenPercent(10, 14), 71)
  assert.equal(seenPercent(20, 14), 100, 'never above 100')
  assert.equal(seenPercent(3, 0), 0, 'no division by zero')
})

import { MAX_REPORT_NOTE, REPORT_REASONS, missedLabel, roundLabel } from './helpers.js'

test('the reasons a question can be reported for are exactly the ones the API accepts, each with a plain label', () => {
  assert.deepEqual(REPORT_REASONS.map((r) => r.value), ['wrong_answer', 'two_answers', 'typo_unclear', 'other'])
  for (const r of REPORT_REASONS) assert.ok(r.label.length > 10 && !/_/.test(r.label), r.value)
  assert.equal(MAX_REPORT_NOTE, 500)
})

test('mistake labels', () => {
  assert.equal(missedLabel(1), 'Missed 1 time')
  assert.equal(missedLabel(3), 'Missed 3 times')
  assert.equal(roundLabel('mistakes'), 'Mistakes')
  assert.equal(roundLabel('practice'), '')
  assert.equal(roundLabel(undefined), '')
})

import { TIME_WARNINGS, durationLabel, formatClock, labelTone, timeWarning, unansweredCount } from './helpers.js'

test('the clock shows minutes and seconds, and hours only when needed; it never goes negative', () => {
  assert.equal(formatClock(2700), '45:00')
  assert.equal(formatClock(65), '1:05')
  assert.equal(formatClock(9), '0:09')
  assert.equal(formatClock(0), '0:00')
  assert.equal(formatClock(3725), '1:02:05')
  assert.equal(formatClock(-5), '0:00')
  assert.equal(formatClock(59.9), '0:59')
  for (const bad of [undefined, null, NaN, 'abc']) assert.equal(formatClock(bad), '0:00', String(bad))
})

test('how long it took, in words', () => {
  assert.equal(durationLabel(750), '12 min 30 s')
  assert.equal(durationLabel(600), '10 min')
  assert.equal(durationLabel(45), '45 s')
  assert.equal(durationLabel(0), '0 s')
  assert.equal(durationLabel(2700), '45 min')
})

test('time warnings are given once each, as the clock passes 10 minutes, 5 minutes and 1 minute', () => {
  assert.deepEqual(TIME_WARNINGS, [600, 300, 60])
  assert.equal(timeWarning(601, 600), '10 minutes left.')
  assert.equal(timeWarning(301, 300), '5 minutes left.')
  assert.equal(timeWarning(61, 60), 'One minute left.')
  assert.equal(timeWarning(600, 599), '', 'already past it a second ago')
  assert.equal(timeWarning(2700, 2699), '')
  assert.equal(timeWarning(302, 299), '5 minutes left.', 'a long gap (a locked phone) still gives the warning that was crossed')
  assert.equal(timeWarning(30, 0), '')
})

test('badge tones for the score labels', () => {
  assert.equal(labelTone('Excellent'), 'good')
  assert.equal(labelTone('Good'), 'good')
  assert.equal(labelTone('Fair'), 'fair')
  assert.equal(labelTone('Needs work'), 'low')
  assert.equal(unansweredCount(40, 32), 8)
  assert.equal(unansweredCount(5, 9), 0)
})

import { clampMinutes, minutesProblem, mockBounds, questionChoices, timePresets } from './helpers.js'

const TIMING = { minQuestions: 5, maxQuestions: 40, secondsPerQuestion: 67.5, minSecondsPerQuestion: 20, maxSecondsPerQuestion: 300, maxMinutes: 240 }

test('the minutes a student may choose match the server\'s rules (the same numbers as server/modules/prep/mocks/timing.js)', () => {
  assert.deepEqual(mockBounds(40, TIMING), { min: 14, max: 200, standard: 45 })
  assert.deepEqual(mockBounds(20, TIMING), { min: 7, max: 100, standard: 23 })
  assert.deepEqual(mockBounds(10, TIMING), { min: 4, max: 50, standard: 12 })
  const big = mockBounds(100, TIMING)
  assert.equal(big.max, 240, 'never over four hours')
  for (const size of [1, 2, 5, 12, 40, 100]) {
    const b = mockBounds(size, TIMING)
    assert.ok(b.min >= 1 && b.min <= b.standard && b.standard <= b.max, `${size}: ${JSON.stringify(b)}`)
  }
})

test('paper sizes offered: 10, 20, 30, 40 up to what the subject has, plus the biggest paper itself', () => {
  assert.deepEqual(questionChoices(40, 5), [10, 20, 30, 40])
  assert.deepEqual(questionChoices(12, 5), [10, 12])
  assert.deepEqual(questionChoices(25, 5), [10, 20, 25])
  assert.deepEqual(questionChoices(3, 5), [3], 'a small subject offers just what it has')
  assert.deepEqual(questionChoices(8, 5), [8])
  assert.deepEqual(questionChoices(0, 5), [])
})

test('a typed time is kept inside the allowed range, and nonsense becomes the standard', () => {
  const b = mockBounds(40, TIMING)
  assert.equal(clampMinutes(60, b), 60)
  assert.equal(clampMinutes('60', b), 60)
  assert.equal(clampMinutes(2, b), 14)
  assert.equal(clampMinutes(900, b), 200)
  assert.equal(clampMinutes(30.4, b), 30)
  for (const bad of ['', 'abc', null, undefined, 0, -3, NaN]) assert.equal(clampMinutes(bad, b), 45, String(bad))
})

test('quick time choices: tighter, standard, more relaxed; always inside the range', () => {
  assert.deepEqual(timePresets(mockBounds(40, TIMING)).map((p) => [p.key, p.minutes]), [['tight', 34], ['standard', 45], ['relaxed', 68]])
  for (const size of [1, 3, 5, 20, 40, 100]) {
    const b = mockBounds(size, TIMING)
    for (const p of timePresets(b)) assert.ok(p.minutes >= b.min && p.minutes <= b.max, `${size} ${p.key}: ${p.minutes}`)
  }
})

test('the typed time is checked and the allowed range is told in plain words', () => {
  const b = mockBounds(40, TIMING)
  assert.equal(minutesProblem('45', b), '')
  assert.equal(minutesProblem(14, b), '')
  assert.equal(minutesProblem(200, b), '')
  for (const bad of [13, 201, '', 'abc', 45.5, 0]) assert.equal(minutesProblem(bad, b), 'Choose between 14 and 200 minutes.', String(bad))
})
