// Run with:  npm test   (no browser needed)
// The PWA settings, the files Cloudflare Pages needs, and the repo rules.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pwaOptions, THEME_COLOR } from '../pwa.config.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8')
const exists = (...p) => fs.existsSync(path.join(root, ...p))

test('the manifest: names and colours', () => {
  const m = pwaOptions.manifest
  assert.equal(m.name, 'Lemida Exam Prep')
  assert.equal(m.short_name, 'Exam Prep')
  assert.equal(m.theme_color, '#070D1F')
  assert.equal(m.background_color, '#070D1F')
  assert.equal(THEME_COLOR, '#070D1F')
  assert.equal(m.display, 'standalone')
})

test('the manifest icons exist on disk, including a maskable one', () => {
  const icons = pwaOptions.manifest.icons
  assert.ok(icons.some((i) => i.purpose === 'maskable'))
  for (const icon of icons) assert.ok(exists('public', icon.src), `public${icon.src} is missing: run npm run icons`)
  assert.ok(icons.some((i) => i.src === '/logo.svg'), 'the logo is also an icon')
  assert.ok(exists('public', 'icons', 'apple-touch-icon.png'))
})

test('the service worker caches the app shell only: NO runtime caching, and API paths are kept out of the navigation fallback', () => {
  const w = pwaOptions.workbox
  assert.deepEqual(w.runtimeCaching, [], 'any runtime caching rule could store API responses (questions and answers)')
  assert.equal(w.navigateFallback, '/index.html')
  assert.ok(w.navigateFallbackDenylist.some((re) => re.test('/api/prep/health')), 'API paths must never get the app shell')
  // what gets precached is build output of the app itself: never a data or API file type
  for (const pattern of w.globPatterns) assert.doesNotMatch(pattern, /json|api|question/i)
})

test('no code in src talks to the Cache API or a service worker by hand (the build\'s shell cache is the only cache)', () => {
  const files = []
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : files.push(path.join(dir, e.name))))
  walk(path.join(root, 'src'))
  for (const file of files.filter((f) => /\.(js|jsx)$/.test(f) && !/\.test\.js$/.test(f))) {
    const src = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(src, /caches\.(open|put|match)|serviceWorker\.register|cache\.put/, `${file} must not manage caches itself`)
  }
})

test('Cloudflare Pages: single-page fallback and sensible cache headers', () => {
  assert.equal(read('public', '_redirects').trim(), '/* /index.html 200')
  const headers = read('public', '_headers')
  assert.match(headers, /\/sw\.js\s+Cache-Control: no-cache/)
  assert.match(headers, /\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/)
})

test('configuration: the API address comes from VITE_API_URL, with an example file and no real values', () => {
  const example = read('.env.example')
  assert.match(example, /^VITE_API_URL=/m)
  assert.doesNotMatch(example, /mongodb|secret|password|token/i)
  assert.match(read('src', 'api.js'), /VITE_API_URL/)
})

test('repo rules: question data is ignored, no secrets files are tracked', () => {
  const ignore = read('.gitignore')
  assert.match(ignore, /^question-data\/$/m)
  assert.match(ignore, /^\*\.questions\.json$/m)
  assert.match(ignore, /^\.env$/m)
  assert.match(ignore, /^!\.env\.example$/m)
})

test('wording and branding rules: no exam-board logos and no "official" or "past questions" wording anywhere in the app', () => {
  const targets = []
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (!/\.test\.js$/.test(e.name)) targets.push(p)
  })
  walk(path.join(root, 'src'))
  walk(path.join(root, 'public'))
  targets.push(path.join(root, 'index.html'), path.join(root, 'pwa.config.js'))

  for (const file of targets) {
    assert.doesNotMatch(path.basename(file), /waec|neco/i, `${file}: no exam-board logo files`)
    if (/\.(png|ico|jpg|jpeg|webp)$/.test(file)) continue // images: checked by file name above
    const text = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /\bofficial/i, `${file} must not say "official"`)
    assert.doesNotMatch(text, /past[\s-]+questions?/i, `${file} must not say "past questions"`)
    assert.doesNotMatch(text, /past[\s-]+papers?/i, `${file} must not say "past papers"`)
  }
})
