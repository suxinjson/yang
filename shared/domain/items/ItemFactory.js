import {
  BaseItem,
  CurrencyItem,
  GameToolItem,
  WardrobeItem,
  FurnitureItem,
  WishCouponItem,
  PetSupplyItem,
  WorkTokenItem
} from './BaseItem.js'
import { ITEM_REGISTRY } from './catalog.js'

export class ItemFactory {
  /**
   * Creates a polymorphic BaseItem instance from a DB row or raw payload
   * @param {Record<string, any>} data
   * @returns {BaseItem}
   */
  static create(data) {
    if (!data) throw new Error('Cannot create item from empty data')
    const catalogId = data.catalogId || data.itemId || data.id
    const catalogDef = ITEM_REGISTRY[catalogId] || {}
    const category = data.category || catalogDef.category || (data.kind === 'avatar_clothing' || (typeof catalogId === 'string' && catalogId.startsWith('wardrobe.')) ? 'wardrobe' : (data.kind === 'furniture' || (typeof catalogId === 'string' && catalogId.startsWith('furniture.')) ? 'furniture' : 'game_tool'))
    const id = data.id || catalogId
    const quantity = Number.isFinite(data.quantity) ? Number(data.quantity) : 1
    const isEquipped = Boolean(data.isEquipped)
    const mergedMetadata = {
      ...catalogDef,
      ...(data.metadata || {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.icon ? { icon: data.icon } : {}),
      kind: data.kind || (data.metadata && data.metadata.kind) || catalogDef.kind || (category === 'wardrobe' ? 'avatar_clothing' : category === 'furniture' ? 'furniture' : 'game_tool'),
      ...(data.stackable !== undefined ? { stackable: data.stackable } : {}),
      ...(data.title ? { title: data.title } : {}),
      ...(data.desc ? { desc: data.desc } : {}),
      ...(data.target ? { target: data.target } : {}),
      ...(data.used !== undefined ? { used: data.used } : {}),
      ...(data.usedAt ? { usedAt: data.usedAt } : {}),
      ...(data.usedFor ? { usedFor: data.usedFor } : {}),
      ...(data.ownerId ? { ownerId: data.ownerId } : {}),
      ...(data.obtainedAt ? { obtainedAt: data.obtainedAt } : {})
    }

    switch (category) {
      case 'currency':
        return new CurrencyItem(id, catalogId, quantity, mergedMetadata)
      case 'game_tool':
        return new GameToolItem(id, catalogId, quantity, mergedMetadata)
      case 'wardrobe':
        return new WardrobeItem(id, catalogId, quantity, isEquipped, mergedMetadata)
      case 'furniture':
        return new FurnitureItem(id, catalogId, quantity, isEquipped, mergedMetadata)
      case 'wish_coupon':
        return new WishCouponItem(id, catalogId, quantity, isEquipped, mergedMetadata)
      case 'pet_supply':
        return new PetSupplyItem(id, catalogId, quantity, mergedMetadata)
      case 'work_token':
        return new WorkTokenItem(id, catalogId, quantity, mergedMetadata)
      default:
        // Default to BaseItem or GameToolItem if unspecified
        return new GameToolItem(id, catalogId, quantity, mergedMetadata)
    }
  }

  /**
   * Creates an item directly from catalog ID
   * @param {string} catalogId
   * @param {number} [quantity=1]
   * @param {Record<string, any>} [overrideMetadata={}]
   * @returns {BaseItem}
   */
  static fromCatalog(catalogId, quantity = 1, overrideMetadata = {}) {
    const catalogDef = ITEM_REGISTRY[catalogId]
    if (!catalogDef) {
      // Allow dynamic items (e.g. dynamically generated coupons)
      return ItemFactory.create({
        id: catalogId,
        catalogId,
        category: 'game_tool',
        quantity,
        metadata: overrideMetadata
      })
    }
    return ItemFactory.create({
      id: catalogDef.id,
      catalogId: catalogDef.id,
      category: catalogDef.category,
      quantity,
      metadata: { ...catalogDef, ...overrideMetadata }
    })
  }

  /**
   * Returns catalog definition if known
   * @param {string} catalogId
   */
  static getCatalogDef(catalogId) {
    return ITEM_REGISTRY[catalogId] || null
  }
}

/**
 * Filter strategy pattern for inventory categorization
 */
export const CategoryStrategies = Object.freeze({
  ALL: {
    key: 'all',
    label: '全部',
    filter: () => true
  },
  GAME_TOOLS: {
    key: 'game_tool',
    label: '道具',
    filter: item => item.category === 'game_tool'
  },
  WARDROBE: {
    key: 'wardrobe',
    label: '服饰',
    filter: item => item.category === 'wardrobe'
  },
  FURNITURE: {
    key: 'furniture',
    label: '家具',
    filter: item => item.category === 'furniture'
  },
  WISH_COUPONS: {
    key: 'wish_coupon',
    label: '心愿券',
    filter: item => item.category === 'wish_coupon'
  },
  SUPPLIES: {
    key: 'supplies',
    label: '补给材料',
    filter: item => item.category === 'pet_supply' || item.category === 'work_token'
  }
})

/**
 * Sorter strategy for items
 */
export const SortStrategies = Object.freeze({
  RARITY_DESC: (a, b) => {
    const rank = { legendary: 4, epic: 3, rare: 2, common: 1 }
    const rA = rank[a.metadata.rarity] || 0
    const rB = rank[b.metadata.rarity] || 0
    return rB - rA || (b.quantity || 0) - (a.quantity || 0)
  },
  QUANTITY_DESC: (a, b) => (b.quantity || 0) - (a.quantity || 0),
  NAME_ASC: (a, b) => (a.metadata.name || a.catalogId).localeCompare(b.metadata.name || b.catalogId)
})
