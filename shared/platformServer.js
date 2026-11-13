import crypto from 'node:crypto'
import { InventoryService } from './inventory.js'
import { ItemFactory, ITEM_REGISTRY } from './domain/items/index.js'

const LOVE_QUOTES = Object.freeze([
  '今天也是超级喜欢你的一天！💖',
  '只要你在身边，连发呆都是甜甜的。🌸',
  '工作累了吗？快来抱抱充电！⚡',
  '下班我们一起吃大餐，想吃什么我都陪你！🍰',
  '通关钢了钢的小心愿，我全都会认真兑现！💌',
  '小家越来越温馨了，有你真好！🏡'
])

export const JOBS_CONFIG = Object.freeze({
  job_barista: {
    id: 'job_barista',
    title: '手作咖啡师',
    desc: '研磨咖啡豆、拉花打奶泡，收获温暖香气。',
    icon: '☕',
    durationSeconds: 3600, // 1 hour
    rewardCoins: 150,
    bonusChance: 25,
    bonusItemId: 'pet.supply.snack_treats'
  },
  job_illustrator: {
    id: 'job_illustrator',
    title: '自由插画师',
    desc: '绘制温馨情侣绘本，描绘浪漫色彩。',
    icon: '🎨',
    durationSeconds: 14400, // 4 hours
    rewardCoins: 700,
    bonusChance: 35,
    bonusItemId: 'pet.supply.canned_food'
  },
  job_programmer: {
    id: 'job_programmer',
    title: '架构师编程',
    desc: '敲击键盘重构元宇宙，实现丝滑体验。',
    icon: '💻',
    durationSeconds: 28800, // 8 hours
    rewardCoins: 1600,
    bonusChance: 50,
    bonusItemId: 'work.token.coffee'
  }
})

export function registerPlatformRoutes(app, options) {
  const { runExclusive, getLedger, saveLedger } = options

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

    // AABB Collision verification for non-rug ground furnitures
    const occupied = Array.from({ length: 10 }, () => Array(10).fill(null))
    for (const f of placedFurnitures) {
      const catalogDef = ITEM_REGISTRY[f.catalogId] || {}
      const rawW = f.w || (catalogDef.footprint ? catalogDef.footprint[0] : 1)
      const rawH = f.h || (catalogDef.footprint ? catalogDef.footprint[1] : 1)
      const rot = f.rot || 0
      const w = rot % 180 === 90 ? rawH : rawW
      const h = rot % 180 === 90 ? rawW : rawH
      const layer = f.layer || catalogDef.layer || 'ground'

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
    const opKey = receiptToken ? `buy_${receiptToken}` : `buy_${actor.profileId}_${Date.now()}`
    if (receiptToken && value.operations[opKey]) {
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

    const jobDef = JOBS_CONFIG[jobId]
    if (!jobDef) throw Object.assign(new Error('日程工作不存在'), { status: 404 })

    const currentJob = value.idleJobs[actor.profileId]
    if (currentJob && !currentJob.claimed) {
      const elapsed = Math.floor((Date.now() - new Date(currentJob.startedAt).getTime()) / 1000)
      if (elapsed < currentJob.durationSeconds) {
        throw Object.assign(new Error('当前已有正在进行中的工作日程'), { status: 409 })
      }
    }

    value.idleJobs[actor.profileId] = {
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

    const currentJob = value.idleJobs[actor.profileId]
    if (!currentJob || currentJob.claimed) {
      throw Object.assign(new Error('没有可领取的打工奖励'), { status: 409 })
    }

    const elapsed = Math.floor((Date.now() - new Date(currentJob.startedAt).getTime()) / 1000)
    if (elapsed < currentJob.durationSeconds) {
      throw Object.assign(new Error(`工作尚未完成，还需 ${Math.ceil((currentJob.durationSeconds - elapsed) / 60)} 分钟`), { status: 400 })
    }

    const opKey = receiptToken ? `claim_job_${receiptToken}` : `claim_job_${actor.profileId}_${Date.now()}`
    if (receiptToken && value.operations[opKey]) {
      const service = new InventoryService(value)
      return res.json({ success: true, backpack: service.snapshot(actor.profileId), idempotent: true })
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
      value.operations[opKey] = { at: new Date().toISOString(), rewardCoins: currentJob.rewardCoins }
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

  // 9. Companion Pet Feeding
  app.post('/api/home/companion/feed', route(async (req, res) => {
    const value = getLedger()
    const actor = personalActor(value, req)
    const { itemId = 'pet.supply.canned_food' } = req.body || {}

    const service = new InventoryService(value)
    service.spend(actor.profileId, itemId, 1)

    value.companions[actor.profileId] ||= { petType: 'cat', petHunger: 50, petStatus: 'idle' }
    const comp = value.companions[actor.profileId]
    const supplyDef = ITEM_REGISTRY[itemId]
    const nutrition = supplyDef?.nutrition || 30

    comp.petHunger = Math.min(100, (comp.petHunger || 50) + nutrition)
    
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

    if (Date.now() < new Date(comp.petForageEndAt).getTime()) {
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
}
