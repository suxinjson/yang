import crypto from 'node:crypto'
import { normalizeRewardPolicy } from './rewardConfig.js'
import { ItemFactory, ITEM_REGISTRY } from './domain/items/index.js'

export const ITEM_CATALOG = Object.freeze(Object.values(ITEM_REGISTRY).map(item => ({
  id: item.id,
  name: item.name,
  kind: item.kind || item.category,
  gameId: item.gameId || 'gang',
  stackable: item.stackable,
  icon: item.icon,
  category: item.category,
  description: item.description,
  price: item.price
})))

export { normalizeRewardPolicy } from './rewardConfig.js'

/**
 * Dual-mode drop rate generator
 * - simultaneous = true: Every configured item rolls independently (can obtain multiple)
 * - simultaneous = false: Mutually exclusive wheel roll (sum <= 100%, max 1 item or empty)
 */
export function drawToolRewards(input, random = () => crypto.randomInt(1000000) / 1000000) {
  const policy = normalizeRewardPolicy(input)
  const rewards = []
  
  const rules = [
    { id: 'gang.hint', chance: Number(policy.hintChance ?? 35), quantity: 1 },
    { id: 'gang.rescue', chance: Number(policy.rescueChance ?? 20), quantity: 1 }
  ]

  // Optional clothing or extra tool drops if configured
  if (policy.clothingChance && Number(policy.clothingChance) > 0) {
    rules.push({ id: 'wardrobe.top.pink_hoodie', chance: Number(policy.clothingChance), quantity: 1 })
  }

  if (policy.simultaneous) {
    rules.forEach(r => {
      if (random() * 100 < r.chance) {
        rewards.push({ itemId: r.id, quantity: r.quantity })
      }
    })
  } else {
    const totalChance = rules.reduce((sum, r) => sum + r.chance, 0)
    if (totalChance > 100) throw new Error('仅获取一种道具时，概率合计不能超过 100%')
    const roll = random() * 100
    let threshold = 0
    for (const rule of rules) {
      threshold += rule.chance
      if (roll < threshold) {
        rewards.push({ itemId: rule.id, quantity: rule.quantity })
        break
      }
    }
  }
  return rewards
}

export class InventoryService {
  constructor(value) {
    this.value = value
    value.profiles ||= {}
    value.homeSpaces ||= {}
    value.avatars ||= {}
    value.companions ||= {}
    value.idleJobs ||= {}
    value.coupons ||= []
    value.operations ||= {}
    value.transactions ||= []
  }

  authenticate(credentials) {
    const profile = this.value.profiles[credentials?.profileId]
    const secret = credentials?.profileSecret
    if (!profile || typeof secret !== 'string' || !/^[a-f0-9]{64}$/.test(secret)) {
      throw Object.assign(new Error('个人背包凭证无效，请恢复原设备身份'), { status: 403 })
    }
    const hash = crypto.createHash('sha256').update(secret).digest('hex')
    if (!/^[a-f0-9]{64}$/.test(profile.secretHash) || !crypto.timingSafeEqual(Buffer.from(profile.secretHash, 'hex'), Buffer.from(hash, 'hex'))) {
      throw Object.assign(new Error('个人背包凭证无效'), { status: 403 })
    }
    return profile
  }

  create(credentials, options = {}) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(credentials?.profileId) || !/^[a-f0-9]{64}$/.test(credentials?.profileSecret)) {
      throw Object.assign(new Error('个人身份格式无效'), { status: 400 })
    }
    if (this.value.profiles[credentials.profileId]) return this.authenticate(credentials)
    
    const gender = options?.gender || 'neutral'
    const isFemale = gender === 'female'
    const isMale = gender === 'male'

    const starterHair = isFemale ? 'wardrobe.hair.brown_wavy' : 'wardrobe.hair.black_short'
    const starterTop = isFemale ? 'wardrobe.top.pink_hoodie' : (isMale ? 'wardrobe.top.couple_suit' : 'wardrobe.top.white_tshirt')
    const starterBottom = isFemale ? 'wardrobe.bottom.plaid_skirt' : 'wardrobe.bottom.denim_jeans'
    const starterShoes = isMale ? 'wardrobe.shoes.leather' : 'wardrobe.shoes.sneakers'

    const starterFeatures = isFemale ? {
      gender: 'female',
      skin: '#ffd1dc',
      hairColor: '#5d4037',
      eyeColor: '#7b2cbf',
      lipColor: '#e57373',
      eyes: 'default',
      brows: 'default',
      lips: 'default'
    } : (isMale ? {
      gender: 'male',
      skin: '#ffdbac',
      hairColor: '#2b2320',
      eyeColor: '#3a506b',
      lipColor: '#c08081',
      eyes: 'default',
      brows: 'default',
      lips: 'default'
    } : {
      gender: 'neutral',
      skin: '#ffdbac',
      hairColor: '#2b2320',
      eyeColor: '#4e342e',
      lipColor: '#e57373',
      eyes: 'default',
      brows: 'default',
      lips: 'default'
    })

    const equippedSlots = {
      hair: starterHair,
      top: starterTop,
      bottom: starterBottom,
      shoes: starterShoes,
      accessory: null
    }

    const profile = {
      id: credentials.profileId,
      secretHash: crypto.createHash('sha256').update(credentials.profileSecret).digest('hex'),
      createdAt: new Date().toISOString(),
      revision: 0,
      goldCoins: 100,
      heartCoins: 10,
      items: {},
      equippedSlots
    }
    this.value.profiles[profile.id] = profile

    // Initialize starter default items
    this.grant(profile.id, 'gang.hint', 2)
    this.grant(profile.id, 'gang.rescue', 1)
    this.grant(profile.id, 'pet.supply.canned_food', 2)
    this.grant(profile.id, starterHair, 1, { slot: 'hair', isEquipped: true })
    this.grant(profile.id, starterTop, 1, { slot: 'top', isEquipped: true })
    this.grant(profile.id, starterBottom, 1, { slot: 'bottom', isEquipped: true })
    this.grant(profile.id, starterShoes, 1, { slot: 'shoes', isEquipped: true })

    // Provide wardrobe basics for flexible switching
    if (starterHair !== 'wardrobe.hair.black_short') {
      this.grant(profile.id, 'wardrobe.hair.black_short', 1, { slot: 'hair', isEquipped: false })
    }
    if (starterTop !== 'wardrobe.top.white_tshirt') {
      this.grant(profile.id, 'wardrobe.top.white_tshirt', 1, { slot: 'top', isEquipped: false })
    }
    if (starterBottom !== 'wardrobe.bottom.denim_jeans') {
      this.grant(profile.id, 'wardrobe.bottom.denim_jeans', 1, { slot: 'bottom', isEquipped: false })
    }
    if (starterShoes !== 'wardrobe.shoes.sneakers') {
      this.grant(profile.id, 'wardrobe.shoes.sneakers', 1, { slot: 'shoes', isEquipped: false })
    }

    // Initialize default avatar
    this.value.avatars[profile.id] = {
      features: starterFeatures,
      equippedSlots
    }

    // Initialize default home space
    this.value.homeSpaces[profile.id] = {
      wallpaperId: 'wall_cream',
      flooringId: 'floor_wood',
      placedFurnitures: [
        { instanceId: 'init_sofa', catalogId: 'furniture.sofa.modern', x: 3, y: 4, rot: 0, layer: 'ground' },
        { instanceId: 'init_rug', catalogId: 'furniture.rug.love', x: 3, y: 3, rot: 0, layer: 'rug' },
        { instanceId: 'init_tv', catalogId: 'furniture.tv.retro', x: 1, y: 1, rot: 0, layer: 'ground' },
        { instanceId: 'init_mirror', catalogId: 'furniture.mirror.dresser', x: 8, y: 1, rot: 0, layer: 'wall' },
        { instanceId: 'init_desk', catalogId: 'furniture.desk.work', x: 7, y: 6, rot: 0, layer: 'ground' },
        { instanceId: 'init_pet', catalogId: 'furniture.pet.bed', x: 1, y: 7, rot: 0, layer: 'ground' },
        { instanceId: 'init_frame', catalogId: 'furniture.frame.couple', x: 4, y: 1, rot: 0, layer: 'wall' }
      ]
    }

    for (const furniture of this.value.homeSpaces[profile.id].placedFurnitures) {
      this.grant(profile.id, furniture.catalogId, 1)
    }
    profile.starterFurnitureGranted = true

    // Initialize default companion & pet
    this.value.companions[profile.id] = {
      partnerName: '亲爱的',
      favorability: 100,
      partnerAvatar: { skin: '#ffdbac', hair: 'male_short_black', top: 'suit_grey' },
      petType: 'cat',
      petHunger: 80,
      petStatus: 'idle',
      petForageEndAt: null
    }

    return profile
  }

  grant(profileId, itemId, quantity = 1, metadata = {}) {
    const profile = this.value.profiles[profileId]
    if (!profile || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Invalid inventory grant')
    const existing = profile.items[itemId]
    const next = (existing?.quantity || 0) + quantity
    if (!Number.isSafeInteger(next)) throw new Error('Inventory overflow')

    // Domain Item instantiation to guarantee metadata & polymorphism
    const domainItem = ItemFactory.create({
      id: existing?.id || itemId,
      catalogId: itemId,
      quantity: next,
      isEquipped: metadata.isEquipped !== undefined ? metadata.isEquipped : existing?.isEquipped || false,
      metadata: { ...(existing?.metadata || {}), ...metadata }
    })

    profile.items[itemId] = domainItem.serialize()
    profile.revision++
  }

  migrateLegacyState() {
    const starter = ['furniture.sofa.modern', 'furniture.rug.love', 'furniture.tv.retro', 'furniture.mirror.dresser', 'furniture.desk.work', 'furniture.pet.bed', 'furniture.frame.couple']
    let changed = false
    for (const profile of Object.values(this.value.profiles)) if (!profile.starterFurnitureGranted) {
      for (const id of starter) if (!(profile.items[id]?.quantity > 0)) this.grant(profile.id, id, 1)
      profile.starterFurnitureGranted = true
      profile.revision++
      changed = true
    }
    for (const profile of Object.values(this.value.profiles)) {
      const companion = this.value.companions[profile.id]
      if (companion?.petStatus === 'foraging' && !Number.isFinite(Date.parse(companion.petForageEndAt))) {
        // Old writers lost this field. Resume a full trip instead of granting early.
        companion.petForageEndAt = new Date(Date.now() + 3600000).toISOString()
        profile.revision++
        changed = true
      }
      const job = this.value.idleJobs[profile.id]
      if (job && this.value.transactions.some(row => row.event === 'idle_job_claim' && row.profileId === profile.id && row.details?.jobId === job.jobId && Date.parse(row.at) >= Date.parse(job.startedAt))) {
        delete this.value.idleJobs[profile.id]
        profile.revision++
        changed = true
      }
    }
    return changed
  }

  spend(profileId, itemId, count = 1) {
    const profile = this.value.profiles[profileId]
    const entry = profile?.items[itemId]
    if (!entry || entry.quantity < count) {
      throw Object.assign(new Error('个人背包中没有可用道具'), { status: 409 })
    }
    entry.quantity -= count
    profile.revision++
  }

  getCoins(profileId) {
    const profile = this.value.profiles[profileId]
    return {
      gold: Number(profile?.goldCoins ?? profile?.gold ?? 100),
      heart: Number(profile?.heartCoins ?? profile?.heart ?? 0)
    }
  }

  grantCoins(profileId, type, amount) {
    const profile = this.value.profiles[profileId]
    if (!profile || amount <= 0) return
    if (type === 'gold') profile.goldCoins = (profile.goldCoins || 0) + amount
    else if (type === 'heart') profile.heartCoins = (profile.heartCoins || 0) + amount
    profile.revision++
  }

  spendCoins(profileId, type, amount) {
    const profile = this.value.profiles[profileId]
    if (!profile || amount <= 0) throw Object.assign(new Error('无效的货币扣减'), { status: 400 })
    const current = type === 'gold' ? (profile.goldCoins || 0) : (profile.heartCoins || 0)
    if (current < amount) throw Object.assign(new Error(`余额不足，无法购买（需要 ${amount} ${type === 'gold' ? '金币' : '爱心币'}）`), { status: 409 })
    if (type === 'gold') profile.goldCoins -= amount
    else if (type === 'heart') profile.heartCoins -= amount
    profile.revision++
  }

  saveAvatarAll(profileId, payload = {}) {
    const profile = this.value.profiles[profileId]
    if (!profile) throw Object.assign(new Error('用户档案不存在'), { status: 404 })

    const slots = payload.equippedSlots
    if (slots !== undefined) {
      if (!slots || typeof slots !== 'object' || Array.isArray(slots)) throw Object.assign(new Error('装备格式无效'), { status: 400 })
      for (const [slot, itemId] of Object.entries(slots)) this.validateEquipment(profileId, itemId, slot)
    }
    this.value.avatars[profileId] ||= { features: {}, equippedSlots: {} }
    profile.equippedSlots ||= {}

    // 1. Update features
    if (payload.features && typeof payload.features === 'object') {
      this.value.avatars[profileId].features = {
        ...this.value.avatars[profileId].features,
        ...payload.features
      }
    }

    // 2. Update equippedSlots
    if (payload.equippedSlots && typeof payload.equippedSlots === 'object') {
      const nextSlots = { ...this.value.avatars[profileId].equippedSlots }
      for (const [slot, itemId] of Object.entries(payload.equippedSlots)) {
        const previous = nextSlots[slot]
        if (previous && profile.items[previous]) profile.items[previous].isEquipped = false
        if (!itemId) {
          nextSlots[slot] = null
          delete profile.equippedSlots[slot]
          continue
        }
        profile.items[itemId].isEquipped = true
        profile.equippedSlots[slot] = itemId
        nextSlots[slot] = itemId
      }
      this.value.avatars[profileId].equippedSlots = nextSlots
    }

    profile.revision++
    return this.value.avatars[profileId]
  }

  equip(profileId, itemId, slot) {
    const profile = this.value.profiles[profileId]
    if (!profile) throw Object.assign(new Error('用户档案不存在'), { status: 404 })
    this.validateEquipment(profileId, itemId, slot)
    const entry = profile.items[itemId]
    
    profile.equippedSlots ||= {}
    this.value.avatars[profileId] ||= { features: {}, equippedSlots: {} }
    
    // Unequip current slot if any
    const prevItem = profile.equippedSlots[slot]
    if (prevItem && profile.items[prevItem]) profile.items[prevItem].isEquipped = false

    profile.equippedSlots[slot] = itemId
    entry.isEquipped = true
    this.value.avatars[profileId].equippedSlots[slot] = itemId
    profile.revision++
    return this.value.avatars[profileId]
  }

  validateEquipment(profileId, itemId, slot) {
    if (!['hair', 'top', 'bottom', 'shoes', 'accessory'].includes(slot)) throw Object.assign(new Error('装备槽位无效'), { status: 400 })
    if (itemId === null) return
    const definition = typeof itemId === 'string' && Object.hasOwn(ITEM_REGISTRY, itemId) ? ITEM_REGISTRY[itemId] : null
    if (!definition || definition.category !== 'wardrobe' || definition.slot !== slot) throw Object.assign(new Error('服饰与槽位不匹配'), { status: 400 })
    if (!(this.value.profiles[profileId]?.items[itemId]?.quantity > 0)) throw Object.assign(new Error('尚未拥有该服饰'), { status: 403 })
  }

  tools(profileId) {
    const items = this.value.profiles[profileId]?.items || {}
    return {
      hint: items['gang.hint']?.quantity || 0,
      rescue: items['gang.rescue']?.quantity || 0
    }
  }

  snapshot(profileId) {
    const profile = this.value.profiles[profileId]
    if (!profile) return null

    const domainItems = Object.values(profile.items)
      .filter(i => i.quantity > 0)
      .map(i => ItemFactory.create(i).serialize())

    const coupons = (this.value.coupons || []).filter(c => c.ownerId === profileId).map(c => ({
      ...c,
      category: 'wish_coupon',
      kind: 'wish_coupon'
    }))

    return {
      profileId,
      revision: profile.revision,
      coins: this.getCoins(profileId),
      tools: this.tools(profileId),
      items: domainItems,
      coupons,
      avatar: this.value.avatars[profileId] || { features: {}, equippedSlots: {} },
      homeSpace: this.value.homeSpaces[profileId] || { wallpaperId: 'wall_cream', flooringId: 'floor_wood', placedFurnitures: [] },
      companion: this.value.companions[profileId] || { partnerName: '亲爱的', favorability: 100, petType: 'cat', petHunger: 80, petStatus: 'idle' },
      idleJob: this.value.idleJobs[profileId] || null
    }
  }
}
