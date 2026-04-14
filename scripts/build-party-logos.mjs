/**
 * Generates simple PNG badges (abbreviation on party color) into apps/web/public/party-logos/.
 * Replace with official vector/raster assets later if needed; avoids trademark copies in-repo.
 *
 * Run: node scripts/build-party-logos.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'apps', 'web', 'public', 'party-logos')

function textFill(bgHex) {
  const h = bgHex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.65 ? '#111111' : '#ffffff'
}

/** @type {{ code: string; color: string }[]} */
const parties = [
  { code: 'PSD', color: '#E60012' },
  { code: 'AUR', color: '#D4AF37' },
  { code: 'PNL', color: '#FF9A1A' },
  { code: 'USR', color: '#0066CC' },
  { code: 'UDMR', color: '#008000' },
  { code: 'SOS', color: '#6B2D8B' },
  { code: 'POT', color: '#00A8B5' },
  { code: 'IND', color: '#696969' },
  { code: 'MIN', color: '#808080' },
  { code: 'FD', color: '#4169E1' },
  { code: 'PRO', color: '#DC143C' },
  { code: 'PMP', color: '#FF4500' },
  { code: 'PACE', color: '#228B22' },
]

function svgFor(code, bg) {
  const fg = textFill(bg)
  const fs = code.length >= 4 ? 22 : 28
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="20" fill="${bg}"/>
  <text x="64" y="80" font-family="Segoe UI,Arial,sans-serif" font-weight="700" font-size="${fs}" fill="${fg}" text-anchor="middle">${code}</text>
</svg>`
}

await mkdir(outDir, { recursive: true })

for (const p of parties) {
  const file = join(outDir, `${p.code}.png`)
  await sharp(Buffer.from(svgFor(p.code, p.color))).png().toFile(file)
  console.log('wrote', file)
}

console.log('Done:', parties.length, 'PNGs')
