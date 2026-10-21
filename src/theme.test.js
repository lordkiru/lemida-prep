// Run with:  npm test   (no browser needed)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { THEME_KEY, THEMES, DEFAULT_THEME, readStoredTheme, storeTheme, isDark, applyTheme } from './theme.js'

const here = path.dirname(fileURLToPath(import.meta.url))

// a pretend browser: storage (which may be blocked), the device setting, and <html>
function fakeBrowser({ stored, systemDark = false, storageThrows = false, noMatchMedia = false } = {}) {
  const classes = new Set()
  const root = { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) }, style: {} }
  const store = new Map(stored === undefined ? [] : [[THEME_KEY, stored]])
  const localStorage = {
    getItem: (k) => { if (storageThrows) throw new Error('blocked'); return store.has(k) ? store.get(k) : null },
    setItem: (k, v) => { if (storageThrows) throw new Error('blocked'); store.set(k, v) },
  }
  const window = noMatchMedia ? {} : { matchMedia: () => ({ matches: systemDark, addEventListener() {}, removeEventListener() {} }) }
  return { root, classes, store, localStorage, window }
}

test('the default is System (the device setting), and an unknown stored value falls back to it', () => {
  assert.equal(DEFAULT_THEME, 'system')
  assert.deepEqual(THEMES, ['light', 'dark', 'system'])
  globalThis.localStorage = fakeBrowser({ stored: 'purple' }).localStorage
  assert.equal(readStoredTheme(), 'system')
  globalThis.localStorage = fakeBrowser().localStorage
  assert.equal(readStoredTheme(), 'system')
})

test('reading and writing survive blocked storage', () => {
  globalThis.localStorage = fakeBrowser({ storageThrows: true }).localStorage
  assert.equal(readStoredTheme(), 'system')
  assert.doesNotThrow(() => storeTheme('dark'))
})

test('a stored choice is read back', () => {
  for (const choice of THEMES) {
    globalThis.localStorage = fakeBrowser().localStorage
    storeTheme(choice)
    assert.equal(readStoredTheme(), choice)
  }
})

test('Light and Dark ignore the device; System follows it', () => {
  for (const systemDark of [true, false]) {
    assert.equal(isDark('light', systemDark), false)
    assert.equal(isDark('dark', systemDark), true)
    assert.equal(isDark('system', systemDark), systemDark)
  }
})

test('applyTheme sets the dark class and color-scheme on <html>', () => {
  for (const [theme, systemDark, expected] of [['light', true, false], ['dark', false, true], ['system', true, true], ['system', false, false]]) {
    const b = fakeBrowser({ systemDark })
    globalThis.document = { documentElement: b.root }
    globalThis.window = b.window
    assert.equal(applyTheme(theme), expected, `${theme} / device dark ${systemDark}`)
    assert.equal(b.root.classList.contains('dark'), expected)
    assert.equal(b.root.style.colorScheme, expected ? 'dark' : 'light')
  }
})

// The inline script in index.html runs before the first paint. It cannot import theme.js, so check it agrees with it for every
// stored value and device setting (including blocked storage and a browser without matchMedia).
test('the inline script in index.html gives the same answer as theme.js, so there is no flash', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  const cases = []
  for (const stored of [undefined, 'light', 'dark', 'system', 'purple', '']) for (const systemDark of [true, false]) cases.push({ stored, systemDark })
  cases.push({ stored: 'dark', storageThrows: true, systemDark: true }, { stored: 'light', storageThrows: true, systemDark: false }, { stored: 'dark', noMatchMedia: true }, { stored: undefined, noMatchMedia: true })

  for (const c of cases) {
    const b = fakeBrowser(c)
    vm.runInNewContext(script, { localStorage: b.localStorage, window: b.window, document: { documentElement: b.root } })
    let theme = 'system'
    if (!c.storageThrows && THEMES.includes(c.stored)) theme = c.stored
    const expected = isDark(theme, c.noMatchMedia ? false : c.systemDark)
    assert.equal(b.root.classList.contains('dark'), expected, JSON.stringify(c))
    assert.equal(b.root.style.colorScheme, expected ? 'dark' : 'light', JSON.stringify(c))
  }
})

test('index.html uses the same storage key as theme.js and has the right background before CSS loads', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  assert.ok(html.includes(`'${THEME_KEY}'`))
  assert.match(html, /html\.dark\s*\{\s*background:\s*#070D1F/i)
  assert.match(html, /html\s*\{\s*background:\s*#EEF3FB/i)
})
