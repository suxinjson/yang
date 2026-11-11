import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { defaultGameSettings, normalizeGameSettings } from './shared/gameConfig.js'
import { normalizeBoyfriendSettings } from './shared/boyfriendConfig.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// Data Directory for persistent server storage
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const configFilePath = path.join(dataDir, 'config.json')
const couponsFilePath = path.join(dataDir, 'coupons.json')

// Initial Default Config
const DEFAULT_CONFIG = {
  ...normalizeBoyfriendSettings({}),
  gameSettings: defaultGameSettings(),
  adminPassword: 'admin',
  bfPhotoIndex: 1, // 1 to 6, 0 for random
  couponName: '专属心愿券',
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
      title: '手洗袜子券',
      desc: '帮对方手洗袜子一次，洗完当面夸赞袜子好香！',
      icon: '🧦',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_massage',
      title: '捏肩伺候 15 分钟',
      desc: '为对方进行 15 分钟全身推拿捏肩，态度端正，中途不准喊累！',
      icon: '💆‍♂️',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_drink',
      title: '快乐水 / 奶茶投喂',
      desc: '向对方奉上冰阔乐或奶茶一杯，附带甜蜜微笑和双手奉上！',
      icon: '🥤',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_brother',
      title: '甜甜夸夸三分钟',
      desc: '深情看着对方的眼睛，认真说出对方身上最迷人的三个优点！',
      icon: '🤴',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_housework',
      title: '今晚家务承包卡',
      desc: '主动包揽今晚的洗碗、擦桌子或倒垃圾，让对方舒舒服服休息！',
      icon: '🍽️',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_obey',
      title: '半日听话小跟班',
      desc: '在接下来的半天内，对对方提出的合理要求无条件配合，不得顶嘴！',
      icon: '🫡',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_snack',
      title: '爱心夜宵加餐券',
      desc: '给对方准备一份惊喜小夜宵或者洗切水果，亲手投喂！',
      icon: '🍱',
      target: 'girlfriend_pays'
    },
    {
      id: 'gf_wish',
      title: '甜蜜心愿兑现券',
      desc: '无论对方提出什么合理小心愿，必须无条件配合兑现！',
      icon: '🌟',
      target: 'girlfriend_pays'
    }
  ],
  boyfriendRewards: [
    {
      id: 'bf_milktea',
      title: '全糖奶茶免单券',
      desc: '凭此券任意点一杯最爱喝的奶茶，大杯加料，甜蜜畅饮！',
      icon: '🧋',
      target: 'boyfriend_pays'
    },
    {
      id: 'bf_forgive',
      title: '绝不生气免死金牌',
      desc: '拥有一次无论发生什么对方必须无条件认错并夸夸的特权！',
      icon: '🛡️',
      target: 'boyfriend_pays'
    },
    {
      id: 'bf_dinner',
      title: '大餐任选请客券',
      desc: '今天吃什么由你全权做主，火锅烤肉日料随心挑选！',
      icon: '🥩',
      target: 'boyfriend_pays'
    },
    {
      id: 'bf_massage',
      title: '专属推拿按摩券',
      desc: '享受专属全身推拿按摩 15 分钟，直到你满意为止！',
      icon: '💆‍♀️',
      target: 'boyfriend_pays'
    }
  ]
}

// Atomic write JSON helper to avoid data corruption
function atomicWriteJson(filePath, data) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tmpPath, filePath)
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath) } catch (_) {}
    }
    throw err
  }
}

function loadServerConfig() {
  if (fs.existsSync(configFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'))
      return { ...DEFAULT_CONFIG, ...data, ...normalizeBoyfriendSettings(data), gameSettings: normalizeGameSettings(data?.gameSettings) }
    } catch (e) {
      console.error('Failed to read config file', e)
    }
  }
  atomicWriteJson(configFilePath, DEFAULT_CONFIG)
  return { ...DEFAULT_CONFIG }
}

function saveServerConfig(cfg) {
  atomicWriteJson(configFilePath, cfg)
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
      title: '手洗袜子券',
      desc: '帮对方手洗袜子一次，并夸赞袜子香喷喷！',
      icon: '🧦',
      used: false,
      target: 'girlfriend_pays',
      obtainedAt: '初始心愿'
    },
    {
      id: 'coupon_init_2',
      title: '全糖奶茶免单券',
      desc: '大杯加料全糖奶茶一杯，甜蜜畅饮！',
      icon: '🧋',
      used: false,
      target: 'boyfriend_pays',
      obtainedAt: '初始心愿'
    }
  ]
  atomicWriteJson(couponsFilePath, initCoupons)
  return initCoupons
}

function saveServerCoupons(list) {
  atomicWriteJson(couponsFilePath, list)
}

// Active Admin Session Tokens: token -> expireTimestamp
const adminSessions = new Map()

function generateAdminToken() {
  const token = 'agy_' + crypto.randomBytes(24).toString('hex')
  // Token valid for 7 days
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  adminSessions.set(token, expiresAt)
  return token
}

function verifyAdminToken(token) {
  if (typeof token !== 'string' || !token) return false
  const expiresAt = adminSessions.get(token)
  if (expiresAt && expiresAt > Date.now()) {
    return true
  }
  adminSessions.delete(token)
  return false
}

// Admin authorization middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.headers['x-admin-token']
  if (verifyAdminToken(token)) {
    return next()
  }
  return res.status(401).json({ success: false, error: 'Unauthorized: 管理员身份验证失败或凭据已过期' })
}

// Rate limiting failed attempts
const loginAttempts = new Map()

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

// 1. Admin Login Verification (with rate limiting)
app.post('/api/admin/login', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const attempt = loginAttempts.get(clientIp) || { count: 0, resetTime: now + 60000 }

  if (now > attempt.resetTime) {
    attempt.count = 0
    attempt.resetTime = now + 60000
  }

  if (attempt.count >= 10) {
    return res.status(429).json({ success: false, message: '尝试次数过多，请稍后再试！' })
  }

  const { password } = req.body || {}
  const cfg = loadServerConfig()
  if (password === cfg.adminPassword) {
    loginAttempts.delete(clientIp)
    const token = generateAdminToken()
    res.json({ success: true, token })
  } else {
    attempt.count++
    loginAttempts.set(clientIp, attempt)
    res.status(401).json({ success: false, message: '密码错误！' })
  }
})

// 2. Get Game / Admin Config
function publicConfig(config) {
  const { adminPassword: _password, ...publicFields } = config
  return publicFields
}

app.post('/api/admin/password', requireAdminAuth, (req, res) => {
  const password = req.body?.password
  if (typeof password !== 'string' || password.trim().length < 3 || password.length > 128) {
    return res.status(400).json({ success: false, error: '密码长度应为 3–128 位' })
  }
  const current = loadServerConfig()
  saveServerConfig({ ...current, adminPassword: password })
  adminSessions.clear()
  res.json({ success: true, token: generateAdminToken() })
})

app.get('/api/config', (req, res) => {
  const cfg = loadServerConfig()
  // Calculate active boyfriend photo if 0 (random)
  let selectedIndex = cfg.bfPhotoIndex - 1
  if (cfg.bfPhotoIndex === 0) {
    const rand = Math.floor(Math.random() * 6) + 1
    selectedIndex = rand - 1
  }

  // Return public safe config
  res.json({
    ...publicConfig(cfg),
    activeBfPhoto: cfg.bfPhotos[selectedIndex]?.image || cfg.bfPhotos[0].image
  })
})

// 3. Save Admin Config (From Web Admin Panel - Protected)
app.post('/api/config', requireAdminAuth, (req, res) => {
  const newConfig = req.body
  if (!newConfig || typeof newConfig !== 'object' || Array.isArray(newConfig)) {
    return res.status(400).json({ error: 'Invalid config' })
  }
  const current = loadServerConfig()
  const allowedKeys = ['bfPhotoIndex', 'couponName', 'gfPenaltyRatio', 'summonCostEnabled', 'activeCardPhotos', 'customCards', 'girlfriendTasks', 'boyfriendRewards']
  const patch = Object.fromEntries(allowedKeys.filter(key => Object.hasOwn(newConfig, key)).map(key => [key, newConfig[key]]))
  if (Object.hasOwn(patch, 'customCards') && (!Array.isArray(patch.customCards) || patch.customCards.length < 3 || patch.customCards.some(card => !card || typeof card.id !== 'string' || typeof card.name !== 'string') || new Set(patch.customCards.map(card => card.id)).size !== patch.customCards.length)) {
    return res.status(400).json({ success: false, error: '至少保留三种有效且不重复的卡牌' })
  }
  for (const key of ['girlfriendTasks', 'boyfriendRewards']) {
    if (Object.hasOwn(patch, key) && (!Array.isArray(patch[key]) || patch[key].some(task => !task || typeof task.id !== 'string' || typeof task.title !== 'string'))) {
      return res.status(400).json({ success: false, error: '任务配置格式不正确' })
    }
  }
  if (Object.hasOwn(patch, 'activeCardPhotos') && (!patch.activeCardPhotos || typeof patch.activeCardPhotos !== 'object' || Array.isArray(patch.activeCardPhotos))) {
    return res.status(400).json({ success: false, error: '图片配置格式不正确' })
  }
  if (Object.hasOwn(patch, 'bfPhotoIndex')) patch.bfPhotoIndex = typeof patch.bfPhotoIndex === 'number' && Number.isFinite(patch.bfPhotoIndex) ? Math.max(0, Math.min(6, Math.round(patch.bfPhotoIndex))) : current.bfPhotoIndex
  if (Object.hasOwn(patch, 'gfPenaltyRatio')) patch.gfPenaltyRatio = typeof patch.gfPenaltyRatio === 'number' && Number.isFinite(patch.gfPenaltyRatio) ? Math.max(0, Math.min(100, Math.round(patch.gfPenaltyRatio))) : current.gfPenaltyRatio
  if (Object.hasOwn(patch, 'couponName')) patch.couponName = typeof patch.couponName === 'string' ? patch.couponName.trim().slice(0, 30) || '专属心愿券' : current.couponName
  if (Object.hasOwn(patch, 'summonCostEnabled') && typeof patch.summonCostEnabled !== 'boolean') patch.summonCostEnabled = current.summonCostEnabled
  const boyfriendPatch = Object.fromEntries(['bfPhotos', 'bfCardEnabled'].filter(key => Object.hasOwn(newConfig, key)).map(key => [key, newConfig[key]]))
  const merged = { ...current, ...patch, ...normalizeBoyfriendSettings({ ...current, ...boyfriendPatch }), gameSettings: Object.hasOwn(newConfig, 'gameSettings') ? normalizeGameSettings(newConfig.gameSettings) : current.gameSettings }
  saveServerConfig(merged)
  res.json({ success: true, config: publicConfig(merged) })
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

// 7. Clear All Coupons (Admin only - Protected)
app.post('/api/coupons/reset', requireAdminAuth, (req, res) => {
  saveServerCoupons([])
  res.json({ success: true, list: [] })
})

// 8. Upload Card Photo from Admin (Protected & Sanitized)
app.post('/api/upload', requireAdminAuth, (req, res) => {
  const { cardId, base64 } = req.body
  if (!cardId || !base64) {
    return res.status(400).json({ error: 'Missing cardId or base64' })
  }

  // 严格清洗 cardId 防止目录穿越与非法文件名
  const cleanCardId = String(cardId).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!cleanCardId) {
    return res.status(400).json({ error: 'Invalid cardId' })
  }

  try {
    const matches = base64.match(/^data:image\/([A-Za-z0-9-+.]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' })
    }
    const buffer = Buffer.from(matches[2], 'base64')

    // 根据图片 MIME 判断安全扩展名
    let ext = 'jpg'
    const mime = matches[1].toLowerCase()
    if (mime.includes('png')) ext = 'png'
    else if (mime.includes('webp')) ext = 'webp'
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg'
    else {
      return res.status(400).json({ error: 'Unsupported image type. Only JPG, PNG, and WebP are allowed.' })
    }

    const fileName = `custom_${cleanCardId}_${Date.now()}.${ext}`
    const photoDir = path.join(dataDir, 'photos')
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true })
    }
    const filePath = path.join(photoDir, fileName)
    fs.writeFileSync(filePath, buffer)

    const cfg = loadServerConfig()
    cfg.activeCardPhotos[cleanCardId] = `/photos/${fileName}`
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
const persistentPhotosDir = path.join(dataDir, 'photos')

if (!fs.existsSync(persistentPhotosDir)) {
  fs.mkdirSync(persistentPhotosDir, { recursive: true })
}
app.use('/photos', express.static(persistentPhotosDir))
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

const server = app.listen(PORT, '0.0.0.0', () => {
  if (process.send) process.send({ port: server.address().port })
  console.log(`\n==================================================`)
  console.log(`🚀 《钢了钢》服务已在服务器启动！`)
  console.log(`📱 女朋友安卓端访问: http://0.0.0.0:${PORT}/`)
  console.log(`💻 你的独立管理后台: http://0.0.0.0:${PORT}/?admin`)
  console.log(`==================================================\n`)
})
