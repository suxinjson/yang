import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// Data Directory for persistent server storage
const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const configFilePath = path.join(dataDir, 'config.json')
const couponsFilePath = path.join(dataDir, 'coupons.json')

// Initial Default Config
const DEFAULT_CONFIG = {
  adminPassword: 'admin',
  bfPhotoIndex: 1, // 1 to 6, 0 for random
  gfPenaltyRatio: 75,
  summonCostEnabled: true,
  activeCardPhotos: {
    iron_heart: '/photos/iron_heart.jpg',
    steel_heart: '/photos/steel_heart.jpg',
    sock_meme: '/photos/sock_meme.png',
    birthday_photo: '/photos/birthday_photo.jpg',
    flower_photo: '/photos/flower_photo.jpg',
    boyfriend_photo: '/photos/bf_1.jpg'
  },
  girlfriendTasks: [
    {
      id: 'gf_sock',
      title: '手洗臭袜子券',
      desc: '给男朋友手洗袜子一次，洗完必须当面夸赞“男朋友的袜子真香”！',
      icon: '🧦',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_massage',
      title: '捏肩伺候 15 分钟',
      desc: '为超帅男友进行 15 分钟全身推拿捏肩，态度要端正，中途不准喊累！',
      icon: '💆‍♂️',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_drink',
      title: '快乐水 / 奶茶进贡',
      desc: '今天由女朋友向男朋友奉上冰阔乐或奶茶一杯，附带甜蜜微笑和双手奉上！',
      icon: '🥤',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_brother',
      title: '甜喊三声好哥哥',
      desc: '深情看着男朋友的眼睛，甜甜地喊三声“好哥哥 / 宇宙第一帅男友”！',
      icon: '🤴',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_housework',
      title: '今晚家务承包卡',
      desc: '主动包揽今晚的洗碗、擦桌子或倒垃圾，让男朋友舒舒服服休息！',
      icon: '🍽️',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_obey',
      title: '半日听话小跟班',
      desc: '在接下来的半天内，对男朋友提出的合理要求无条件服从，不得顶嘴！',
      icon: '🫡',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_snack',
      title: '爱心夜宵加餐券',
      desc: '今晚给男朋友准备一份惊喜小夜宵或者洗切水果，亲手投喂！',
      icon: '🍱',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_wish',
      title: '男友心愿兑现券',
      desc: '无论男朋友提出什么合理小心愿，女朋友必须无条件配合兑现！',
      icon: '🌟',
      target: 'girlfriend_pays'
    }
  ],
  boyfriendRewards: [
    {
      id: 'bf_milktea',
      title: '全糖奶茶免单券',
      desc: '凭此券向男朋友任意点一杯最爱喝的奶茶，大杯加料，立即买单！',
      icon: '🧋',
      target: 'boyfriend_pays'
    },
    {
      id: 'bf_forgive',
      title: '绝不生气免死金牌',
      desc: '拥有一次无论发生什么男朋友必须无条件认错并夸夸的特权！',
      icon: '🛡️',
      target: 'boyfriend_pays'
    },
    {
      id: 'bf_dinner',
      title: '大餐任选请客券',
      desc: '今天吃什么由你全权做主，火锅烤肉日料随心挑，男友买单！',
      icon: '🥩',
      target: 'boyfriend_pays'
    },
    {
      id: 'bf_massage',
      title: '男友推拿按摩券',
      desc: '享受专属男友力推拿按摩 15 分钟，直到你满意为止！',
      icon: '💆‍♀️',
      target: 'boyfriend_pays'
    }
  ]
}

function loadServerConfig() {
  if (fs.existsSync(configFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'))
      return { ...DEFAULT_CONFIG, ...data }
    } catch (e) {
      console.error('Failed to read config file', e)
    }
  }
  fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2))
  return { ...DEFAULT_CONFIG }
}

function saveServerConfig(cfg) {
  fs.writeFileSync(configFilePath, JSON.stringify(cfg, null, 2))
}

function loadServerCoupons() {
  if (fs.existsSync(couponsFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(couponsFilePath, 'utf-8'))
    } catch (e) {
      console.error('Failed to read coupons file', e)
    }
  }
  const initCoupons = [
    {
      id: 'coupon_init_1',
      title: '手洗臭袜子券',
      desc: '给男朋友手洗袜子一次，并夸赞袜子香喷喷！',
      icon: '🧦',
      used: false,
      target: 'girlfriend_pays',
      obtainedAt: '情侣初始契约'
    },
    {
      id: 'coupon_init_2',
      title: '全糖奶茶免单券',
      desc: '男友请客喝大杯奶茶，立即买单！',
      icon: '🧋',
      used: false,
      target: 'boyfriend_pays',
      obtainedAt: '情侣初始契约'
    }
  ]
  fs.writeFileSync(couponsFilePath, JSON.stringify(initCoupons, null, 2))
  return initCoupons
}

function saveServerCoupons(list) {
  fs.writeFileSync(couponsFilePath, JSON.stringify(list, null, 2))
}

// --- API Endpoints ---

// 0. Health Check for CI/CD & Caddy probe
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'ganglegang',
    timestamp: Date.now(),
    uptime: process.uptime()
  })
})

// 1. Admin Login Verification
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body
  const cfg = loadServerConfig()
  if (password === cfg.adminPassword) {
    res.json({ success: true, token: 'auth_' + Date.now() })
  } else {
    res.status(401).json({ success: false, message: '密码错误！' })
  }
})

// 2. Get Game / Admin Config
app.get('/api/config', (req, res) => {
  const cfg = loadServerConfig()
  // Calculate active boyfriend photo if 0 (random)
  let activeBf = `/photos/bf_${cfg.bfPhotoIndex}.jpg`
  if (cfg.bfPhotoIndex === 0) {
    const rand = Math.floor(Math.random() * 6) + 1
    activeBf = `/photos/bf_${rand}.jpg`
  }

  // Return public safe config
  res.json({
    ...cfg,
    activeBfPhoto: activeBf
  })
})

// 3. Save Admin Config (From Web Admin Panel)
app.post('/api/config', (req, res) => {
  const newConfig = req.body
  if (!newConfig) {
    return res.status(400).json({ error: 'Invalid config' })
  }
  const current = loadServerConfig()
  const merged = { ...current, ...newConfig }
  saveServerConfig(merged)
  res.json({ success: true, config: merged })
})

// 4. Get Coupons List
app.get('/api/coupons', (req, res) => {
  const list = loadServerCoupons()
  res.json(list)
})

// 5. Add / Draw New Coupon
app.post('/api/coupons', (req, res) => {
  const coupon = req.body
  if (!coupon || !coupon.title) {
    return res.status(400).json({ error: 'Invalid coupon' })
  }
  const list = loadServerCoupons()
  list.unshift(coupon)
  saveServerCoupons(list)
  res.json({ success: true, list })
})

// 6. Redeem / Mark Coupon Used
app.post('/api/coupons/redeem', (req, res) => {
  const { id } = req.body
  const list = loadServerCoupons()
  const target = list.find(c => c.id === id)
  if (target) {
    target.used = true
    saveServerCoupons(list)
    return res.json({ success: true, list })
  }
  res.status(404).json({ error: 'Coupon not found' })
})

// 7. Clear All Coupons (Admin only)
app.post('/api/coupons/reset', (req, res) => {
  saveServerCoupons([])
  res.json({ success: true, list: [] })
})

// 8. Upload Card Photo from Admin
app.post('/api/upload', (req, res) => {
  const { cardId, base64 } = req.body
  if (!cardId || !base64) {
    return res.status(400).json({ error: 'Missing cardId or base64' })
  }

  try {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 format' })
    }
    const buffer = Buffer.from(matches[2], 'base64')
    const fileName = `custom_${cardId}_${Date.now()}.jpg`
    const photoDir = path.join(__dirname, 'public', 'photos')
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true })
    }
    const filePath = path.join(photoDir, fileName)
    fs.writeFileSync(filePath, buffer)

    const cfg = loadServerConfig()
    cfg.activeCardPhotos[cardId] = `/photos/${fileName}`
    saveServerConfig(cfg)

    res.json({ success: true, path: `/photos/${fileName}` })
  } catch (e) {
    console.error('Upload failed', e)
    res.status(500).json({ error: 'Failed to save photo' })
  }
})

// --- Static Files & SPA Fallback ---
const publicDir = path.join(__dirname, 'public')
const distDir = path.join(__dirname, 'dist')

app.use(express.static(publicDir))
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
}

// SPA fallback for HTML5 routing & direct URL visit
app.use((req, res) => {
  const indexHtml = path.join(distDir, 'index.html')
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml)
  } else {
    res.sendFile(path.join(__dirname, 'index.html'))
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`)
  console.log(`🚀 《钢了钢》服务已在服务器启动！`)
  console.log(`📱 女朋友安卓端访问: http://0.0.0.0:${PORT}/`)
  console.log(`💻 你的独立管理后台: http://0.0.0.0:${PORT}/?admin`)
  console.log(`==================================================\n`)
})
