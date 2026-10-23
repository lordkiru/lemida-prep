// Writes the security headers Cloudflare Pages sends with every page, into dist/_headers. Runs after `vite build` (see package.json).
//
// Why it is a script and not a fixed file: the page has one small inline script (it sets light or dark mode before the first paint, so there
// is no flash). A strict content policy only allows it if it knows the script's fingerprint (a SHA-256 hash), and the fingerprint changes
// whenever that script is edited. So the build reads the finished dist/index.html, hashes each inline script, and writes the policy to match.
// Anything else inline, or from another website, is refused by the browser.
//
// This file exists in two places and must stay identical: lemida-prep/scripts/make-headers.mjs and content-studio/scripts/make-headers.mjs.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_API = 'https://api.lemidaitsolutions.com'

// The text of every <script> that has no src (the ones the policy has to be told about).
// Line endings are turned into plain newlines first: a browser reads a page's CRLF line endings as ordinary newlines before it checks a script's
// fingerprint, so a fingerprint taken from a file with Windows line endings (a build on a Windows PC) would never match.
export function inlineScripts(html) {
  const out = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(m[1]) && m[2].trim()) out.push(m[2].replace(/\r\n?/g, '\n'))
  }
  return out
}

export const sha256 = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`

// The policy as one header value. `html` is the built index.html, `apiUrl` the API the app talks to.
export function contentSecurityPolicy({ html, apiUrl = DEFAULT_API }) {
  const api = new URL(apiUrl).origin
  const usesGoogleFonts = /fonts\.googleapis\.com/.test(html)
  const hashes = inlineScripts(html).map(sha256)
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    // inline styles: React sets a few style attributes (progress bars), and the page has a tiny <style> for the first paint
    `style-src 'self' 'unsafe-inline'${usesGoogleFonts ? ' https://fonts.googleapis.com' : ''}`,
    `font-src 'self' data:${usesGoogleFonts ? ' https://fonts.gstatic.com' : ''}`,
    "img-src 'self' data:",
    `connect-src 'self' ${api}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

// The whole file: the existing rules (cache settings) first, then the security headers for every path.
// (Cloudflare Pages already sends X-Content-Type-Options and Referrer-Policy itself, so they are not repeated here.)
export function buildHeaders({ html, apiUrl, existing = '' }) {
  const lines = [
    '/*',
    `  Content-Security-Policy: ${contentSecurityPolicy({ html, apiUrl })}`,
    '  X-Frame-Options: DENY',
    '  Strict-Transport-Security: max-age=15552000',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '  Cross-Origin-Opener-Policy: same-origin',
  ]
  const base = existing.replace(/\r\n/g, '\n').trimEnd()
  return `${base ? `${base}\n\n` : ''}${lines.join('\n')}\n`
}

// run as a script: `node scripts/make-headers.mjs`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dist = path.join(root, 'dist')
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
  const headersFile = path.join(dist, '_headers')
  const existing = fs.existsSync(headersFile) ? fs.readFileSync(headersFile, 'utf8') : ''
  if (existing.includes('Content-Security-Policy')) {
    console.log('dist/_headers already has a content policy: left as it is')
  } else {
    const apiUrl = process.env.VITE_API_URL || DEFAULT_API
    fs.writeFileSync(headersFile, buildHeaders({ html, apiUrl, existing }))
    console.log(`wrote dist/_headers with a content policy for scripts ${inlineScripts(html).length ? 'including' : 'with no'} inline hashes; API ${new URL(apiUrl).origin}`)
  }
}
