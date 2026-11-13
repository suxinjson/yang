export type ItemCategory =
  | 'currency'
  | 'game_tool'
  | 'wardrobe'
  | 'furniture'
  | 'wish_coupon'
  | 'pet_supply'
  | 'work_token'

export type WardrobeSlot = 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory'
export type FurnitureLayer = 'ground' | 'rug' | 'wall' | 'decor'
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface ItemUseContext {
  roundId?: string
  purpose?: string
  equip?: boolean
  slot?: WardrobeSlot
  [key: string]: unknown
}

export interface ItemUseResult {
  success: boolean
  message?: string
  result?: unknown
}

export interface ItemSerialized {
  id: string
  itemId: string
  catalogId: string
  category: ItemCategory
  quantity: number
  isEquipped: boolean
  metadata: Record<string, unknown>
  [key: string]: unknown
}

export abstract class BaseItem {
  readonly id: string
  readonly catalogId: string
  readonly category: ItemCategory
  quantity: number
  isEquipped: boolean
  metadata: Record<string, unknown>

  constructor(
    id: string,
    catalogId: string,
    category: ItemCategory,
    quantity?: number,
    isEquipped?: boolean,
    metadata?: Record<string, unknown>
  )

  abstract canStack(): boolean
  abstract onUse(context?: ItemUseContext): Promise<ItemUseResult>
  abstract serialize(): ItemSerialized
}

export class CurrencyItem extends BaseItem {
  canStack(): true
  onUse(): Promise<ItemUseResult>
  serialize(): ItemSerialized & { currencyType: string }
}

export class GameToolItem extends BaseItem {
  gameId: string
  canStack(): true
  onUse(context?: ItemUseContext): Promise<ItemUseResult>
  serialize(): ItemSerialized & { gameId: string; icon: string; name: string; stackable: true }
}

export class WardrobeItem extends BaseItem {
  slot: WardrobeSlot
  dyeColor: string | null
  genderConstraint: string
  canStack(): false
  onUse(context?: ItemUseContext): Promise<ItemUseResult>
  serialize(): ItemSerialized & { slot: WardrobeSlot; dyeColor: string | null; genderConstraint: string }
}

export class FurnitureItem extends BaseItem {
  footprint: [number, number]
  rotatable: boolean
  layer: FurnitureLayer
  interaction: string | null
  canStack(): false
  onUse(context?: ItemUseContext): Promise<ItemUseResult>
  serialize(): ItemSerialized & { footprint: [number, number]; rotatable: boolean; layer: FurnitureLayer; interaction: string | null }
}

export class WishCouponItem extends BaseItem {
  title: string
  desc: string
  target: string
  icon: string
  used: boolean
  usedAt: string | null
  usedFor: string | null
  ownerId: string | null
  obtainedAt: string
  obtainedTime: string | null
  canStack(): false
  onUse(context?: ItemUseContext): Promise<ItemUseResult>
  serialize(): ItemSerialized & { title: string; desc: string; target: string; icon: string; used: boolean }
}

export class PetSupplyItem extends BaseItem {
  nutrition: number
  canStack(): true
  onUse(context?: ItemUseContext): Promise<ItemUseResult>
  serialize(): ItemSerialized & { nutrition: number }
}

export class WorkTokenItem extends BaseItem {
  speedupSeconds: number
  canStack(): true
  onUse(context?: ItemUseContext): Promise<ItemUseResult>
  serialize(): ItemSerialized & { speedupSeconds: number }
}

export interface CatalogDefinition {
  id: string
  name: string
  category: ItemCategory
  kind?: string
  gameId?: string
  slot?: WardrobeSlot
  footprint?: [number, number]
  layer?: FurnitureLayer
  interaction?: string
  nutrition?: number
  speedupSeconds?: number
  icon: string
  description?: string
  rarity?: ItemRarity
  stackable: boolean
  price?: number
}

export const ITEM_REGISTRY: Readonly<Record<string, CatalogDefinition>>

export class ItemFactory {
  static create(data: Record<string, unknown>): BaseItem
  static fromCatalog(catalogId: string, quantity?: number, overrideMetadata?: Record<string, unknown>): BaseItem
  static getCatalogDef(catalogId: string): CatalogDefinition | null
}

export interface CategoryStrategy {
  key: string
  label: string
  filter: (item: BaseItem | ItemSerialized) => boolean
}

export const CategoryStrategies: Readonly<Record<string, CategoryStrategy>>
export const SortStrategies: Readonly<Record<string, (a: BaseItem | ItemSerialized, b: BaseItem | ItemSerialized) => number>>
