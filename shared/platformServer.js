import crypto from 'node:crypto'
import { InventoryService } from './inventory.js'
import { hashPassword, verifyPassword, createAuthLimiter } from './accountSecurity.js'
import { ItemFactory, ITEM_REGISTRY } from './domain/items/index.js'
import { PETS } from './pets.js'

const LOVE_QUOTES = Object.freeze([
  '今天也是超级喜欢你的一天！💖',
  '只要你在身边，连发呆都是甜甜的。🌸',
  '工作累了吗？快来抱抱充电！⚡',
  '下班我们一起吃大餐，想吃什么我都陪你！🍰',
  '通关钢了钢的小心愿，我全都会认真兑现！💌',
  '小家越来越温馨了，有你真好！🏡'
])

import { JOBS_CONFIG } from './jobsConfig.js'
export { JOBS_CONFIG } from './jobsConfig.js'

export function registerPlatformRoutes(app, options) {
  const { runExclusive, getLedger, saveLedger } = options
  app.use(['/api/auth/login', '/api/auth/register'], createAuthLimiter())

  function personalActor(value, req) {
    const profile = new InventoryService(value).authenticate(req.body)
    return { profileId: profile.id }
  }

  function commit(value) {
    return saveLedger(value)
  }

  const route = handler => (req, res) => {
    void runExclusive(async () => {
      try {
        await handler(req, res)
      } catch (error) {
        res.status(error.status || 500).json({ error: error.message || '平台服务异常' })
      }
    })
  }

  // 1. Overview
  app.post('/api/home/overview', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const service = new InventoryService(value)
    const snapshot = service.snapshot(actor.profileId)
    
    // Check if idle job is ready
    const idleJob = snapshot.idleJob
    const now = Date.now()
    let isJobComplete = false
    if (idleJob && !idleJob.claimed) {
      const elapsed = Math.floor((now - new Date(idleJob.startedAt).getTime()) / 1000)
      isJobComplete = elapsed >= idleJob.durationSeconds
    }

    // Check if pet forage is ready
    const companion = snapshot.companion
    let isForageComplete = false
    if (companion && companion.petStatus === 'foraging' && companion.petForageEndAt) {
      isForageComplete = now >= new Date(companion.petForageEndAt).getTime()
    }

    res.json({
      success: true,
      snapshot,
      jobsConfig: JOBS_CONFIG,
      storeCatalog: Object.values(ITEM_REGISTRY).filter(item => item.price),
      isJobComplete,
      isForageComplete,
      serverNow: now
    })
  }))

  // 2. Save Home Space (Furniture Placement & Collision Check)
  app.post('/api/home/space/save', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { placedFurnitures, wallpaperId, flooringId } = req.body || {}

    if (!Array.isArray(placedFurnitures)) {
      throw Object.assign(new Error('家具摆放列表格式不正确'), { status: 400 })
    }

    if (placedFurnitures.length > 100) throw Object.assign(new Error('家具数量超出限制'), { status: 400 })
    const ids = new Set(), counts = new Map()
    const profile = value.profiles[actor.profileId]
    for (const f of placedFurnitures) {
      const def = f && typeof f.catalogId === 'string' && Object.hasOwn(ITEM_REGISTRY, f.catalogId) ? ITEM_REGISTRY[f.catalogId] : null
      if (!def || def.category !== 'furniture' || !Number.isInteger(f.x) || !Number.isInteger(f.y) ||
          typeof f.instanceId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(f.instanceId) || ids.has(f.instanceId)) throw Object.assign(new Error('家具参数无效'), { status: 400 })
      ids.add(f.instanceId)
      const count = (counts.get(f.catalogId) || 0) + 1
      counts.set(f.catalogId, count)
      if (count > (profile.items[f.catalogId]?.quantity || 0)) throw Object.assign(new Error('尚未拥有足够的该家具'), { status: 403 })
      if ((f.w !== undefined && f.w !== def.footprint[0]) || (f.h !== undefined && f.h !== def.footprint[1]) ||
          (f.layer !== undefined && f.layer !== def.layer) || ![0, 90, 180, 270].includes(f.rot ?? 0) || (!def.rotatable && (f.rot ?? 0) !== 0)) throw Object.assign(new Error('家具尺寸、旋转或层级无效'), { status: 400 })
    }
    if ((wallpaperId !== undefined && wallpaperId !== 'wall_cream') || (flooringId !== undefined && flooringId !== 'floor_wood')) throw Object.assign(new Error('墙纸或地板无效'), { status: 400 })
    // Footprints and layers are authoritative catalog data.
    const occupied = Array.from({ length: 10 }, () => Array(10).fill(null))
    for (const f of placedFurnitures) {
      const catalogDef = ITEM_REGISTRY[f.catalogId] || {}
      const rawW = catalogDef.footprint[0]
      const rawH = catalogDef.footprint[1]
      const rot = f.rot || 0
      const w = rot % 180 === 90 ? rawH : rawW
      const h = rot % 180 === 90 ? rawW : rawH
      const layer = catalogDef.layer

      if (f.x < 0 || f.y < 0 || f.x + w > 10 || f.y + h > 10) {
        throw Object.assign(new Error(`家具【${catalogDef.name || f.catalogId}】超出房间边界`), { status: 400 })
      }

      if (layer === 'ground') {
        for (let r = f.y; r < f.y + h; r++) {
          for (let c = f.x; c < f.x + w; c++) {
            if (occupied[r][c] && occupied[r][c] !== f.instanceId) {
              throw Object.assign(new Error(`家具【${catalogDef.name || f.catalogId}】摆放位置与其他地面家具重叠冲突`), { status: 409 })
            }
            occupied[r][c] = f.instanceId
          }
        }
      }
    }

    value.homeSpaces[actor.profileId] = {
      wallpaperId: wallpaperId || 'wall_cream',
      flooringId: flooringId || 'floor_wood',
      placedFurnitures: placedFurnitures.map(f => ({
        instanceId: f.instanceId || crypto.randomUUID(),
        catalogId: f.catalogId,
        x: f.x,
        y: f.y,
        w: f.w || (ITEM_REGISTRY[f.catalogId]?.footprint?.[0] ?? 1),
        h: f.h || (ITEM_REGISTRY[f.catalogId]?.footprint?.[1] ?? 1),
        rot: f.rot || 0,
        layer: f.layer || ITEM_REGISTRY[f.catalogId]?.layer || 'ground'
      }))
    }

    value.profiles[actor.profileId].revision++
    await commit(value)

    res.json({ success: true, homeSpace: value.homeSpaces[actor.profileId] })
  }))

  // 3. Avatar Face & Body Customization
  app.post('/api/home/avatar/features', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { features } = req.body || {}

    value.avatars[actor.profileId] ||= { features: {}, equippedSlots: {} }
    value.avatars[actor.profileId].features = {
      ...value.avatars[actor.profileId].features,
      ...features
    }

    value.profiles[actor.profileId].revision++
    await commit(value)

    res.json({ success: true, avatar: value.avatars[actor.profileId] })
  }))

  // 4. Avatar Wardrobe Equip / Unequip
  app.post('/api/home/avatar/equip', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { catalogId, slot } = req.body || {}
    if (!catalogId || !slot) throw Object.assign(new Error('装备参数不完整'), { status: 400 })

    const service = new InventoryService(value)
    const avatar = service.equip(actor.profileId, catalogId, slot)

    // Audit log
    value.transactions.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      event: 'avatar_equip',
      profileId: actor.profileId,
      details: { catalogId, slot }
    })

    await commit(value)
    res.json({ success: true, avatar, backpack: service.snapshot(actor.profileId) })
  }))

  // 5. Store Purchase (Furniture, Clothes, Tools)
  app.post('/api/home/store/buy', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { catalogId, count = 1, receiptToken } = req.body || {}

    if (!catalogId || !ITEM_REGISTRY[catalogId]) {
      throw Object.assign(new Error('商品不存在或已下架'), { status: 404 })
    }

    const itemDef = ITEM_REGISTRY[catalogId]
    if (!itemDef.price) {
      throw Object.assign(new Error('该商品为非卖品'), { status: 400 })
    }

    // Idempotency check
    if (!Number.isSafeInteger(count) || count < 1 || count > 100 || typeof receiptToken !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(receiptToken)) throw Object.assign(new Error('购买数量或操作凭据无效'), { status: 400 })
    const opKey = `buy_${actor.profileId}_${receiptToken}`
    if (receiptToken && value.operations[opKey]) {
      if (value.operations[opKey].catalogId !== catalogId || value.operations[opKey].count !== count) throw Object.assign(new Error('操作凭据已用于其他购买'), { status: 409 })
      const service = new InventoryService(value)
      return res.json({ success: true, backpack: service.snapshot(actor.profileId), idempotent: true })
    }

    const totalCost = itemDef.price * count
    const service = new InventoryService(value)

    // Deduct coins & Grant item
    service.spendCoins(actor.profileId, 'gold', totalCost)
    service.grant(actor.profileId, catalogId, count)

    if (receiptToken) {
      value.operations[opKey] = { at: new Date().toISOString(), catalogId, count, totalCost }
    }

    // Ledger audit row
    value.transactions.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      event: 'store_purchase',
      profileId: actor.profileId,
      details: { catalogId, count, totalCost, receiptToken }
    })

    await commit(value)
    res.json({
      success: true,
      message: `成功购买 ${itemDef.name} × ${count}！`,
      backpack: service.snapshot(actor.profileId)
    })
  }))

  // 6. Idle Job - Start
  app.post('/api/home/idle/start', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { jobId } = req.body || {}

    const jobDef = typeof jobId === 'string' && Object.hasOwn(JOBS_CONFIG, jobId) ? JOBS_CONFIG[jobId] : null
    if (!jobDef) throw Object.assign(new Error('日程工作不存在'), { status: 404 })

    const currentJob = value.idleJobs[actor.profileId]
    if (currentJob && !currentJob.claimed) {
      throw Object.assign(new Error('请先完成并领取当前工作奖励'), { status: 409 })
    }

    value.idleJobs[actor.profileId] = {
      id: crypto.randomUUID(),
      jobId,
      startedAt: new Date().toISOString(),
      durationSeconds: jobDef.durationSeconds,
      rewardCoins: jobDef.rewardCoins,
      claimed: false
    }

    value.profiles[actor.profileId].revision++
    await commit(value)

    res.json({ success: true, idleJob: value.idleJobs[actor.profileId] })
  }))

  // 7. Idle Job - Claim Reward
  app.post('/api/home/idle/claim', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { receiptToken } = req.body || {}

    if (typeof receiptToken !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(receiptToken)) throw Object.assign(new Error('领奖凭据无效'), { status: 400 })
    const opKey = `claim_job_${actor.profileId}_${receiptToken}`
    if (value.operations[opKey]) return res.json({ success: true, ...value.operations[opKey], backpack: new InventoryService(value).snapshot(actor.profileId), idempotent: true })

    const currentJob = value.idleJobs[actor.profileId]
    if (!currentJob || currentJob.claimed) {
      throw Object.assign(new Error('没有可领取的打工奖励'), { status: 409 })
    }

    const elapsed = Math.floor((Date.now() - new Date(currentJob.startedAt).getTime()) / 1000)
    if (!Number.isFinite(elapsed) || elapsed < currentJob.durationSeconds) {
      throw Object.assign(new Error(`工作尚未完成，还需 ${Math.ceil((currentJob.durationSeconds - elapsed) / 60)} 分钟`), { status: 400 })
    }

    const service = new InventoryService(value)
    service.grantCoins(actor.profileId, 'gold', currentJob.rewardCoins)

    // Chance of bonus surprise drop
    const jobDef = JOBS_CONFIG[currentJob.jobId]
    let bonusItem = null
    if (jobDef && crypto.randomInt(100) < jobDef.bonusChance) {
      service.grant(actor.profileId, jobDef.bonusItemId, 1)
      bonusItem = ITEM_REGISTRY[jobDef.bonusItemId]
    }

    currentJob.claimed = true
    delete value.idleJobs[actor.profileId]

    if (receiptToken) {
      value.operations[opKey] = { at: new Date().toISOString(), jobId: currentJob.id || currentJob.startedAt, rewardCoins: currentJob.rewardCoins, bonusItem }
    }

    value.transactions.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      event: 'idle_job_claim',
      profileId: actor.profileId,
      details: { jobId: currentJob.jobId, rewardCoins: currentJob.rewardCoins, bonusItem: bonusItem?.id }
    })

    await commit(value)
    res.json({
      success: true,
      rewardCoins: currentJob.rewardCoins,
      bonusItem,
      backpack: service.snapshot(actor.profileId)
    })
  }))

  // 8. Companion Interaction (Sweet Words & Heart Coins)
  app.post('/api/home/companion/interact', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)

    value.companions[actor.profileId] ||= {
      partnerName: '亲爱的',
      favorability: 100,
      petType: 'cat',
      petHunger: 80,
      petStatus: 'idle'
    }

    const comp = value.companions[actor.profileId]
    comp.favorability = (comp.favorability || 100) + 5

    const service = new InventoryService(value)
    service.grantCoins(actor.profileId, 'heart', 5)

    const quote = LOVE_QUOTES[crypto.randomInt(LOVE_QUOTES.length)]

    value.profiles[actor.profileId].revision++
    await commit(value)

    res.json({
      success: true,
      quote,
      companion: comp,
      backpack: service.snapshot(actor.profileId)
    })
  }))

  app.post('/api/home/companion/pet', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const petType = req.body?.petType
    if (!PETS.some(pet => pet.id === petType)) throw Object.assign(new Error('请选择支持的宠物种类'), { status: 400 })
    value.companions[actor.profileId] ||= { partnerName: '亲爱的', favorability: 100, petHunger: 80, petStatus: 'idle' }
    const comp = value.companions[actor.profileId]
    comp.petType = petType
    value.profiles[actor.profileId].revision++
    await commit(value)
    res.json({ success: true, companion: comp })
  }))

  // 9. Companion Pet Feeding
  app.post('/api/home/companion/feed', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { itemId = 'pet.supply.canned_food' } = req.body || {}
    if (ITEM_REGISTRY[itemId]?.category !== 'pet_supply') throw Object.assign(new Error('请选择宠物食品'), { status: 400 })

    const service = new InventoryService(value)
    service.spend(actor.profileId, itemId, 1)

    value.companions[actor.profileId] ||= { petType: 'cat', petHunger: 50, petStatus: 'idle' }
    const comp = value.companions[actor.profileId]
    const supplyDef = ITEM_REGISTRY[itemId]
    const nutrition = supplyDef?.nutrition || 30

    comp.petHunger = Math.min(100, (comp.petHunger ?? 50) + nutrition)
    
    // If full, pet goes foraging for treasure
    let startedForage = false
    if (comp.petHunger >= 80 && comp.petStatus !== 'foraging') {
      comp.petStatus = 'foraging'
      // 1 hour forage
      comp.petForageEndAt = new Date(Date.now() + 3600 * 1000).toISOString()
      startedForage = true
    }

    value.profiles[actor.profileId].revision++
    await commit(value)

    res.json({
      success: true,
      message: `喂食成功！饱腹感 +${nutrition}！${startedForage ? ' 宠物吃饱开心地出门寻宝啦！' : ''}`,
      companion: comp,
      backpack: service.snapshot(actor.profileId)
    })
  }))

  // 10. Companion Pet Forage Reward Claim
  app.post('/api/home/companion/pet_reward', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const comp = value.companions[actor.profileId]

    if (!comp || comp.petStatus !== 'foraging') {
      throw Object.assign(new Error('宠物暂无寻宝收获'), { status: 400 })
    }

    const deadline = Date.parse(comp.petForageEndAt)
    if (!Number.isFinite(deadline) || Date.now() < deadline) {
      throw Object.assign(new Error('宠物还在寻宝途中，请耐心等待'), { status: 400 })
    }

    const service = new InventoryService(value)
    // Reward: 100 gold + 1 hint or coffee
    service.grantCoins(actor.profileId, 'gold', 120)
    service.grant(actor.profileId, 'gang.hint', 1)

    comp.petStatus = 'idle'
    comp.petHunger = 60
    comp.petForageEndAt = null

    value.profiles[actor.profileId].revision++
    await commit(value)

    res.json({
      success: true,
      message: '宠物寻宝归来，带回了 120 金币和 1 张透视卡！',
      companion: comp,
      backpack: service.snapshot(actor.profileId)
    })
  }))

  // ================= NEW EXTENSIONS =================
  // 11. Atomic Batch Avatar Save (Fix slow saving & missed hair features)
  app.post('/api/home/avatar/save-all', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { features, equippedSlots } = req.body || {}

    const service = new InventoryService(value)
    const avatar = service.saveAvatarAll(actor.profileId, { features, equippedSlots })

    value.transactions.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      event: 'avatar_save_all',
      profileId: actor.profileId,
      details: { features, equippedSlots }
    })

    await commit(value)
    res.json({
      success: true,
      message: '形象装扮已极速保存！',
      avatar,
      backpack: service.snapshot(actor.profileId)
    })
  }))

  function publicUser(user, profileSecret) {
    return { username: user.username, nickname: user.nickname, gender: user.gender, profileId: user.profileId, profileSecret }
  }
  app.post('/api/auth/register', route(async (req, res) => {
    const value = getLedger()
    value.users ||= {}
    const { username, password, nickname, gender = 'female' } = req.body || {}
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_\-\u4e00-\u9fff]{2,32}$/.test(username.trim()) || ['__proto__', 'constructor', 'prototype'].includes(username.trim().toLowerCase())) throw Object.assign(new Error('账号须为 2–32 位字母、数字、中文或下划线'), { status: 400 })
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw Object.assign(new Error('密码长度须为 8–128 位'), { status: 400 })
    if (nickname !== undefined && (typeof nickname !== 'string' || nickname.length > 32)) throw Object.assign(new Error('昵称格式无效'), { status: 400 })
    const cleanUser = username.trim().toLowerCase()
    if (Object.hasOwn(value.users, cleanUser)) throw Object.assign(new Error('该账号不可注册，请登录或更换账号'), { status: 409 })
    const profileId = crypto.randomUUID(), profileSecret = crypto.randomBytes(32).toString('hex')
    const service = new InventoryService(value), chosenGender = gender === 'male' ? 'male' : 'female'
    service.create({ profileId, profileSecret }, { gender: chosenGender })
    const user = { username: username.trim(), passwordHash: await hashPassword(password), nickname: nickname?.trim() || '小家主人', gender: chosenGender, profileId, createdAt: new Date().toISOString() }
    value.users[cleanUser] = user
    await commit(value)
    res.json({ success: true, message: '注册成功', user: publicUser(user, profileSecret), backpack: service.snapshot(profileId) })
  }))

  app.post('/api/auth/login', route(async (req, res) => {
    const value = getLedger()
    const { username, password } = req.body || {}
    const cleanUser = typeof username === 'string' ? username.trim().toLowerCase() : ''
    const user = Object.hasOwn(value.users || {}, cleanUser) ? value.users[cleanUser] : null
    if (typeof password !== 'string' || password.length > 128 || !user || !await verifyPassword(password, user.passwordHash)) throw Object.assign(new Error('账号或密码不正确'), { status: 401 })
    if (!user.passwordHash.startsWith('scrypt:')) user.passwordHash = await hashPassword(password)
    delete user.profileSecret
    const profileSecret = crypto.randomBytes(32).toString('hex')
    value.profiles[user.profileId].secretHash = crypto.createHash('sha256').update(profileSecret).digest('hex')
    value.profiles[user.profileId].revision++
    await commit(value)
    res.json({ success: true, message: '欢迎回来！', user: publicUser(user, profileSecret), backpack: new InventoryService(value).snapshot(user.profileId) })
  }))

  app.post('/api/auth/logout', route(async (req, res) => {
    const value = getLedger(), profile = new InventoryService(value).authenticate(req.body)
    profile.secretHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex')
    profile.revision++
    await commit(value)
    res.json({ success: true })
  }))

  // 14. Multiplayer Room Roaming & Shared Room Space
  app.post('/api/home/room/sync', route(async (req, res) => {
    const value = getLedger()
    value.multiplayerRooms ||= {}
    value.roomWishes ||= {}
    const actor = personalActor(value, req)
    const { roomId = 'room_666', x = 3, y = 4, nickname = '玩家', gender = 'neutral', status = 'active' } = req.body || {}

    const safeRoomId = String(roomId).trim() || 'room_666'
    value.multiplayerRooms[safeRoomId] ||= { members: {}, updatedAt: Date.now() }
    const room = value.multiplayerRooms[safeRoomId]

    // Update current member presence & coordinates
    const avatar = value.avatars[actor.profileId] || {}
    room.members[actor.profileId] = {
      profileId: actor.profileId,
      nickname: String(nickname).slice(0, 16),
      gender: gender || avatar.features?.gender || 'female',
      x: Math.max(0, Math.min(9, Number(x) || 3)),
      y: Math.max(0, Math.min(9, Number(y) || 4)),
      avatar,
      status,
      lastSeen: Date.now()
    }

    // Clean expired members (idle > 5 minutes)
    const now = Date.now()
    for (const [pid, m] of Object.entries(room.members)) {
      if (now - m.lastSeen > 300000 && pid !== actor.profileId) {
        delete room.members[pid]
      }
    }

    // Shared wishes for this room
    value.roomWishes[safeRoomId] ||= [
      { id: 'wish_init_1', title: '一起喝下午茶 ☕', desc: '挑选一间喜欢的甜品店，一起打卡！', author: '系统', completed: false, completedBy: null },
      { id: 'wish_init_2', title: '联机通关钢了钢 🎮', desc: '互相赠送道具，携手战胜第 12 阶！', author: '系统', completed: false, completedBy: null }
    ]

    await commit(value)

    res.json({
      success: true,
      roomId: safeRoomId,
      members: Object.values(room.members),
      wishes: value.roomWishes[safeRoomId]
    })
  }))

  // 15. Shared Room Wish Management (Publish & Redeem in Room)
  app.post('/api/home/room/wish-action', route(async (req, res) => {
    const value = getLedger()
    value.roomWishes ||= {}
    const actor = personalActor(value, req)
    const { roomId = 'room_666', action, wishTitle, wishDesc, wishId, authorName } = req.body || {}
    const safeRoomId = String(roomId).trim() || 'room_666'
    value.roomWishes[safeRoomId] ||= []

    const list = value.roomWishes[safeRoomId]
    let mutated = false
    if (action === 'add') {
      if (!wishTitle) throw Object.assign(new Error('心愿内容不能为空'), { status: 400 })
      const newWish = {
        id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: String(wishTitle).slice(0, 30),
        desc: String(wishDesc || '愿望成真，甜蜜陪伴！').slice(0, 100),
        author: authorName || '房间成员',
        authorId: actor.profileId,
        createdAt: new Date().toISOString(),
        completed: false,
        completedBy: null
      }
      list.unshift(newWish)
      mutated = true
    } else if (action === 'redeem') {
      const target = list.find(w => w.id === wishId)
      if (target) {
        target.completed = true
        target.completedBy = authorName || '房间伙伴'
        target.completedAt = new Date().toISOString()
        mutated = true
      }
    }

    if (mutated) {
      await commit(value)
    }
    res.json({ success: true, wishes: list })
  }))

  // 16. Game Leaderboards (Fastest Time & Cleared Pass Count & Records)
  app.get('/api/game/leaderboard', route(async (req, res) => {
    const value = getLedger()
    value.gameRecords ||= []

    const records = value.gameRecords.filter(record => record.verified === true)
    const type = req.query.type || 'fastest'

    if (type === 'fastest') {
      // Top 20 sorted by durationSeconds ASC (minimum time)
      const sorted = [...records]
        .filter(r => r.cleared && r.durationSeconds > 0)
        .sort((a, b) => a.durationSeconds - b.durationSeconds)
        .slice(0, 20)
      return res.json({ success: true, list: sorted })
    }

    if (type === 'passes') {
      // Group by user/nickname and count total passes
      const counts = new Map()
      for (const r of records) {
        if (!r.cleared) continue
        const key = r.username || r.nickname || r.profileId || '匿名玩家'
        const existing = counts.get(key) || {
          username: r.username,
          nickname: r.nickname || key,
          gender: r.gender || 'neutral',
          totalPasses: 0,
          bestTime: Infinity,
          avatar: r.avatar
        }
        existing.totalPasses++
        if (r.durationSeconds && r.durationSeconds < existing.bestTime) {
          existing.bestTime = r.durationSeconds
        }
        counts.set(key, existing)
      }

      const list = [...counts.values()]
        .sort((a, b) => b.totalPasses - a.totalPasses)
        .slice(0, 20)
      return res.json({ success: true, list })
    }

    // Default: recent records
    const recent = [...records].slice(-25).reverse()
    res.json({ success: true, list: recent })
  }))

  // Records are created only by verified game settlement.
  app.post('/api/game/record', (_req, res) => res.status(410).json({ error: '成绩由服务端通关结算自动记录，请更新客户端' }))
}
