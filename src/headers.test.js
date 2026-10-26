// Run with:  npm test   (no browser needed)
// The security headers the build writes for Cloudflare Pages (scripts/make-headers.mjs).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildHeaders, contentSecurityPolicy, inlineScripts, sha256 } from '../scripts/make-headers.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans" rel="stylesheet">
<script>window.theme = 'dark'</script>
<script type="module" crossorigin src="/assets/index-abc.js"></script>
<script id="vite-plugin-pwa:register-sw" src="/registerSW.js"></script>
<style>html{background:#000}</style></head><body><div id="root"></div></body></html>`

test('only inline scripts are found: scripts with a src are not', () => {
  assert.deepEqual(inlineScripts(html), ["window.theme = 'dark'"])
  assert.deepEqual(inlineScripts('<script src="/a.js"></script><script>  </script>'), [])
})

test('the fingerprint is the same whether the page has Windows (CRLF) or Unix (LF) line endings, as browsers see them', () => {
  const lf = '<script>\nvar a = 1;\nvar b = 2;\n</script>'
  const crlf = lf.replace(/\n/g, '\r\n')
  assert.deepEqual(inlineScripts(crlf), inlineScripts(lf))
  assert.equal(contentSecurityPolicy({ html: crlf }), contentSecurityPolicy({ html: lf }))
})

test('the inline script is allowed by its SHA-256 fingerprint, and nothing else inline is', () => {
  const csp = contentSecurityPolicy({ html, apiUrl: 'https://api.example.com' })
  assert.ok(csp.includes(`script-src 'self' ${sha256("window.theme = 'dark'")}`))
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp), 'inline scripts are never allowed wholesale')
  assert.ok(!/script-src[^;]*'unsafe-eval'/.test(csp))
  assert.match(sha256('x'), /^'sha256-[A-Za-z0-9+/]+=*'$/)
})

test('the policy lets the page talk only to itself and its own API, and can never be put in a frame', () => {
  const csp = contentSecurityPolicy({ html, apiUrl: 'https://api.example.com/some/path' })
  assert.match(csp, /default-src 'self'/)
  assert.match(csp, /connect-src 'self' https:\/\/api\.example\.com(;|$)/)
  assert.match(csp, /frame-ancestors 'none'/)
  assert.match(csp, /object-src 'none'/)
  assert.match(csp, /base-uri 'self'/)
  assert.match(csp, /form-action 'self'/)
  assert.match(csp, /img-src 'self' data:/)
})

test('Google Fonts are allowed only when the page really uses them', () => {
  assert.match(contentSecurityPolicy({ html }), /style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com/)
  assert.match(contentSecurityPolicy({ html }), /font-src 'self' data: https:\/\/fonts\.gstatic\.com/)
  const plain = contentSecurityPolicy({ html: '<script>1</script>' })
  assert.ok(!/fonts\./.test(plain))
})

test('the finished file keeps the cache rules and adds the security headers for every path', () => {
  const existing = fs.readFileSync(path.join(root, 'public', '_headers'), 'utf8')
  const out = buildHeaders({ html, apiUrl: 'https://api.example.com', existing })
  assert.ok(out.startsWith(existing.replace(/\r\n/g, '\n').trimEnd()), 'the cache rules come first, unchanged')
  const block = out.slice(out.lastIndexOf('\n/*\n'))
  for (const header of ['Content-Security-Policy:', 'X-Frame-Options: DENY', 'Strict-Transport-Security: max-age=15552000', 'Permissions-Policy: camera=()', 'Cross-Origin-Opener-Policy: same-origin']) {
    assert.ok(block.includes(`  ${header}`), header)
  }
  assert.ok(out.endsWith('\n'))
})

test('robots.txt keeps search engines out of the app and the one-time email pages', () => {
  const robots = fs.readFileSync(path.join(root, 'public', 'robots.txt'), 'utf8')
  for (const p of ['/debug', '/admin', '/marketer', '/setup', '/practice', '/profile', '/verify', '/reset']) assert.match(robots, new RegExp(`^Disallow: ${p}$`, 'm'), p)
  assert.doesNotMatch(robots, /^Disallow: \/$/m, 'the sign-in and information pages may still be found')
})

test('the privacy policy and the terms exist, are linked from sign-up, and say what they must', () => {
  const legal = fs.readFileSync(path.join(root, 'src', 'pages', 'Legal.jsx'), 'utf8')
  for (const needle of ['Privacy policy', 'Terms of use', 'Students under 18', 'Delete my account', 'Nigeria Data Protection Commission', 'do <strong>not</strong>', 'independent']) assert.ok(legal.includes(needle), needle)
  const signup = fs.readFileSync(path.join(root, 'src', 'pages', 'auth', 'Signup.jsx'), 'utf8')
  assert.match(signup, /to="\/terms"/)
  assert.match(signup, /to="\/privacy"/)
  const app = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8')
  assert.match(app, /path="privacy"/)
  assert.match(app, /path="terms"/)
})
