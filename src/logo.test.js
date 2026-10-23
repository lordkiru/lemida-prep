// Run with:  npm test   (no browser needed)
// The logo files, where they are used, and the icons made from them.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8')
const NAVY = [0x0a, 0x13, 0x30]

test('the two logo files: the medal on its navy tile, and the medal on its own', () => {
  const tile = read('public', 'logo.svg')
  const bare = read('public', 'logo-no-tile.svg')
  for (const svg of [tile, bare]) {
    assert.match(svg, /viewBox="0 0 64 64"/)
    assert.match(svg, /<title>Lemida Exam Prep<\/title>/)
    assert.doesNotMatch(svg, /placeholder/i, 'the placeholder logo is gone')
  }
  assert.match(tile, /id="lgTile"/)
  assert.match(tile, /<rect width="64" height="64" rx="16" fill="url\(#lgTile\)"\/>/)
  assert.doesNotMatch(bare, /lgTile|<rect/, 'the no-tile logo has no navy tile')
})

test('the logo is shown as an <img> (never inline <svg>), the tile one in dark mode and the plain medal in light mode', () => {
  const logo = read('src', 'components', 'Logo.jsx')
  assert.match(logo, /src="\/logo-no-tile\.svg" className=\{`dark:hidden/)
  assert.match(logo, /src="\/logo\.svg" className=\{`hidden dark:block/)
  assert.match(logo, /alt: 'Lemida Exam Prep'/)
  for (const file of ['Logo.jsx', 'Brand.jsx', 'AppShell.jsx', 'AuthLayout.jsx']) {
    const code = read('src', 'components', file).replace(/\/\/.*$/gm, '') // without the comments, which talk about <svg>
    assert.doesNotMatch(code, /<svg/, `${file} must not paste the logo inline: both files use the same gradient ids`)
  }
})

test('the name sits beside the logo with "Lemida" small above "Exam Prep" bold, in the sidebar, the phone top bar and the sign-in pages', () => {
  const brand = read('src', 'components', 'Brand.jsx')
  assert.ok(brand.indexOf('>Lemida<') > -1 && brand.indexOf('>Lemida<') < brand.indexOf('>Exam Prep<'))
  assert.match(brand, /text-xs[^"]*">Lemida</)
  assert.match(brand, /font-extrabold">Exam Prep</)
  for (const file of ['AppShell.jsx', 'AuthLayout.jsx']) {
    assert.match(read('src', 'components', file), /<Brand /, `${file} uses the shared Brand`)
    assert.doesNotMatch(read('src', 'components', file), /src="\/logo/, `${file} has no hand-made logo image`)
    assert.doesNotMatch(read('src', 'components', file), /by Lemida/, 'the old "by Lemida" line is gone')
  }
})

test('the favicon and the app icons point at the new files', () => {
  const html = read('index.html')
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="\/logo\.svg"/)
  assert.match(html, /icons\/favicon-32\.png/)
  assert.match(html, /rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png"/)
})

test('the generated icons have the right sizes; the apple icon has no transparency; the maskable icon is fully opaque', async () => {
  const sizes = { 'favicon-32.png': 32, 'icon-192.png': 192, 'icon-512.png': 512, 'maskable-512.png': 512, 'apple-touch-icon.png': 180 }
  for (const [file, size] of Object.entries(sizes)) {
    const meta = await sharp(path.join(root, 'public', 'icons', file)).metadata()
    assert.equal(meta.width, size, file)
    assert.equal(meta.height, size, file)
  }
  const apple = await sharp(path.join(root, 'public', 'icons', 'apple-touch-icon.png')).metadata()
  assert.equal(apple.hasAlpha, false, 'no transparency in the apple-touch-icon')
  const maskable = await sharp(path.join(root, 'public', 'icons', 'maskable-512.png')).metadata()
  assert.equal(maskable.hasAlpha, false)
})

test('maskable icon: solid navy everywhere outside the central safe circle (80% of the width), so any crop shows only navy at the edge', async () => {
  const { data, info } = await sharp(path.join(root, 'public', 'icons', 'maskable-512.png')).raw().toBuffer({ resolveWithObject: true })
  const c = info.width / 2
  const safe = info.width * 0.4
  let outside = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) <= safe) continue
      outside += 1
      const i = (y * info.width + x) * info.channels
      assert.ok(Math.abs(data[i] - NAVY[0]) <= 1 && Math.abs(data[i + 1] - NAVY[1]) <= 1 && Math.abs(data[i + 2] - NAVY[2]) <= 1, `pixel ${x},${y} is not navy`)
    }
  }
  assert.ok(outside > 100000)
  // and the medal really is in the middle: the centre pixel is not navy
  const mid = (Math.floor(c) * info.width + Math.floor(c)) * info.channels
  assert.ok(Math.abs(data[mid] - NAVY[0]) > 20 || Math.abs(data[mid + 1] - NAVY[1]) > 20)
})

test('the apple icon is solid navy behind the tile (its corner is navy, not transparent)', async () => {
  const { data, info } = await sharp(path.join(root, 'public', 'icons', 'apple-touch-icon.png')).raw().toBuffer({ resolveWithObject: true })
  assert.equal(info.channels, 3)
  assert.deepEqual([data[0], data[1], data[2]], NAVY)
})
