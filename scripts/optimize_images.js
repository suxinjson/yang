import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const srcDir = path.resolve('img')
const outDir = path.resolve('public/photos')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const fullDir = path.join(outDir, 'full')
if (!fs.existsSync(fullDir)) {
  fs.mkdirSync(fullDir, { recursive: true })
}

async function processImages() {
  console.log('Optimizing images from', srcDir)

  // Mapping of input files to output normalized names
  const mappings = [
    { src: '铁了心爱你.jpg', out: 'iron_heart.jpg', format: 'jpeg' },
    { src: '钢了心爱你.jpg', out: 'steel_heart.jpg', format: 'jpeg' },
    { src: '可爱袜子.png', out: 'sock_meme.png', format: 'png' },
    { src: '生日合照.jpg', out: 'birthday_photo.jpg', format: 'jpeg' },
    { src: '鲜花照.jpg', out: 'flower_photo.jpg', format: 'jpeg' },
    { src: '男友帅照1.jpg', out: 'bf_1.jpg', format: 'jpeg' },
    { src: '男友帅照2.jpg', out: 'bf_2.jpg', format: 'jpeg' },
    { src: '男友帅照3.jpg', out: 'bf_3.jpg', format: 'jpeg' },
    { src: '男友帅照4.jpg', out: 'bf_4.jpg', format: 'jpeg' },
    { src: '男友帅照5.jpg', out: 'bf_5.jpg', format: 'jpeg' },
    { src: '男友帅照6.jpg', out: 'bf_6.jpg', format: 'jpeg' }
  ]

  for (const m of mappings) {
    const srcPath = path.join(srcDir, m.src)
    if (!fs.existsSync(srcPath)) {
      console.warn(`File not found: ${srcPath}`)
      continue
    }

    const outPath = path.join(outDir, m.out)
    const fullPath = path.join(fullDir, m.out)

    // Copy full size to full/
    fs.copyFileSync(srcPath, fullPath)

    // Crop to 240x240 center square
    const instance = sharp(srcPath).resize(240, 240, {
      fit: 'cover',
      position: 'centre'
    })

    if (m.format === 'png') {
      await instance.png({ quality: 90, compressionLevel: 8 }).toFile(outPath)
    } else {
      await instance.jpeg({ quality: 85, progressive: true }).toFile(outPath)
    }

    console.log(`✓ Processed ${m.src} -> ${m.out}`)
  }

  // Set default boyfriend photo to bf_1.jpg
  fs.copyFileSync(path.join(outDir, 'bf_1.jpg'), path.join(outDir, 'boyfriend_photo.jpg'))
  console.log('✓ Default boyfriend_photo.jpg linked to bf_1.jpg')
}

processImages().catch(console.error)
