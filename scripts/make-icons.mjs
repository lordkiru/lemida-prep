// Builds the app icons (public/icons/*.png) from the two logo files. Run it again whenever a logo changes: `npm run icons`.
//
//   public/logo.svg           the medal on its navy tile            -> favicon, icon-192, icon-512, apple-touch-icon
//   public/logo-no-tile.svg   the medal on its own                  -> maskable-512 (placed on a full square of navy)
//
//   favicon-32.png               32 x 32, the tile with its rounded corners (browsers that cannot use the SVG favicon)
//   icon-192.png, icon-512.png   the tile with its rounded corners, transparent outside them
//   maskable-512.png             the whole square filled with navy; Android crops it to a circle or squircle, so the medal is kept inside the
//                                central safe zone (a circle of 80% of the width) and nothing important can be cut off
//   apple-touch-icon.png         180 x 180, solid navy behind the tile, NO transparency (iOS rounds the corners itself)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const tileSvg = fs.readFileSync(path.join(root, 'public', 'logo.svg'))
const medalSvg = fs.readFileSync(path.join(root, 'public', 'logo-no-tile.svg'))
const outDir = path.join(root, 'public', 'icons')
const NAVY = '#0A1330' // the dark end of the tile's gradient

// How far the medal reaches from the middle of its 64 x 64 box: its farthest edge is the shadow circle (centre 34.7, 33.6; radius 22).
const MEDAL_REACH = Math.hypot(34.7 - 32, 33.6 - 32) + 22 // 25.1 units out of 64
const SAFE_RADIUS = 0.4 // the maskable safe zone: a circle of 80% of the width has a radius of 40% of it
const MASKABLE_SCALE = 0.9 // the medal is drawn at 90% of the square, which keeps a margin inside the safe zone
if ((MEDAL_REACH / 64) * MASKABLE_SCALE > SAFE_RADIUS) throw new Error('the medal would reach outside the maskable safe zone')

const render = (svg, size) => sharp(svg, { density: 600 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()

fs.mkdirSync(outDir, { recursive: true })
const write = async (file, image) => {
  await image.png().toFile(path.join(outDir, file))
  console.log('wrote public/icons/' + file)
}

// the tile itself, at the sizes where it is used as it is
for (const [file, size] of [['favicon-32.png', 32], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await write(file, sharp(await render(tileSvg, size)))
}

// maskable: full-bleed navy, medal in the middle
{
  const size = 512
  const medal = await render(medalSvg, Math.round(size * MASKABLE_SCALE))
  const canvas = sharp({ create: { width: size, height: size, channels: 4, background: NAVY } }).composite([{ input: medal, gravity: 'centre' }])
  await write('maskable-512.png', sharp(await canvas.png().toBuffer()).flatten({ background: NAVY }).removeAlpha())
}

// apple-touch-icon: the tile on solid navy, no alpha channel at all
{
  const size = 180
  await write('apple-touch-icon.png', sharp(await render(tileSvg, size)).flatten({ background: NAVY }).removeAlpha())
}
