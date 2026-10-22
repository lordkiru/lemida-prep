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
