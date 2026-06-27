import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'

if (!existsSync('public/icons')) {
  await mkdir('public/icons', { recursive: true })
}

// Music note on violet background
function makeSvg(size) {
  const pad = size * 0.18
  const noteSize = size - pad * 2
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#7c3aed"/>
  <g transform="translate(${pad}, ${pad}) scale(${noteSize / 100})">
    <!-- music note -->
    <path d="M35 72 C35 79 27 84 19 81 C11 78 8 70 11 63 C14 56 22 53 30 56 L30 28 L70 18 L70 42 C65 39 57 40 52 45 C47 50 46 58 50 64 C54 70 62 72 68 68"
      fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M30 56 L30 28 L70 18 L70 42"
      fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`
}

for (const size of [192, 512]) {
  const svg = Buffer.from(makeSvg(size))
  await sharp(svg).png().toFile(`public/icons/icon-${size}.png`)
  console.log(`✓ public/icons/icon-${size}.png`)
}

// Apple touch icon (180x180)
const svg180 = Buffer.from(makeSvg(180))
await sharp(svg180).png().toFile('public/apple-touch-icon.png')
console.log('✓ public/apple-touch-icon.png')
