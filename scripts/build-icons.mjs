import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const svgPath = path.join(root, 'public', 'favicon.svg')
const outDir = path.join(root, 'build')

const icoSizes = [16, 24, 32, 48, 64, 128, 256]

const macIconset = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
]

async function writePng(size, targetPath) {
  await sharp(svg)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(targetPath)
}

await fs.mkdir(outDir, { recursive: true })
const svg = await fs.readFile(svgPath)

const pngBuffers = await Promise.all(
  icoSizes.map((size) =>
    sharp(svg)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer(),
  ),
)

await fs.writeFile(path.join(outDir, 'icon.ico'), await toIco(pngBuffers))
await writePng(512, path.join(outDir, 'icon.png'))
await writePng(1024, path.join(outDir, 'icon-1024.png'))

if (process.platform === 'darwin') {
  const iconsetDir = path.join(outDir, 'icon.iconset')
  await fs.mkdir(iconsetDir, { recursive: true })
  for (const [name, size] of macIconset) {
    await writePng(size, path.join(iconsetDir, name))
  }
  execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', path.join(outDir, 'icon.icns')], {
    stdio: 'inherit',
  })
  await fs.rm(iconsetDir, { recursive: true, force: true })
  console.log('Generated build/icon.ico, build/icon.png, build/icon.icns from public/favicon.svg')
} else {
  console.log('Generated build/icon.ico and build/icon.png (icon.icns requires macOS iconutil)')
}
