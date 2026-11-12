import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { defaultPublicConfig } from './shared/defaultConfig.js'
import { fileURLToPath } from 'url'
import { normalizeGameSettings, normalizeCardTextMode } from './shared/gameConfig.js'
import { normalizeBoyfriendSettings } from './shared/boyfriendConfig.js'
import { registerClientRoutes } from './shared/clientAudit.js'
import { registerGameplay } from './shared/gameplayServer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal')
let gameplay
const PORT = process.env.PORT || 3000

app.use(cors())
app.use('/api/client', express.json({ limit: '16kb' }))
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// Data Directory for persistent server storage
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const configFilePath = path.join(dataDir, 'config.json')
const couponsFilePath = path.join(dataDir, 'coupon-ledger.json')
const legacyCouponsPath = path.join(dataDir, 'coupons.json')
const syncEpoch = crypto.randomUUID()
let stateRevision = 0
function getServerState() {
  const config = publicConfig(loadServerConfig())
  return { epoch: syncEpoch, revision: stateRevision, configVersion: crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex'), config, coupons: loadServerCoupons() }
}

const DEFAULT_CONFIG = { ...defaultPublicConfig(), adminPassword: 'admin' }

// Atomic write JSON helper to avoid data corruption
function atomicWriteJson(filePath, data) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`
  try {
    const fd = fs.openSync(tmpPath, 'w')
    try { fs.writeFileSync(fd, JSON.stringify(data, null, 2), 'utf-8'); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
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
    } catch (e) { console.error('Failed to read config file', e); throw e }
  }
  atomicWriteJson(configFilePath, DEFAULT_CONFIG)
  return { ...DEFAULT_CONFIG }
}

function saveServerConfig(cfg) {
  atomicWriteJson(configFilePath, cfg)
  stateRevision++
  gameplay?.broadcastState(getServerState())
}

function loadCouponLedger() {
  if (fs.existsSync(couponsFilePath)) {
    try {
      const ledger = JSON.parse(fs.readFileSync(couponsFilePath, 'utf-8'))
      if (!Array.isArray(ledger.coupons) || !ledger.operations || typeof ledger.operations !== 'object' || Array.isArray(ledger.operations)) throw new Error('Invalid coupons storage')
      return ledger
    } catch (e) { console.error('Failed to read coupons file', e); throw e }
  }
  if (fs.existsSync(legacyCouponsPath)) {
    const coupons = JSON.parse(fs.readFileSync(legacyCouponsPath, 'utf8'))
    if (!Array.isArray(coupons)) throw new Error('Invalid legacy coupons storage')
    const ledger = { coupons, operations: {} }
    atomicWriteJson(couponsFilePath, ledger)
    return ledger
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
  const ledger = { coupons: initCoupons, operations: {}, transactions: initCoupons.map(coupon => ({ id: crypto.randomUUID(), at: new Date().toISOString(),
    event: 'coupon_gain', source: 'server', deviceId: 'server_initialization', details: { couponId: coupon.id, source: 'initial_grant' } })) }
  atomicWriteJson(couponsFilePath, ledger)
  return ledger
}

function loadServerCoupons() { return loadCouponLedger().coupons }
let couponFingerprint
function saveCouponLedger(ledger, notify = true) {
  const previous = couponFingerprint ?? JSON.stringify(loadCouponLedger().coupons)
  atomicWriteJson(couponsFilePath, ledger)
  couponFingerprint = JSON.stringify(ledger.coupons)
  if (previous !== couponFingerprint) {
    stateRevision++
    if (notify) {
      try { gameplay?.broadcastState(getServerState()) }
      catch (error) { console.error('Committed ledger notification failed:', error.message) }
    }
  }
}
function saveServerCoupons(list) {
  saveCouponLedger({ ...loadCouponLedger(), coupons: list })
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
registerClientRoutes(app, {
  dataDir, requireAdminAuth,
  getConfig: () => publicConfig(loadServerConfig()),
  getCoupons: loadServerCoupons,
  saveCoupons: saveServerCoupons,
  getState: getServerState, getCouponLedger: loadCouponLedger, saveCouponLedger,
  getTransactions: params => gameplay?.queryTransactions(params) || [],
  journal: (...args) => gameplay?.journal(...args), identity: (...args) => gameplay?.identity(...args)
})
gameplay = registerGameplay(app, { getConfig: () => publicConfig(loadServerConfig()), getState: getServerState,
  getLedger: loadCouponLedger, saveLedger: saveCouponLedger, requireAdminAuth })
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

// 0. Health Check for CI/CD & Caddy probe
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'ganglegang',
    clientProtocol: 2,
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
  delete publicFields.summonCostEnabled
  publicFields.cardTextMode = normalizeCardTextMode(publicFields.cardTextMode)
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
app.get('/api/state', (req, res) => {
  const etag = `"${syncEpoch}:${stateRevision}"`
  if (req.headers['if-none-match'] === etag) return res.status(304).end()
  res.set('ETag', etag).json({ state: getServerState() })
})

// 3. Save Admin Config (From Web Admin Panel - Protected)
app.post('/api/config', requireAdminAuth, (req, res) => {
  if (req.headers['if-match'] && req.headers['if-match'] !== getServerState().configVersion) return res.status(409).json({ error: '配置已由其他页面更新，请先重新载入配置再保存', state: getServerState() })
  const newConfig = req.body
  if (!newConfig || typeof newConfig !== 'object' || Array.isArray(newConfig)) {
    return res.status(400).json({ error: 'Invalid config' })
  }
  const current = loadServerConfig()
  const allowedKeys = ['cardTextMode', 'bfPhotoIndex', 'couponName', 'gfPenaltyRatio', 'activeCardPhotos', 'customCards', 'girlfriendTasks', 'boyfriendRewards']
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
  if (Object.hasOwn(patch, 'cardTextMode')) patch.cardTextMode = normalizeCardTextMode(patch.cardTextMode)
  const boyfriendPatch = Object.fromEntries(['bfPhotos', 'bfCardEnabled'].filter(key => Object.hasOwn(newConfig, key)).map(key => [key, newConfig[key]]))
  const merged = { ...current, ...patch, ...normalizeBoyfriendSettings({ ...current, ...boyfriendPatch }), gameSettings: Object.hasOwn(newConfig, 'gameSettings') ? normalizeGameSettings(newConfig.gameSettings) : current.gameSettings }
  saveServerConfig(merged)
  res.json({ success: true, config: publicConfig(merged), state: getServerState() })
})

// 4. Get Coupons List
app.get('/api/coupons', (req, res) => {
  const list = loadServerCoupons()
  res.json(list)
})

// 5. Add / Draw New Coupon
app.post('/api/coupons', requireAdminAuth, (req, res) => {
  const coupon = req.body
  if (!coupon || typeof coupon.id !== 'string' || typeof coupon.title !== 'string' || typeof coupon.used !== 'boolean') {
    return res.status(400).json({ error: 'Invalid coupon' })
  }
  const ledger = loadCouponLedger(), list = ledger.coupons
  const existing = list.find(item => item.id === coupon.id)
  if (existing) return res.json({ success: true, list, state: getServerState() })
  const receipt = `legacy_grant_${coupon.id}`
  if (ledger.operations[receipt]) return res.status(409).json({ error: '该发券请求已处理或已作废，请使用新的券编号', state: getServerState() })
  list.unshift(coupon)
  ledger.operations[receipt] = { at: new Date().toISOString() }
  ledger.coupons = list; ledger.transactions ||= []
  gameplay.journal(ledger, 'coupon_gain', { ...gameplay.identity(req, req.body), source: 'admin_web' }, { couponId: coupon.id, source: 'admin_grant' })
  saveCouponLedger(ledger)
  res.json({ success: true, list, state: getServerState() })
})

// 6. Redeem / Mark Coupon Used
app.post('/api/coupons/redeem', (req, res) => {
  const { id, requireUnused } = req.body
  const list = loadServerCoupons()
  const target = list.find(c => c.id === id)
  if (target) {
    if (requireUnused === true && target.used) return res.status(409).json({ success: false, error: 'Coupon already redeemed', state: getServerState() })
    if (!target.used) {
      target.used = true
      target.usedAt = new Date().toISOString()
      const ledger = loadCouponLedger()
      ledger.coupons = list
      ledger.transactions ||= []
      gameplay.journal(ledger, 'coupon_use', gameplay.identity(req, req.body), { couponId: id, purpose: 'redeem' })
      saveCouponLedger(ledger)
    }
    return res.json({ success: true, list, state: getServerState() })
  }
  res.status(404).json({ error: 'Coupon not found' })
})

// 7. Clear All Coupons (Admin only - Protected)
app.post('/api/coupons/reset', requireAdminAuth, (req, res) => {
  const ledger = loadCouponLedger()
  ledger.coupons = []; ledger.transactions ||= []
  gameplay.journal(ledger, 'coupon_reset', { ...gameplay.identity(req, req.body), source: 'admin_web' })
  saveCouponLedger(ledger)
  res.json({ success: true, list: [], state: getServerState() })
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

    res.json({ success: true, path: `/photos/${fileName}`, state: getServerState() })
  } catch (e) {
    console.error('Upload failed', e)
    res.status(500).json({ error: 'Failed to save photo' })
  }
})

// --- Static Files & SPA Fallback ---
// Unknown APIs must never fall through to an HTML page (including an older backend).
app.use('/api', (_req, res) => res.status(404).json({ error: 'API not found' }))
const publicDir = path.join(__dirname, 'public')
const distDir = path.join(__dirname, 'dist')
const persistentPhotosDir = path.join(dataDir, 'photos')

if (!fs.existsSync(persistentPhotosDir)) {
  fs.mkdirSync(persistentPhotosDir, { recursive: true })
}
app.get(/^\/admin\/$/, (_req, res) => res.redirect(308, '../admin'))
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
  console.log(`钢了钢服务已启动，端口 ${PORT}，管理后台 /admin`)
})
gameplay.attach(server)
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  try { gameplay.flush() } catch (error) { console.error('Room checkpoint failed', error.message) }
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 2000).unref()
})
