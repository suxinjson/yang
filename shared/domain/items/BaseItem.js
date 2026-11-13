export class BaseItem {
  /**
   * @param {string} id
   * @param {string} catalogId
   * @param {'currency'|'game_tool'|'wardrobe'|'furniture'|'wish_coupon'|'pet_supply'|'work_token'} category
   * @param {number} [quantity=1]
   * @param {boolean} [isEquipped=false]
   * @param {Record<string, any>} [metadata={}]
   */
  constructor(id, catalogId, category, quantity = 1, isEquipped = false, metadata = {}) {
    if (!id || typeof id !== 'string') throw new Error('BaseItem requires a valid id')
    if (!catalogId || typeof catalogId !== 'string') throw new Error('BaseItem requires a valid catalogId')
    this.id = id
    this.catalogId = catalogId
    this.category = category
    this.quantity = Math.max(0, Math.floor(quantity || 0))
    this.isEquipped = Boolean(isEquipped)
    this.metadata = metadata ? { ...metadata } : {}
  }

  /**
   * Whether this item can stack in inventory slots
   * @returns {boolean}
   */
  canStack() {
    return false
  }

  /**
   * Polymorphic usage handler
   * @param {Record<string, any>} context
   * @returns {Promise<{ success: boolean; message?: string; result?: any }>}
   */
  async onUse(context = {}) {
    return { success: false, message: '此物品不可直接使用' }
  }

  /**
   * Serializes the item to JSON-friendly representation
   * @returns {Record<string, any>}
   */
  serialize() {
    return {
      id: this.id,
      itemId: this.catalogId, // Backward compatibility for legacy tests/client
      catalogId: this.catalogId,
      category: this.category,
      quantity: this.quantity,
      isEquipped: this.isEquipped,
      metadata: { ...this.metadata }
    }
  }
}

export class CurrencyItem extends BaseItem {
  constructor(id, catalogId, quantity = 1, metadata = {}) {
    super(id, catalogId, 'currency', quantity, false, metadata)
  }

  canStack() {
    return true
  }

  async onUse() {
    return { success: false, message: '货币可在商城购物或结算时自动消耗，不可直接使用' }
  }

  serialize() {
    return {
      ...super.serialize(),
      currencyType: this.catalogId.replace('currency.', '')
    }
  }
}

export class GameToolItem extends BaseItem {
  constructor(id, catalogId, quantity = 1, metadata = {}) {
    super(id, catalogId, 'game_tool', quantity, false, metadata)
    this.gameId = metadata.gameId || 'gang'
  }

  canStack() {
    return true
  }

  async onUse(context = {}) {
    if (this.quantity < 1) {
      return { success: false, message: '道具数量不足' }
    }
    this.quantity--
    return {
      success: true,
      message: `成功消耗 ${this.metadata.name || this.catalogId}`,
      result: { tool: this.catalogId, remaining: this.quantity, roundId: context.roundId }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      gameId: this.gameId,
      icon: this.metadata.icon || '✨',
      name: this.metadata.name || this.catalogId,
      stackable: true,
      kind: 'game_tool' // Legacy compatibility
    }
  }
}

export class WardrobeItem extends BaseItem {
  constructor(id, catalogId, quantity = 1, isEquipped = false, metadata = {}) {
    super(id, catalogId, 'wardrobe', quantity, isEquipped, metadata)
    this.slot = metadata.slot || 'top' // 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory'
    this.dyeColor = metadata.dyeColor || null
    this.genderConstraint = metadata.genderConstraint || 'all'
  }

  canStack() {
    return false
  }

  async onUse(context = {}) {
    // Toggles equipped status or equips to target avatar
    this.isEquipped = context.equip !== undefined ? Boolean(context.equip) : !this.isEquipped
    return {
      success: true,
      message: this.isEquipped ? '装配成功' : '卸下成功',
      result: { slot: this.slot, isEquipped: this.isEquipped, catalogId: this.catalogId }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      slot: this.slot,
      dyeColor: this.dyeColor,
      genderConstraint: this.genderConstraint,
      name: this.metadata.name || this.catalogId,
      icon: this.metadata.icon || '👗',
      kind: 'avatar_clothing', // Legacy compatibility
      stackable: false
    }
  }
}

export class FurnitureItem extends BaseItem {
  constructor(id, catalogId, quantity = 1, isEquipped = false, metadata = {}) {
    super(id, catalogId, 'furniture', quantity, isEquipped, metadata)
    this.footprint = Array.isArray(metadata.footprint) ? metadata.footprint : [1, 1]
    this.rotatable = metadata.rotatable !== false
    this.layer = metadata.layer || 'ground' // 'ground' | 'rug' | 'wall' | 'decor'
    this.interaction = metadata.interaction || null
  }

  canStack() {
    return false
  }

  async onUse(context = {}) {
    return {
      success: true,
      message: '激活小家装修摆放模式',
      result: {
        catalogId: this.catalogId,
        footprint: this.footprint,
        layer: this.layer,
        interaction: this.interaction
      }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      footprint: this.footprint,
      rotatable: this.rotatable,
      layer: this.layer,
      interaction: this.interaction,
      name: this.metadata.name || this.catalogId,
      icon: this.metadata.icon || '🛋️',
      kind: 'furniture',
      stackable: false
    }
  }
}

export class WishCouponItem extends BaseItem {
  constructor(id, catalogId, quantity = 1, isEquipped = false, metadata = {}) {
    super(id, catalogId, 'wish_coupon', quantity, isEquipped, metadata)
    this.title = metadata.title || '甜蜜心愿券'
    this.desc = metadata.desc || '兑现一个小心愿'
    this.target = metadata.target || 'boyfriend_pays'
    this.icon = metadata.icon || '💖'
    this.used = Boolean(metadata.used)
    this.usedAt = metadata.usedAt || null
    this.usedFor = metadata.usedFor || null
    this.ownerId = metadata.ownerId || null
    this.obtainedAt = metadata.obtainedAt || '关卡通关'
    this.obtainedTime = metadata.obtainedTime || null
  }

  canStack() {
    return false
  }

  async onUse(context = {}) {
    if (this.used) {
      return { success: false, message: '此心愿券已被兑现或使用' }
    }
    this.used = true
    this.usedAt = new Date().toISOString()
    this.usedFor = context.purpose || '兑现心愿'
    this.metadata.used = true
    this.metadata.usedAt = this.usedAt
    this.metadata.usedFor = this.usedFor
    return {
      success: true,
      message: `心愿券【${this.title}】已成功兑现！`,
      result: { couponId: this.id, usedAt: this.usedAt, usedFor: this.usedFor }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      title: this.title,
      desc: this.desc,
      target: this.target,
      icon: this.icon,
      used: this.used,
      usedAt: this.usedAt,
      usedFor: this.usedFor,
      ownerId: this.ownerId,
      obtainedAt: this.obtainedAt,
      obtainedTime: this.obtainedTime,
      kind: 'wish_coupon',
      stackable: false
    }
  }
}

export class PetSupplyItem extends BaseItem {
  constructor(id, catalogId, quantity = 1, metadata = {}) {
    super(id, catalogId, 'pet_supply', quantity, false, metadata)
    this.nutrition = Number(metadata.nutrition || 30)
  }

  canStack() {
    return true
  }

  async onUse(context = {}) {
    if (this.quantity < 1) {
      return { success: false, message: '宠物口粮不足' }
    }
    this.quantity--
    return {
      success: true,
      message: `喂食成功，宠物饱腹感提升 +${this.nutrition} 点！`,
      result: { nutrition: this.nutrition, remaining: this.quantity }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      nutrition: this.nutrition,
      name: this.metadata.name || this.catalogId,
      icon: this.metadata.icon || '🥫',
      kind: 'pet_supply',
      stackable: true
    }
  }
}

export class WorkTokenItem extends BaseItem {
  constructor(id, catalogId, quantity = 1, metadata = {}) {
    super(id, catalogId, 'work_token', quantity, false, metadata)
    this.speedupSeconds = Number(metadata.speedupSeconds || 3600)
  }

  canStack() {
    return true
  }

  async onUse(context = {}) {
    if (this.quantity < 1) {
      return { success: false, message: '工作道具数量不足' }
    }
    this.quantity--
    return {
      success: true,
      message: `使用成功，日程倒计时缩短 ${Math.round(this.speedupSeconds / 60)} 分钟！`,
      result: { speedupSeconds: this.speedupSeconds, remaining: this.quantity }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      speedupSeconds: this.speedupSeconds,
      name: this.metadata.name || this.catalogId,
      icon: this.metadata.icon || '☕',
      kind: 'work_token',
      stackable: true
    }
  }
}
