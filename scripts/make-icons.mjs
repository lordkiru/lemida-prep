// Builds the app icons (public/icons/*.png) from public/logo.svg. Run it again whenever the logo changes: `npm run icons`.
//
//   icon-192.png, icon-512.png   the logo on the dark brand colour, with rounded corners
//   maskable-512.png             the logo small inside a full-bleed square, so phones can crop it to any shape
//   apple-touch-icon.png         180 x 180, full-bleed (iOS rounds the corners itself)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = path.join(root, 'public', 'logo.svg')
const outDir = path.join(root, 'public', 'icons')
const BRAND = '#070D1F'

const specs = [
  { file: 'icon-192.png', size: 192, logo: 0.8, radius: 0.22 },
  { file: 'icon-512.png', size: 512, logo: 0.8, radius: 0.22 },
  { file: 'maskable-512.png', size: 512, logo: 0.62, radius: 0 }, // content stays inside the central safe zone
  { file: 'apple-touch-icon.png', size: 180, logo: 0.74, radius: 0 },
]

fs.mkdirSync(outDir, { recursive: true })
const svg = fs.readFileSync(logoPath)

for (const { file, size, logo, radius } of specs) {
  const logoSize = Math.round(size * logo)
  const logoPng = await sharp(svg, { density: 600 }).resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const layers = [{ input: logoPng, gravity: 'centre' }]
  let image = sharp({ create: { width: size, height: size, channels: 4, background: BRAND } }).composite(layers)
  if (radius > 0) {
    const r = Math.round(size * radius)
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`)
    image = sharp(await image.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }])
  }
  await image.png().toFile(path.join(outDir, file))
  console.log('wrote public/icons/' + file)
}
