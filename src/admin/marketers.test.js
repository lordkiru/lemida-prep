// Run with:  npm test   (no browser, no server)
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createApi } from '../api.js'
import { PHONE_PATTERN, createdMessage, earnedText, inviteMessage, marketerFormProblems, marketerPayload, marketerProgress, marketerStatusText } from './marketers.js'

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => fs.readFileSync(path.join(src, ...parts), 'utf8')

// ---------- checking the form ----------

test('a good form has no problems, and the phone may have spaces, brackets, dashes and a leading +', () => {
  assert.deepEqual(marketerFormProblems({ name: 'Ada Okafor', email: 'ada@example.com', phone: '08012345678' }), {})
  for (const phone of ['0801 234 5678', '+234 801 234 5678', '(0801) 234-5678', '1234567', '+12345678901234567890']) assert.ok(PHONE_PATTERN.test(phone), phone)
  assert.deepEqual(marketerFormProblems({ name: ' Ada ', email: ' ADA@Example.com ', phone: ' 08012345678 ' }), {}, 'spaces around things are fine')
})

test('each field says what is wrong with it', () => {
  const p = marketerFormProblems({ name: 'A', email: 'nope', phone: '12' })
  assert.deepEqual(Object.keys(p).sort(), ['email', 'name', 'phone'])
  assert.match(p.name, /2 to 100 characters/)
  assert.match(p.email, /valid email/)
  assert.match(p.phone, /7 to 20 digits/)
  assert.deepEqual(Object.keys(marketerFormProblems({ name: 'Ada', email: 'ada@example.com', phone: 'call me' })), ['phone'])
  assert.deepEqual(Object.keys(marketerFormProblems({})).sort(), ['email', 'name', 'phone'], 'an empty form')
  assert.ok(marketerFormProblems({ name: 'x'.repeat(101), email: 'a@b.co', phone: '08012345678' }).name, 'a name over 100 characters')
  for (const bad of ['+', '0801-ABC-5678', '08012345678901234567890', '080123']) assert.ok(!PHONE_PATTERN.test(bad), bad)
})

test('only the name, email and phone are ever sent, cleaned up', () => {
  assert.deepEqual(marketerPayload({ name: '  Ada Okafor ', email: ' ADA@Example.com ', phone: ' 0801 234 5678 ', referralCode: 'MINE2026', status: 'suspended', walletBalance: 99999 }), { name: 'Ada Okafor', email: 'ada@example.com', phone: '0801 234 5678' })
})

// ---------- the wording ----------

test('after creating: the code and whether the invite went, with a way forward when it did not', () => {
  const marketer = { name: 'Ada Okafor', email: 'ada@example.com', referralCode: 'ADAO2026' }
  assert.equal(createdMessage({ marketer, inviteSent: true }), 'Created Ada Okafor. Their referral code is ADAO2026. The invite email has been sent to ada@example.com.')
  const failed = createdMessage({ marketer, inviteSent: false })
  assert.match(failed, /could NOT be sent/)
  assert.match(failed, /Send invite again/)
  assert.equal(inviteMessage(marketer, true), 'Invite sent to ada@example.com.')
  assert.match(inviteMessage(marketer, false), /could not be sent/)
})

test('the list says who has got started: no password yet, password chosen, or signed in', () => {
  assert.equal(marketerProgress({ passwordSet: false, lastLoginAt: null }), 'Has not chosen a password')
  assert.equal(marketerProgress({ passwordSet: true, lastLoginAt: null }), 'Password chosen, not signed in yet')
  assert.equal(marketerProgress({ passwordSet: true, lastLoginAt: '2026-10-26T09:00:00.000Z' }), 'Signed in 26 Oct 2026')
  assert.equal(marketerProgress({}), 'Has not chosen a password', 'an older server that says nothing')
  assert.equal(marketerProgress(undefined), '')
  assert.equal(marketerStatusText({ status: 'active' }), 'Active')
  assert.equal(marketerStatusText({ status: 'suspended' }), 'Suspended')
  assert.equal(earnedText({ totalEarned: 1100 }), '₦1,100')
  assert.equal(earnedText(undefined), '₦0')
})

// ---------- the calls ----------

const recorder = (answer) => {
  const calls = []
  return { calls, impl: async (url, options) => { calls.push({ url, options }); return answer } }
}
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

test('create, list and invite are the super admin\'s calls: each carries the token, and create sends only name, email and phone', async () => {
  const f = recorder(json(200, {}))
  const api = createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl })
  await api.admin.marketers.list('tok-1')
  await api.admin.marketers.create('tok-1', { name: 'Ada', email: 'ada@example.com', phone: '0801', code: 'HACK', status: 'suspended' })
  await api.admin.marketers.sendInvite('tok-1', '64b000000000000000000001')
  assert.deepEqual(f.calls.map((c) => `${c.options.method || 'GET'} ${c.url.replace('https://api.example.com', '')}`), ['GET /superadmin/prep-marketers', 'POST /superadmin/prep-marketers', 'POST /superadmin/prep-marketers/64b000000000000000000001/invite'])
  for (const c of f.calls) assert.equal(c.options.headers.Authorization, 'Bearer tok-1')
  assert.deepEqual(JSON.parse(f.calls[1].options.body), { name: 'Ada', email: 'ada@example.com', phone: '0801' })
})

test('a marketer id in the address is escaped', async () => {
  const f = recorder(json(200, {}))
  await createApi({ baseUrl: 'https://api.example.com', fetchImpl: f.impl }).admin.marketers.sendInvite('t', 'a/b?c')
  assert.equal(f.calls[0].url, 'https://api.example.com/superadmin/prep-marketers/a%2Fb%3Fc/invite')
})

test('a refused create says why: an email that is already a marketer (409) or a signed-out admin (401)', async () => {
  const dup = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(409, { error: 'A marketer with that email already exists.' })).impl })
  await assert.rejects(dup.admin.marketers.create('t', { name: 'Ada', email: 'a@b.co', phone: '0801234567' }), (err) => err.status === 409 && /already exists/.test(err.message))
  const out = createApi({ baseUrl: 'https://x.test', fetchImpl: recorder(json(401, { error: 'Invalid or expired token' })).impl })
  await assert.rejects(out.admin.marketers.list('old'), (err) => err.status === 401)
})

// ---------- what the section does and does not do ----------

test('the Marketers section creates, lists and invites: no button for money, wallets or deleting', () => {
  const section = read('pages', 'AdminMarketers.jsx')
  assert.doesNotMatch(section, /api\.admin\.(?!marketers\.(list|create|sendInvite))/, 'only the three marketer calls')
  assert.doesNotMatch(section, /api\.(me|auth|billing|mocks|practice|marketer)\b/, 'nothing from the student or marketer side')
  const labels = [...section.matchAll(/<button[^>]*>\s*([^<{]*?)\s*(?:<|\{)/g)].map((m) => m[1]).filter(Boolean)
  assert.ok(labels.includes('Create marketer') || section.includes("'Create marketer'"))
  for (const label of labels) assert.doesNotMatch(label, /withdraw|delete|remove|refund|pay out|approve|suspend|wallet/i, label)
})

test('the admin page shows the section, and says what it can and cannot do', () => {
  const page = read('pages', 'Admin.jsx')
  assert.match(page, /<AdminMarketers token=\{session\.token\} onEnded=\{onSignOut\} \/>/)
  assert.match(page, /Payments and students are read-only; you can create marketers below/)
})
