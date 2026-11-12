import crypto from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import { createGame, applyGameAction, settleGame, INITIAL_TOOLS } from './gameEngine.js'

const ID = /^[a-zA-Z0-9_-]{8,100}$/
const validId = value => typeof value === 'string' && ID.test(value) && !Object.hasOwn(Object.prototype, value) && value !== '__proto__'
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const clean = (value, max = 160) => typeof value === 'string' ? value.replace(/[\x00-\x1f]/g, ' ').slice(0, max) : ''
const fail = (message, status = 400) => Object.assign(new Error(message), { status })

// Runs in one Node process. Each money/inventory operation and its journal rows
// are committed in the same atomic ledger write, before acknowledging clients.
export function registerGameplay(app, services) {
  const { getConfig, getState, getLedger, saveLedger, requireAdminAuth } = services
  const rooms = new Map(), timers = new Map(), rates = new Map(), joinRates = new Map()
  const sockets = new Set()
  let checkpoint
  const epoch = crypto.randomUUID()
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })
  function ledger() {
    const value = getLedger()
    value.rounds ||= {}; value.rooms ||= {}; value.transactions ||= []
    return value
  }
  function identity(req, supplied = {}) {
    return { deviceId: validId(supplied.deviceId) ? supplied.deviceId : 'unknown_device', ip: clean(req.ip || req.socket.remoteAddress, 80),
      device: clean(req.headers['user-agent'], 240), platform: clean(supplied.platform || 'web', 20), version: clean(supplied.version, 30),
      source: supplied.platform === 'android' ? 'android_app' : supplied.platform === 'ios' ? 'ios_app' : 'web' }
  }
  function journal(value, event, actor, details = {}) {
    value.transactions.push({ id: crypto.randomUUID(), at: new Date().toISOString(), event, ...actor, details })
    const oldest = Date.now() - 30 * 86400000
    value.transactions = value.transactions.filter(row => Date.parse(row.at) >= oldest).slice(-10000)
  }
  function compactRound(round) {
    round.game.cards = []; round.game.defs = []; round.game.profile = { name: '', image: '' }
  }
  function commit(value) {
    const cutoff = Date.now() - 30 * 86400000
    for (const [id, round] of Object.entries(value.rounds)) if (round.game.startedAt < cutoff) delete value.rounds[id]
    saveLedger(value)
  }
  function authorizeRound(value, req) {
    const id = req.body?.roundId
    const round = typeof id === 'string' && Object.hasOwn(value.rounds, id) ? value.rounds[id] : null
    if (!round || !validToken(req.body?.token) || round.token !== req.body.token) throw fail('关卡凭证已失效，请重开本关', 403)
    return round
  }
  function randomCoupon(value, source, key, actor) {
    const existing = value.coupons.find(coupon => coupon.id === key)
    if (existing || value.operations[key]) return existing?.id || key
    const config = getConfig(), preferGf = crypto.randomInt(100) < config.gfPenaltyRatio
    const preferred = preferGf ? config.girlfriendTasks : config.boyfriendRewards
    const alternate = preferGf ? config.boyfriendRewards : config.girlfriendTasks
    const pool = preferred?.length ? preferred : alternate
    const chosen = pool?.length ? pool[crypto.randomInt(pool.length)] : { title: '甜蜜心愿券', desc: '兑现一个小心愿', icon: '💖', target: 'boyfriend_pays' }
    value.coupons.unshift({ ...chosen, id: key, used: false, obtainedAt: `第 ${source.level} 关通关`, obtainedTime: new Date().toISOString(), roundId: source.roundId })
    value.operations[key] = { at: new Date().toISOString() }
    journal(value, 'coupon_gain', actor, { couponId: key, roundId: source.roundId, level: source.level, mode: source.mode || 'couple' })
    return key
  }
  function spendCoupon(value, id, actor, purpose, roundId) {
    const coupon = value.coupons.find(coupon => coupon.id === id)
    if (!coupon || coupon.used) throw fail('这张券已使用或已被清空，请选择其他心愿券', 409)
    coupon.used = true; coupon.usedAt = new Date().toISOString(); coupon.usedFor = purpose
    journal(value, 'coupon_use', actor, { couponId: id, purpose, roundId })
  }
  function roundEvents(value, game, actor, mode) {
    journal(value, 'round_start', actor, { roundId: game.roundId, level: game.level, total: game.cards.length, mode })
    journal(value, 'prop_gain', actor, { roundId: game.roundId, level: game.level, mode, items: { ...INITIAL_TOOLS }, source: 'round_start' })
  }
  function rate(req, res, next) {
    const key = req.ip, now = Date.now(), item = rates.get(key) || { until: now + 60000, count: 0 }
    if (now > item.until) { item.until = now + 60000; item.count = 0 }
    if (++item.count > 120) return res.status(429).json({ error: '操作较频繁，请稍后重试' })
    rates.set(key, item)
    if (rates.size > 10000) for (const [key, item] of rates) if (item.until < now) rates.delete(key)
    next()
  }
  const route = handler => (req, res) => { try { handler(req, res) } catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : '保存暂不可用，请重试' }) } }
  app.use('/api/play', rate)
  app.post('/api/play/solo/start', route((req, res) => {
    const { operationId, level = 1 } = req.body || {}
    if (!validId(operationId) || !validId(req.body.deviceId) || !Number.isInteger(level) || level < 1 || level > getConfig().gameSettings.levels.length) throw fail('关卡参数无效')
    const value = ledger(), actor = identity(req, req.body)
    const id = `solo_${actor.deviceId}_${operationId}`
    if (!value.rounds[id] && value.operations[`start_${id}`]) throw fail('该开局请求已过期，请重新开始', 409)
    if (!value.rounds[id]) {
      // Keep finished rounds for retry receipts. Limit abandoned solo state growth.
      const active = Object.values(value.rounds).filter(round => round.actor.deviceId === actor.deviceId && !round.finished)
      for (const round of active) {
        round.finished = 'abandoned'
        journal(value, 'round_end', round.actor, { roundId: round.game.roundId, level: round.game.level, mode: 'solo', outcome: 'restart', elapsedMs: Date.now() - round.game.startedAt })
        compactRound(round)
      }
      const game = createGame(getConfig(), level, id)
      value.rounds[id] = { token: crypto.randomBytes(32).toString('hex'), game, actor, finished: false, operations: {} }
      value.operations[`start_${id}`] = { at: new Date().toISOString() }
      roundEvents(value, game, actor, 'solo')
      commit(value)
    }
    const round = value.rounds[id]
    if (round.finished) throw fail('该关卡已经结束，请重新开始', 409)
    res.json({ game: round.game, token: round.token, state: getState(), serverNow: Date.now() })
  }))
  app.post('/api/play/solo/tool', route((req, res) => {
    const value = ledger(), round = authorizeRound(value, req), { operationId, tool } = req.body
    if (!validId(operationId) || !['hint', 'rescue'].includes(tool)) throw fail('道具参数无效')
    if (round.operations[operationId]) {
      if (round.operations[operationId].tool !== tool) throw fail('操作编号重复', 409)
    } else {
      if (round.finished || round.game.tools[tool] <= 0) throw fail('道具已用完或关卡已结束', 409)
      round.game.tools[tool]--
      round.operations[operationId] = { tool }
      journal(value, 'prop_use', round.actor, { roundId: round.game.roundId, level: round.game.level, mode: 'solo', tool, remaining: round.game.tools[tool], elapsedMs: Date.now() - round.game.startedAt })
      commit(value)
    }
    res.json({ tools: round.game.tools, operationId })
  }))
  app.post('/api/play/solo/sync', route((req, res) => {
    const round = authorizeRound(ledger(), req)
    res.json({ tools: round.game.tools, finished: round.finished })
  }))
  app.post('/api/play/solo/blocked', route((req, res) => {
    const value = ledger(), round = authorizeRound(value, req)
    if (!round.blocked) {
      round.blocked = true
      journal(value, 'round_blocked', round.actor, { roundId: round.game.roundId, level: round.game.level, mode: 'solo', elapsedMs: Date.now() - round.game.startedAt })
      commit(value)
    }
    res.json({ ok: true })
  }))
  app.post('/api/play/solo/finish', route((req, res) => {
    const value = ledger(), round = authorizeRound(value, req), { outcome } = req.body
    if (!['won', 'lost', 'abandoned'].includes(outcome)) throw fail('结果参数无效')
    if (!round.finished) {
      round.finished = outcome
      if (outcome === 'won') round.game.rewardId = randomCoupon(value, { ...round.game, mode: 'solo' }, `reward_${round.game.roundId}`, round.actor)
      journal(value, 'round_end', round.actor, { roundId: round.game.roundId, level: round.game.level, mode: 'solo', outcome, elapsedMs: Date.now() - round.game.startedAt })
      compactRound(round)
      commit(value)
    } else if (round.finished !== outcome) throw fail('本关结果已经确认', 409)
    res.json({ rewardId: round.game.rewardId, state: getState() })
  }))
  app.post('/api/play/solo/unlock', route((req, res) => {
    const value = ledger(), round = authorizeRound(value, req), { operationId, couponId } = req.body
    if (!validId(operationId)) throw fail('操作编号无效')
    if (!round.operations[operationId]) {
      if (round.finished || round.game.unlocked >= round.game.settings.maxSlots || round.game.settings.slotUnlockCondition !== 'love_coupon') throw fail('当前不能使用券扩容', 409)
      spendCoupon(value, couponId, round.actor, 'slot_unlock', round.game.roundId)
      round.game.unlocked++
      round.operations[operationId] = { tool: 'unlock', couponId }
      commit(value)
    } else if (round.operations[operationId].tool !== 'unlock' || round.operations[operationId].couponId !== couponId) throw fail('操作编号重复', 409)
    res.json({ operationId, state: getState() })
  }))
  app.post('/api/play/coupons/redeem', route((req, res) => {
    const { operationId, couponId } = req.body || {}
    if (!validId(operationId) || typeof couponId !== 'string') throw fail('兑现参数无效')
    const value = ledger(), key = `redeem_${operationId}`
    if (!value.operations[key]) {
      spendCoupon(value, couponId, identity(req, req.body), 'redeem', '')
      value.operations[key] = { couponId, at: new Date().toISOString() }
      commit(value)
    } else if (value.operations[key].couponId !== couponId) throw fail('操作编号重复', 409)
    res.json({ state: getState() })
  }))

  function getRoom(id) {
    if (!validId(id)) return null
    if (rooms.has(id)) return rooms.get(id)
    const saved = ledger().rooms[id]
    if (saved && saved.expiresAt > Date.now()) { rooms.set(id, saved); return saved }
    return null
  }
  function authRoom(id, token) {
    const room = getRoom(id)
    if (!room || !validToken(token) || room.expiresAt < Date.now() || !room.members.some(member => member.token === token)) throw fail('房间已过期或凭证无效', 403)
    return room
  }
  function roomInfo(room) {
    return { id: room.id, code: room.code, revision: room.revision, epoch, members: room.members.length,
      connected: new Set([...sockets].filter(socket => socket.roomId === room.id && socket.readyState === WebSocket.OPEN).map(socket => socket.memberToken)).size,
      expiresAt: room.expiresAt }
  }
  function persistRoom(value, room) { value.rooms[room.id] = room; commit(value) }
  function send(socket, message) {
    if (socket.readyState !== WebSocket.OPEN) return
    if (socket.bufferedAmount > 256 * 1024) { socket.close(1013, 'Please reconnect'); return }
    // A failed acknowledgement must never turn a committed operation into a rejection.
    try { socket.send(JSON.stringify(message), error => { if (error) socket.terminate() }) }
    catch { socket.terminate() }
  }
  function snapshot(socket, room, extra = {}) { send(socket, { type: 'snapshot', room: roomInfo(room), game: room.game, serverNow: Date.now(), ...extra }) }
  function copyRoom(room) {
    const game = room.game
    return { ...room, operations: { ...room.operations }, game: { ...game, cards: game.cards.map(card => ({ ...card })),
      slots: [...game.slots], staged: [...game.staged], eliminating: [...game.eliminating], hinted: [...game.hinted], applied: [...game.applied], tools: { ...game.tools } } }
  }
  function publish(room, before, ack) {
    const changed = {}
    if (!before || before.roundId !== room.game.roundId) {
      for (const socket of sockets) if (socket.roomId === room.id) snapshot(socket, room, { ack })
      return
    }
    for (const key of Object.keys(room.game)) if (key !== 'cards' && before[key] !== room.game[key] && JSON.stringify(before[key]) !== JSON.stringify(room.game[key])) changed[key] = room.game[key]
    const oldCards = new Map(before.cards.map(card => [card.id, card]))
    changed.cardsChanged = room.game.cards.filter(card => JSON.stringify(oldCards.get(card.id)) !== JSON.stringify(card))
    for (const socket of sockets) if (socket.roomId === room.id) send(socket, { type: 'patch', baseRevision: room.revision - 1, room: roomInfo(room), patch: changed, ack, serverNow: Date.now() })
  }
  function scheduleCheckpoint() {
    if (checkpoint) return
    checkpoint = setTimeout(() => {
      checkpoint = undefined
      try { const value = ledger(); for (const [id, room] of rooms) value.rooms[id] = room; saveLedger(value, false) }
      catch { for (const socket of sockets) send(socket, { type: 'error', error: '同步保存暂不可用，请稍后重连' }) }
    }, 1000)
    checkpoint.unref()
  }
  function finishRoom(value, room, actor) {
    if (room.game.phase === 'won' && !room.game.rewardId) {
      room.game.rewardId = randomCoupon(value, room.game, `reward_${room.game.roundId}`, actor)
      journal(value, 'round_end', actor, { roundId: room.game.roundId, level: room.game.level, mode: 'couple', outcome: 'won', elapsedMs: Date.now() - room.game.startedAt })
    }
  }
  function scheduleSettle(room) {
    if (!room.game.resolveAt || timers.has(room.id)) return
    const timer = setTimeout(() => {
      timers.delete(room.id)
      const current = rooms.get(room.id)
      if (!current || current.game.roundId !== room.game.roundId) return
      room = current
      const before = room.game, next = copyRoom(room)
      try {
        if (!settleGame(next.game)) { scheduleSettle(room); return }
        next.revision++
        if (next.game.phase === 'won') { const value = ledger(); finishRoom(value, next, next.members[0].actor); persistRoom(value, next) }
        rooms.set(room.id, next); publish(next, before); scheduleCheckpoint()
      } catch { for (const socket of sockets) if (socket.roomId === room.id) send(socket, { type: 'error', error: '通关保存失败，请重新连接重试' }) }
    }, Math.max(0, room.game.resolveAt - Date.now()))
    timer.unref(); timers.set(room.id, timer)
  }
  function roomResponse(res, room, token) {
    res.json({ room: roomInfo(room), token, game: room.game, state: getState(), serverNow: Date.now() })
  }
  function entryReceipt(req, value, kind) {
    const { operationId, claimToken, deviceId, code } = req.body || {}
    if (!validId(deviceId)) throw fail('设备标识无效')
    // Legacy clients may omit both fields. New clients persist a random secret
    // before sending, so a lost response can recover a seat without trusting device IDs.
    if (operationId === undefined && claimToken === undefined) return null
    if (!validId(operationId) || !validToken(claimToken)) throw fail('房间请求凭证无效')
    const key = `entry_${operationId}`, claimHash = crypto.createHash('sha256').update(claimToken).digest('hex')
    const fingerprint = JSON.stringify([kind, deviceId, code || '', claimHash])
    const existing = value.operations[key]
    if (existing && existing.fingerprint !== fingerprint) throw fail('房间请求凭证不匹配', 409)
    return { key, fingerprint, existing }
  }
  function retryEntry(res, receipt) {
    if (!receipt?.existing) return false
    const room = authRoom(receipt.existing.roomId, receipt.existing.token)
    roomResponse(res, room, receipt.existing.token)
    return true
  }
  function saveEntry(value, receipt, room, token) {
    if (receipt) value.operations[receipt.key] = { fingerprint: receipt.fingerprint, roomId: room.id, token, at: new Date().toISOString() }
  }
  app.post('/api/play/rooms', route((req, res) => {
    if (!validId(req.body?.deviceId)) throw fail('设备标识无效')
    const value = ledger(), actor = identity(req, req.body)
    const receipt = entryReceipt(req, value, 'create')
    if (retryEntry(res, receipt)) return
    for (const [id, room] of Object.entries(value.rooms)) if (room.expiresAt < Date.now()) { delete value.rooms[id]; rooms.delete(id) }
    if (Object.keys(value.rooms).length >= 1000) throw fail('房间已满，请稍后重试', 503)
    const used = new Set(Object.values(value.rooms).map(room => room.code))
    let code; do { code = String(crypto.randomInt(0, 10000)).padStart(4, '0') } while (used.has(code))
    const token = crypto.randomBytes(32).toString('hex'), id = crypto.randomUUID()
    const game = createGame(getConfig())
    const room = { id, code, revision: 0, expiresAt: Date.now() + 24 * 3600000, members: [{ token, actor }], game, operations: {} }
    roundEvents(value, game, actor, 'couple'); journal(value, 'room_create', actor, { roomId: id })
    saveEntry(value, receipt, room, token)
    persistRoom(value, room); rooms.set(id, room)
    roomResponse(res, room, token)
  }))
  app.post('/api/play/rooms/join', route((req, res) => {
    const value = ledger(), receipt = entryReceipt(req, value, 'join')
    if (retryEntry(res, receipt)) return
    const now = Date.now(), attempt = joinRates.get(req.ip) || { until: now + 60000, count: 0 }
    if (attempt.until < now) { attempt.until = now + 60000; attempt.count = 0 }
    joinRates.set(req.ip, attempt)
    if (++attempt.count > 10) throw fail('密码尝试过于频繁，请一分钟后重试', 429)
    if (joinRates.size > 10000) for (const [ip, entry] of joinRates) if (entry.until < now) joinRates.delete(ip)
    const { code, deviceId } = req.body || {}
    if (typeof code !== 'string' || !/^\d{4}$/.test(code) || !validId(deviceId)) throw fail('请输入四位房间密码')
    const saved = Object.values(value.rooms).find(room => room.code === code && room.expiresAt > Date.now())
    if (!saved) throw fail('房间不存在或已过期', 404)
    const room = structuredClone(getRoom(saved.id)), actor = identity(req, req.body)
    // A saved membership token is required to reconnect. A device ID is never a credential.
    if (room.members.length >= 2) throw fail('房间已满，两人可使用原页面重新连接', 409)
    const token = crypto.randomBytes(32).toString('hex')
    room.members.push({ token, actor }); room.revision++
    saveEntry(value, receipt, room, token)
    journal(value, 'room_join', actor, { roomId: room.id }); persistRoom(value, room); rooms.set(room.id, room)
    for (const socket of sockets) if (socket.roomId === room.id) snapshot(socket, room)
    roomResponse(res, room, token)
  }))
  app.post('/api/play/rooms/resume', route((req, res) => {
    const room = authRoom(req.body?.roomId, req.body?.token)
    scheduleSettle(room)
    res.json({ room: roomInfo(room), token: req.body.token, game: room.game, state: getState(), serverNow: Date.now() })
  }))

  function command(socket, message) {
    if (socket.superseded) throw fail('该连接已由新页面接管', 409)
    const room = authRoom(socket.roomId, socket.memberToken)
    const { operationId, revision, action, roundId } = message
    if (!validId(operationId) || !action || typeof action.type !== 'string') throw fail('操作参数无效')
    if (room.operations[operationId]) { snapshot(socket, room, { ack: operationId }); return }
    // Independent picks can safely serialize against the latest board. Destructive
    // and inventory actions require the revision the player actually saw.
    const canRebase = ['pick', 'return', 'open_coupons', 'close_modal', 'filter_coupons'].includes(action.type)
    if (!Number.isSafeInteger(revision) || revision > room.revision || (revision !== room.revision && !canRebase) || roundId !== room.game.roundId) { snapshot(socket, room, { rejected: operationId, error: '对方刚刚操作，已同步最新棋盘，请重试' }); return }
    const actor = room.members.find(member => member.token === socket.memberToken).actor
    const next = copyRoom(room), before = room.game
    let value
    if (['restart', 'next'].includes(action.type)) {
      if (action.type === 'next' && room.game.phase !== 'won') throw fail('通关后才能进入下一关')
      value = ledger()
      if (room.game.phase !== 'won') journal(value, 'round_end', actor, { roundId, level: room.game.level, mode: 'couple', outcome: 'restart', elapsedMs: Date.now() - room.game.startedAt })
      const level = action.type === 'next' ? room.game.level % room.game.settings.levels.length + 1 : room.game.level
      next.game = createGame(getConfig(), level)
      roundEvents(value, next.game, actor, 'couple')
    } else {
      const verifiedAction = { type: action.type, cardId: action.cardId, tab: action.tab }
      if (action.type === 'unlock' && next.game.settings.slotUnlockCondition === 'love_coupon') {
        value = ledger(); spendCoupon(value, action.couponId, actor, 'slot_unlock', roundId); verifiedAction.couponConfirmed = true
      }
      applyGameAction(next.game, verifiedAction)
      if (['hint', 'rescue'].includes(action.type)) {
        value ||= ledger()
        journal(value, 'prop_use', actor, { roundId, mode: 'couple', level: room.game.level, tool: action.type, remaining: next.game.tools[action.type], elapsedMs: Date.now() - room.game.startedAt })
      }
      if (next.game.phase === 'lost' && before.phase !== 'lost') {
        value ||= ledger(); journal(value, 'round_blocked', actor, { roundId, level: room.game.level, mode: 'couple', elapsedMs: Date.now() - room.game.startedAt })
      }
    }
    next.revision++
    next.operations[operationId] = value ? { critical: true } : true
    if (Object.keys(next.operations).length > 2000) {
      const oldestMove = Object.keys(next.operations).find(key => !next.operations[key]?.critical)
      if (oldestMove) delete next.operations[oldestMove]
    }
    if (value) persistRoom(value, next)
    if (next.game.roundId !== before.roundId && timers.has(room.id)) { clearTimeout(timers.get(room.id)); timers.delete(room.id) }
    rooms.set(room.id, next); publish(next, before, operationId); scheduleSettle(next); scheduleCheckpoint()
  }

  app.get('/api/play/admin/overview', requireAdminAuth, route((_req, res) => {
    const value = ledger()
    const activeRooms = Object.values(value.rooms).filter(room => room.expiresAt > Date.now()).map(saved => rooms.get(saved.id) || saved)
    res.json({ rooms: activeRooms.map(room => ({ ...roomInfo(room), level: room.game.level, roundId: room.game.roundId, phase: room.game.phase, tools: room.game.tools,
      startedAt: room.game.startedAt, remaining: room.game.cards.filter(card => card.status !== 'cleared').length,
      membersInfo: room.members.map(member => ({ ...member.actor, token: undefined })) })),
      rounds: Object.values(value.rounds).slice(-100).map(round => ({ roundId: round.game.roundId, level: round.game.level, startedAt: round.game.startedAt, finished: round.finished, tools: round.game.tools, actor: round.actor })),
      coupons: value.coupons, transactions: value.transactions.slice(-100).reverse() })
  }))
  app.post('/api/play/admin/control', requireAdminAuth, route((req, res) => {
    const { roomId, roundId, action, tool, count, level, couponId, title, desc } = req.body || {}
    const actor = { ...identity(req, req.body), source: 'admin_web' }, value = ledger()
    const operationId = req.body.operationId
    if (operationId !== undefined && !validId(operationId)) throw fail('操作编号无效')
    const operationKey = operationId ? `admin_${operationId}` : ''
    const fingerprint = JSON.stringify({ roomId, roundId, action, tool, count, level, couponId, title, desc })
    if (operationKey && value.operations[operationKey]) {
      if (value.operations[operationKey].fingerprint !== fingerprint) throw fail('操作编号重复', 409)
      res.json({ success: true, state: getState() }); return
    }
    let next, before
    if (roomId) {
      const existing = getRoom(roomId)
      if (!existing) throw fail('房间不存在', 404)
      next = structuredClone(existing); before = existing.game
      if (['close_room', 'restart'].includes(action) && next.game.phase !== 'won') journal(value, 'round_end', actor, {
        roomId, roundId: next.game.roundId, level: next.game.level, mode: 'couple', outcome: action === 'close_room' ? 'admin_close' : 'admin_restart', elapsedMs: Date.now() - next.game.startedAt })
      if (action === 'close_room') {
        next.expiresAt = Date.now() - 1
      } else if (action === 'restart') {
        const target = Number(level || next.game.level)
        if (!Number.isInteger(target) || target < 1 || target > getConfig().gameSettings.levels.length) throw fail('关卡超出范围')
        next.game = createGame(getConfig(), target)
        roundEvents(value, next.game, actor, 'couple')
      } else if (action === 'grant_tool') {
        if (!['hint', 'rescue'].includes(tool) || !Number.isInteger(count) || count < 1 || count > 20) throw fail('道具数量应为 1–20')
        next.game.tools[tool] += count
        journal(value, 'prop_gain', actor, { roomId, roundId: next.game.roundId, tool, count, source: 'admin_grant', mode: 'couple' })
      } else throw fail('未知管理操作')
      next.revision++; value.rooms[roomId] = next
    } else if (roundId && action === 'grant_tool') {
      const round = value.rounds[roundId]
      if (!round || round.finished) throw fail('单人关卡已结束', 409)
      if (!['hint', 'rescue'].includes(tool) || !Number.isInteger(count) || count < 1 || count > 20) throw fail('道具数量应为 1–20')
      round.game.tools[tool] += count
      journal(value, 'prop_gain', actor, { roundId, tool, count, source: 'admin_grant', mode: 'solo' })
    } else if (action === 'grant_coupon') {
      if (typeof title !== 'string' || !title.trim()) throw fail('请输入券名')
      const id = `admin_${crypto.randomUUID()}`
      value.coupons.unshift({ id, title: clean(title, 80), desc: clean(desc, 500), icon: '🎁', target: 'boyfriend_pays', used: false, obtainedAt: '管理员发放', obtainedTime: new Date().toISOString() })
      journal(value, 'coupon_gain', actor, { couponId: id, source: 'admin_grant' })
    } else if (action === 'revoke_coupon') {
      if (!value.coupons.some(coupon => coupon.id === couponId)) throw fail('券不存在', 404)
      value.coupons = value.coupons.filter(coupon => coupon.id !== couponId)
      value.operations[couponId] ||= { at: new Date().toISOString() }
      journal(value, 'coupon_revoke', actor, { couponId })
    } else throw fail('管理参数无效')
    journal(value, 'admin_control', actor, { action, roomId, roundId })
    if (operationKey) value.operations[operationKey] = { fingerprint, at: new Date().toISOString() }
    commit(value)
    if (next) {
      if (timers.has(roomId) && (next.expiresAt < Date.now() || next.game.roundId !== before.roundId)) { clearTimeout(timers.get(roomId)); timers.delete(roomId) }
      rooms.set(roomId, next); if (next.expiresAt >= Date.now()) publish(next, before)
      else for (const socket of sockets) if (socket.roomId === roomId) { send(socket, { type: 'ended', error: '管理员已关闭房间，请回到单人模式或新建房间' }); socket.close(1000, 'Room closed') }
    }
    res.json({ success: true, state: getState() })
  }))
  wss.on('connection', (socket, req) => {
    socket.alive = true; let authenticated = false, count = 0, windowAt = Date.now()
    const authTimeout = setTimeout(() => { if (!authenticated) socket.close(1008, 'Authentication required') }, 5000)
    socket.on('pong', () => { socket.alive = true })
    socket.on('message', raw => {
      try {
        if (Date.now() - windowAt > 1000) { windowAt = Date.now(); count = 0 }
        if (++count > 30) throw fail('操作过快，请稍候')
        const message = JSON.parse(raw.toString())
        if (!authenticated) {
          const room = authRoom(message.roomId, message.token)
          socket.roomId = room.id; socket.memberToken = message.token
          // A refreshed page replaces only its own old connection.
          for (const peer of sockets) if (peer.roomId === room.id && peer.memberToken === message.token) {
            peer.superseded = true; send(peer, { type: 'replaced', error: '同一身份已在另一页面连接；点击重新连接可接管' }); peer.close(1000, 'Replaced')
          }
          sockets.add(socket); authenticated = true; clearTimeout(authTimeout)
          for (const peer of sockets) if (peer.roomId === room.id) snapshot(peer, room, { state: getState() })
          scheduleSettle(room)
        } else if (socket.superseded) return
        else if (message.type === 'sync') snapshot(socket, authRoom(socket.roomId, socket.memberToken))
        else command(socket, message)
      } catch (error) {
        const definitive = error.status >= 400 && error.status < 500
        send(socket, { type: 'error', rejected: definitive ? (() => { try { return JSON.parse(raw).operationId } catch { return undefined } })() : undefined,
          error: error.status ? error.message : '操作保存未确认，正在重连重试' })
      }
    })
    socket.on('error', () => {})
    socket.on('close', () => {
      clearTimeout(authTimeout); sockets.delete(socket)
      const room = rooms.get(socket.roomId)
      if (room) for (const peer of sockets) if (peer.roomId === room.id) send(peer, { type: 'presence', room: roomInfo(room) })
    })
  })
  const ping = setInterval(() => {
    for (const socket of sockets) {
      if (rooms.get(socket.roomId)?.expiresAt < Date.now()) { send(socket, { type: 'ended', error: '房间已过期，请新建房间继续同玩' }); socket.close(1000, 'Room expired'); continue }
      if (!socket.alive) { socket.terminate(); continue }
      socket.alive = false; socket.ping()
    }
  }, 15000)
  ping.unref()
  return {
    attach(server) {
      server.on('upgrade', (req, socket, head) => {
        const pathname = new URL(req.url, 'http://localhost').pathname
        if (pathname !== '/api/play/socket') { socket.destroy(); return }
        wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req))
      })
    },
    broadcastState(state) { for (const socket of sockets) send(socket, { type: 'global', state }) },
    journal,
    identity,
    queryTransactions(params) {
      return (ledger().transactions || []).filter(row => (!params.deviceId || row.deviceId === params.deviceId) && (!params.source || row.source === params.source) && (!params.sessionId || row.sessionId === params.sessionId) && (!params.event || row.event === params.event) && (!params.from || row.at.slice(0, 10) >= params.from) && (!params.to || row.at.slice(0, 10) <= params.to))
    },
    flush() { if (rooms.size) { const value = ledger(); for (const [id, room] of rooms) value.rooms[id] = room; saveLedger(value, false) } }
  }
}
