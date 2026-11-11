import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../android/app/src/main/res/', import.meta.url)
const svg = await readFile(new URL('../public/favicon.svg', import.meta.url))
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const icon = await sharp(svg).resize(size, size).flatten({ background: '#FFF0F5' }).png().toBuffer()
  await writeFile(new URL(`mipmap-${density}/ic_launcher.png`, root), icon)
  await writeFile(new URL(`mipmap-${density}/ic_launcher_round.png`, root), icon)
  // Keep the complete shield inside Android's adaptive icon safe zone.
  const foregroundSize = Math.round(size * 2.25)
  const mark = await sharp(svg).resize(size, size).png().toBuffer()
  await sharp({ create: { width: foregroundSize, height: foregroundSize, channels: 4, background: '#00000000' } })
    .composite([{ input: mark, gravity: 'centre' }]).png()
    .toFile(fileURLToPath(new URL(`mipmap-${density}/ic_launcher_foreground.png`, root)))
}
