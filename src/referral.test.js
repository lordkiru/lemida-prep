import assert from 'node:assert/strict'
import test from 'node:test'
import { REFERRAL_DAYS, REFERRAL_KEY, captureReferralFromUrl, clearReferral, loadReferral, normalizeReferralCode, refFromSearch, referralForSignup, saveReferral } from './referral.js'

const DAY = 24 * 60 * 60 * 1000
// a stand-in for the browser's storage
const fakeStorage = (initial = {}) => {
  const data = { ...initial }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) }, removeItem: (k) => { delete data[k] } }
}
const brokenStorage = () => ({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })

test('a code is cleaned to capitals, or dropped when it cannot be a code (the same rule as the server)', () => {
  assert.equal(normalizeReferralCode('FEST2026'), 'FEST2026')
  assert.equal(normalizeReferralCode('  fest2026 '), 'FEST2026')
  for (const bad of ['', 'AB', 'FEST-2026', 'FEST 2026', 'A'.repeat(21), '<script>', null, undefined, 12345, ['FEST2026'], {}]) assert.equal(normalizeReferralCode(bad), '', JSON.stringify(bad))
})

test('the code is read from a link\'s ?ref=', () => {
  assert.equal(refFromSearch('?ref=FEST2026'), 'FEST2026')
  assert.equal(refFromSearch('?utm=x&ref=fest2026&b=1'), 'FEST2026')
  assert.equal(refFromSearch('?ref=%20fest2026%20'), 'FEST2026')
  for (const none of ['', '?', '?ref=', '?ref=ab', '?ref=bad!code', '?reference=FEST2026', undefined, null]) assert.equal(refFromSearch(none), '', String(none))
})

test('opening a link remembers its code for 30 days, a newer link replaces it, and a link with no code leaves things alone', () => {
  const storage = fakeStorage()
  assert.equal(captureReferralFromUrl({ search: '?ref=fest2026', storage, now: 1000 }), 'FEST2026')
  assert.deepEqual(JSON.parse(storage.data[REFERRAL_KEY]), { code: 'FEST2026', savedAt: 1000 })
  assert.equal(loadReferral({ storage, now: 1000 + 29 * DAY }), 'FEST2026')
  assert.equal(captureReferralFromUrl({ search: '?ref=ADA2026', storage, now: 5000 }), 'ADA2026')
  assert.equal(loadReferral({ storage, now: 5000 }), 'ADA2026')
  assert.equal(captureReferralFromUrl({ search: '?page=2', storage, now: 6000 }), '')
  assert.equal(loadReferral({ storage, now: 6000 }), 'ADA2026', 'a link without a code does not erase the remembered one')
  assert.equal(captureReferralFromUrl({ search: '?ref=nope!', storage, now: 7000 }), '')
  assert.equal(loadReferral({ storage, now: 7000 }), 'ADA2026')
})

test('a remembered code expires after 30 days and is removed then', () => {
  const storage = fakeStorage()
  saveReferral('FEST2026', { storage, now: 0 })
  assert.equal(loadReferral({ storage, now: REFERRAL_DAYS * DAY }), 'FEST2026', 'on the 30th day it still counts')
  assert.equal(loadReferral({ storage, now: REFERRAL_DAYS * DAY + 1 }), '')
  assert.equal(REFERRAL_KEY in storage.data, false, 'the expired entry is cleaned up')
})

test('whatever is in storage, a bad entry is treated as no code and removed', () => {
  for (const raw of ['not json', '{}', '{"code":"FEST2026"}', '{"code":"x","savedAt":0}', '{"code":"FEST2026","savedAt":"yesterday"}', '{"code":"FEST2026","savedAt":99999999999999}', 'null', '[]', '"FEST2026"']) {
    const storage = fakeStorage({ [REFERRAL_KEY]: raw })
    assert.equal(loadReferral({ storage, now: 1000 }), '', raw)
    assert.equal(REFERRAL_KEY in storage.data, false, `${raw} should be removed`)
  }
})

test('clearing forgets the code', () => {
  const storage = fakeStorage()
  saveReferral('FEST2026', { storage, now: 1 })
  clearReferral({ storage })
  assert.equal(loadReferral({ storage, now: 2 }), '')
})

test('blocked or missing storage never breaks anything: the app simply works without a remembered code', () => {
  assert.equal(saveReferral('FEST2026', { storage: brokenStorage() }), false)
  assert.equal(loadReferral({ storage: brokenStorage() }), '')
  assert.doesNotThrow(() => clearReferral({ storage: brokenStorage() }))
  assert.equal(captureReferralFromUrl({ search: '?ref=FEST2026', storage: brokenStorage() }), 'FEST2026', 'the link was valid; only remembering it failed')
  assert.equal(saveReferral('FEST2026', { storage: null }), false)
  assert.equal(loadReferral({ storage: null }), '')
})

test('the sign-up form sends nothing for an empty box, "cookie" only for the remembered code untouched, and "manual_entry" for anything typed or changed', () => {
  assert.deepEqual(referralForSignup({ typed: '', remembered: 'FEST2026' }), {})
  assert.deepEqual(referralForSignup({ typed: '   ', remembered: '' }), {})
  assert.deepEqual(referralForSignup({ typed: 'FEST2026', remembered: 'FEST2026' }), { referralCode: 'FEST2026', referralSource: 'cookie' })
  assert.deepEqual(referralForSignup({ typed: ' fest2026 ', remembered: 'FEST2026' }), { referralCode: 'FEST2026', referralSource: 'cookie' })
  assert.deepEqual(referralForSignup({ typed: 'ADA2026', remembered: 'FEST2026' }), { referralCode: 'ADA2026', referralSource: 'manual_entry' })
  assert.deepEqual(referralForSignup({ typed: 'ADA2026', remembered: '' }), { referralCode: 'ADA2026', referralSource: 'manual_entry' })
  assert.deepEqual(referralForSignup({ typed: 'not a code!', remembered: '' }), {})
})
