import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { LIFECYCLE_EVENTS, logMatches } from './logRules.js'

const EVENTS = new Set(['round_start', 'round_end', 'prop_gain', 'prop_use', 'win', 'lose', 'client_error'])
const ID = /^[a-zA-Z0-9_-]{8,80}$/
const text = (value, max = 80) => typeof value === 'string' ? value.replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, max) : ''

// Append-only, bounded journal. Only allowlisted fields are written; never request bodies or credentials.
export function createAuditStore(directory) {
  fs.mkdirSync(directory, { recursive: true })
  const files = () => fs.readdirSync(directory).filter(name => /^\d{4}-\d{2}-\d{2}-\d{4}\.jsonl$/.test(name)).sort()
  function prune() {
    const list = files()
    let total = list.reduce((sum, name) => sum + fs.statSync(path.join(directory, name)).size, 0)
    const oldest = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    for (const name of list) {
      if (name.slice(0, 10) >= oldest && total <= 64 * 1024 * 1024) break
      const file = path.join(directory, name)
      total -= fs.statSync(file).size
      fs.unlinkSync(file)
    }
  }
  prune()
  const lifecycleReceipts = new Map()
  for (const name of files()) {
    for (const line of fs.readFileSync(path.join(directory, name), 'utf8').split('\n')) {
      try { const row = JSON.parse(line); if (LIFECYCLE_EVENTS.has(row.event) && row.eventId) lifecycleReceipts.set(`${row.deviceId}:${row.eventId}`, { id: row.id, at: row.at }) } catch { /* Skip partial legacy lines. */ }
    }
  }
  let lastPrune = Date.now()
  function append(event, fields = {}) {
    const receiptKey = LIFECYCLE_EVENTS.has(event) && fields.eventId ? `${fields.deviceId}:${fields.eventId}` : null
    if (receiptKey && lifecycleReceipts.has(receiptKey)) return { id: lifecycleReceipts.get(receiptKey).id }
    const now = new Date().toISOString()
    const day = (fields.at || now).slice(0, 10)
    const today = files().filter(name => name.startsWith(day))
    let index = today.length ? Number(today.at(-1).slice(11, 15)) : 0
    let file = path.join(directory, `${day}-${String(index).padStart(4, '0')}.jsonl`)
    if (fs.existsSync(file) && fs.statSync(file).size >= 2 * 1024 * 1024) {
      index++
      file = path.join(directory, `${day}-${String(index).padStart(4, '0')}.jsonl`)
    }
    const row = { id: crypto.randomUUID(), at: now, event, ...fields }
    const fd = fs.openSync(file, 'a')
    try {
      fs.writeFileSync(fd, JSON.stringify(row) + '\n')
      fs.fsyncSync(fd)
    } finally { fs.closeSync(fd) }
    if (receiptKey) lifecycleReceipts.set(receiptKey, { id: row.id, at: row.at })
    if (Date.now() - lastPrune > 60000) {
      prune(); lastPrune = Date.now()
      for (const [key, receipt] of lifecycleReceipts) if (Date.parse(receipt.at) < Date.now() - 30 * 86400000) lifecycleReceipts.delete(key)
    }
    return row
  }
  async function query(params) {
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50))
    const from = text(params.from, 10)
    const to = text(params.to, 10)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if ((from && !datePattern.test(from)) || (to && !datePattern.test(to))) throw new Error('日期格式错误')
    let before
    if (params.cursor) {
      if (typeof params.cursor !== 'string' || params.cursor.length > 180) throw new Error('分页参数错误')
      before = JSON.parse(Buffer.from(params.cursor, 'base64url').toString())
      if (!Array.isArray(before) || before.length !== 2 || typeof before[0] !== 'string' || typeof before[1] !== 'string') throw new Error('分页参数错误')
    }
    const rows = []
    const compare = (a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)
    for (const name of files().reverse()) {
      if (!Number(params.timezoneOffset) && ((from && name.slice(0, 10) < from) || (to && name.slice(0, 10) > to))) continue
      let content
      try { content = await fs.promises.readFile(path.join(directory, name), 'utf8') } catch (error) { if (error.code === 'ENOENT') continue; throw error }
      for (const line of content.trim().split('\n')) {
        let row
        try { row = JSON.parse(line) } catch { continue }
        if (before && (row.at > before[0] || (row.at === before[0] && row.id >= before[1]))) continue
        if (!logMatches(row, params)) continue
        rows.push(row)
      }
      // Read other segments sharing the same date before truncation, keeping stable timestamp ordering.
      rows.sort(compare)
      if (rows.length > limit && name.slice(0, 10) < rows[limit].at.slice(0, 10)) break
      if (rows.length > limit + 1) rows.length = limit + 1
    }
    rows.sort(compare)
    const items = rows.slice(0, limit)
    const last = items.at(-1)
    return { items, nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify([last.at, last.id])).toString('base64url') : null, retentionDays: 30 }
  }
  return { append, query }
}

export function registerClientRoutes(app, { dataDir, requireAdminAuth, getConfig, getCoupons, getState, getCouponLedger, saveCouponLedger, getTransactions, journal, identity }) {
  const audit = createAuditStore(path.join(dataDir, 'client-logs'))
  const sessions = new Map()
  const rates = new Map()
  const safeAppend = (event, fields) => audit.append(event, fields)
  function rate(req, res, next) {
    const key = req.ip
    const now = Date.now()
    for (const [ip, item] of rates) if (item.until < now) rates.delete(ip)
    const item = rates.get(key) || { until: now + 60000, count: 0 }
    if (++item.count > 600) return res.status(429).json({ error: '请求过于频繁，请稍后重试' })
    rates.set(key, item)
    next()
  }
  function requireSession(req, res, next) {
    const token = req.headers['x-client-token']
    const session = sessions.get(token)
    if (!session || session.expires < Date.now()) {
      sessions.delete(token)
      return res.status(440).json({ error: '客户端在线会话已过期，请重新连接' })
    }
    req.clientSession = session
    next()
  }
  function fields(req) {
    const s = req.clientSession
    return { deviceId: s.deviceId, sessionId: s.id, platform: s.platform, source: s.platform === 'android' ? 'android_app' : s.platform === 'ios' ? 'ios_app' : 'web', version: s.version, ip: text(req.ip, 80), device: text(req.headers['user-agent'], 240) }
  }
  app.use('/api/client', rate)
  // Lifecycle reports grant no game or coupon authority. A persisted event ID
  // makes offline retries safe even after a server restart or an unobserved close.
  app.post('/api/client/lifecycle', (req, res) => {
    const reports = req.body?.reports
    if (!Array.isArray(reports) || reports.length < 1 || reports.length > 20) return res.status(400).json({ error: '启动记录格式无效' })
    const cleanReports = []
    for (const report of reports) {
      if (!report || !ID.test(report.deviceId || '') || !ID.test(report.sessionId || '') || !ID.test(report.eventId || '') ||
        ![report.deviceId, report.sessionId, report.eventId].every(value => typeof value === 'string' && !Object.hasOwn(Object.prototype, value) && value !== '__proto__') ||
        !LIFECYCLE_EVENTS.has(report.event) || !['android', 'ios', 'web'].includes(report.platform)) return res.status(400).json({ error: '启动记录参数无效' })
      const occurred = Date.parse(report.at)
      if (!Number.isFinite(occurred) || occurred > Date.now() + 300000 || occurred < Date.now() - 30 * 86400000) return res.status(400).json({ error: '记录时间无效' })
      const details = {}
      for (const key of ['elapsedMs', 'foregroundMs', 'backgroundMs']) {
        const value = report.details?.[key]
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 30 * 86400000) details[key] = Math.round(value)
      }
      if (['visibility', 'native_state', 'back_button', 'pagehide', 'launch'].includes(report.details?.reason)) details.reason = report.details.reason
      cleanReports.push({ event: report.event, eventId: report.eventId, at: new Date(occurred).toISOString(), deviceId: report.deviceId,
        sessionId: report.sessionId, platform: report.platform, version: text(report.version, 30), source: report.platform === 'android' ? 'android_app' : report.platform === 'ios' ? 'ios_app' : 'web',
        ip: text(req.ip || req.socket.remoteAddress, 80), device: text(req.headers['user-agent'], 240), receivedAt: new Date().toISOString(), details })
    }
    const ids = cleanReports.map(({ event, ...fields }) => safeAppend(event, fields).id)
    res.set('Cache-Control', 'no-store').json({ ok: true, ids })
  })
  app.post('/api/client/session', (req, res) => {
    const { deviceId, platform, version } = req.body || {}
    if (typeof deviceId !== 'string' || !ID.test(deviceId)) return res.status(400).json({ error: '客户端标识无效' })
    const now = Date.now()
    for (const [token, session] of sessions) if (session.expires < now) sessions.delete(token)
    if (sessions.size >= 10000) return res.status(503).json({ error: '在线会话已满' })
    const config = getConfig()
    const coupons = getCoupons()
    const token = crypto.randomBytes(32).toString('hex')
    const session = { id: crypto.randomUUID(), deviceId, platform: text(platform, 20), version: text(version, 30), expires: now + 1800000, events: new Map() }
    safeAppend('session_start', { deviceId, sessionId: session.id, platform: session.platform, source: session.platform === 'android' ? 'android_app' : session.platform === 'ios' ? 'ios_app' : 'web', version: session.version, ip: text(req.ip, 80), device: text(req.headers['user-agent'], 240) })
    sessions.set(token, session)
    res.set('Cache-Control', 'no-store').json({ token, sessionId: session.id, config, coupons, state: getState(), heartbeatMs: 5000 })
  })
  app.post('/api/client/heartbeat', requireSession, (req, res) => {
    req.clientSession.expires = Date.now() + 1800000
    res.set('Cache-Control', 'no-store').json({ ok: true, state: getState() })
  })
  app.get('/api/client/state', requireSession, (_req, res) => res.set('Cache-Control', 'no-store').json({ state: getState() }))
  app.post('/api/client/events', requireSession, (req, res) => {
    const { event, eventId, details = {} } = req.body || {}
    if (typeof eventId !== 'string' || !ID.test(eventId) || !details || typeof details !== 'object' || Array.isArray(details)) return res.status(400).json({ error: '日志格式无效' })
    if (!EVENTS.has(event)) return res.json({ ok: true, ignored: true })
    const session = req.clientSession
    if (session.events.has(eventId)) return res.json({ ok: true, id: session.events.get(eventId) })
    const clean = {}
    for (const key of ['level', 'remaining', 'total', 'count', 'elapsedMs']) {
      const value = details[key]
      if ((typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1000000) || typeof value === 'boolean') clean[key] = value
    }
    for (const key of ['roundId', 'code', 'mode', 'outcome', 'tool', 'source']) if (typeof details[key] === 'string') clean[key] = text(details[key])
    const row = safeAppend(event, { ...fields(req), eventId, details: clean })
    session.events.set(eventId, row.id)
    if (session.events.size > 1000) session.events.delete(session.events.keys().next().value)
    session.expires = Date.now() + 1800000
    res.json({ ok: true, id: row.id })
  })
  function draw(req, res) {
    const { operationId, context } = req.body || {}
    const deviceId = req.clientSession?.deviceId || req.body?.deviceId
    if (typeof deviceId !== 'string' || !ID.test(deviceId) || typeof operationId !== 'string' || !ID.test(operationId) || !['win_1', 'win_2', 'win_3', 'win_4', 'win_5', 'summon'].includes(context)) return res.status(400).json({ error: '抽券参数无效' })
    const ledger = getCouponLedger()
    const list = ledger.coupons
    const id = `online_${deviceId}_${operationId}`
    const operations = ledger.operations
    const existing = list.find(coupon => coupon.id === id)
    if (existing?.ownerId) return res.status(403).json({ error: '请使用个人背包查看此券' })
    if (existing) return res.json({ coupon: existing, list: list.filter(coupon => !coupon.ownerId), state: getState() })
    if (operations[id]) return res.status(409).json({ error: '该奖励操作已处理或已被管理员清空，请刷新存折', state: getState() })
    // Old clients may recover committed receipts, but cannot mint new global
    // coupons from an unverified context string. Gameplay rewards use round credentials.
    return requireAdminAuth(req, res, async () => {
    const config = getConfig()
    const preferGf = crypto.randomInt(100) < config.gfPenaltyRatio
    const preferred = preferGf ? config.girlfriendTasks : config.boyfriendRewards
    const alternate = preferGf ? config.boyfriendRewards : config.girlfriendTasks
    const choices = preferred?.length ? preferred : alternate
    const chosen = choices?.length ? choices[crypto.randomInt(choices.length)] : { title: '甜蜜心愿券', desc: '兑现一个小心愿', icon: '💖', target: 'boyfriend_pays' }
    const coupon = { id, title: chosen.title, desc: chosen.desc, icon: chosen.icon, target: chosen.target, used: false, obtainedAt: context === 'summon' ? '召唤男友救场' : `第 ${context.slice(-1)} 关通关` }
    ledger.transactions ||= []
    journal?.(ledger, 'coupon_gain', { ...(identity?.(req, { ...req.body, deviceId }) || { deviceId }), source: 'admin_web' }, { couponId: id, source: 'legacy_admin_grant', context })
    // Commit the reward and idempotency key in one durable atomic write, including across reset/restart.
    operations[id] = { at: new Date().toISOString() }
    list.unshift(coupon)
    await saveCouponLedger(ledger)
    res.json({ coupon, list: list.filter(coupon => !coupon.ownerId), state: getState() })
    })
  }
  app.post('/api/client/coupons/draw', requireSession, draw)
  app.post('/api/coupons/draw', (req, res, next) => req.headers['x-client-mode'] === 'online' ? requireSession(req, res, next) : next(), draw)
  // Native requests remain bound to a live session even if their local UI state is stale.
  app.use('/api', (req, res, next) => {
    if (!req.headers['x-client-token'] && req.headers['x-client-mode'] !== 'online') return next()
    return requireSession(req, res, next)
  })
  app.get('/api/admin/client-logs', requireAdminAuth, async (req, res) => {
    try {
      const older = await audit.query({ ...req.query, limit: 100 })
      let transactions = getTransactions?.(req.query) || []
      if (req.query.cursor) {
        const [at, id] = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString())
        transactions = transactions.filter(row => row.at < at || (row.at === at && row.id < id))
      }
      const rows = [...older.items, ...transactions].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50)), items = rows.slice(0, limit), last = items.at(-1)
      res.set('Cache-Control', 'no-store').json({ items, retentionDays: 30, nextCursor: last && (rows.length > limit || older.nextCursor) ? Buffer.from(JSON.stringify([last.at, last.id])).toString('base64url') : null })
    } catch (error) { res.status(400).json({ error: error.message === '日期格式错误' || error.message === '分页参数错误' ? error.message : '日志读取失败' }) }
  })
  app.use('/api/client', (err, _req, res, _next) => {
    console.error('Client audit failure:', err.message)
    res.status(503).json({ error: '在线记录暂不可用，请稍后重试' })
  })
  return audit
}
