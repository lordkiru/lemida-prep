// Run with:  npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanEmail, examLabel, landingFor, looksLikeEmail, passwordProblem, safeNext } from './rules.js'

test('emails are trimmed and lower-cased, and obvious typos are caught', () => {
  assert.equal(cleanEmail('  Ada@Example.COM '), 'ada@example.com')
  assert.equal(cleanEmail(undefined), '')
  for (const ok of ['a@b.co', 'ada.obi@example.com', ' ADA@EXAMPLE.COM ']) assert.equal(looksLikeEmail(ok), true, ok)
  for (const bad of ['', 'ada', 'ada@', '@example.com', 'ada@example', 'ada @example.com', 'a@b@c.com']) assert.equal(looksLikeEmail(bad), false, bad)
})

test('password hints: length, bytes, and not the email or the name', () => {
  assert.match(passwordProblem(''), /Enter a password/)
  assert.match(passwordProblem('short1'), /at least 8/)
  assert.equal(passwordProblem('blue-River-seven-42'), '')
  assert.match(passwordProblem('x'.repeat(73)), /at most 72/)
  assert.equal(passwordProblem('x'.repeat(72)), '')
  assert.match(passwordProblem('€'.repeat(25)), /at most 72/) // 25 characters but 75 bytes
  assert.match(passwordProblem('adaobi-2027', { email: 'adaobi@example.com' }), /email/)
  assert.equal(passwordProblem('ada-2027-x', { email: 'ada@example.com' }), '') // a local part under 4 characters is not checked, as on the server
  assert.match(passwordProblem('ada obi ok', { name: 'Ada Obi Ok' }), /name/)
})

test('landingFor: signed out -> login, setup not done -> setup, otherwise the app', () => {
  assert.equal(landingFor(null), '/login')
  assert.equal(landingFor({ profileComplete: false }), '/setup')
  assert.equal(landingFor({ profileComplete: true }), '/')
})

test('safeNext only ever returns a page inside this app', () => {
  assert.equal(safeNext('/practice'), '/practice')
  assert.equal(safeNext('/mocks?x=1'), '/mocks?x=1')
  for (const bad of ['//evil.com', 'https://evil.com', 'http://evil.com/x', '/\\evil.com', 'javascript:alert(1)', '', undefined, null, 42, 'practice']) assert.equal(safeNext(bad), '', String(bad))
  for (const loop of ['/login', '/signup', '/forgot', '/reset?token=abc', '/verify?token=abc']) assert.equal(safeNext(loop), '', loop)
})

test('examLabel', () => {
  assert.equal(examLabel('WAEC'), 'WAEC')
  assert.equal(examLabel('NECO'), 'NECO')
  assert.equal(examLabel('BOTH'), 'WAEC and NECO')
  assert.equal(examLabel(null), '')
})
