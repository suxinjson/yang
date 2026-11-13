import type { RewardPolicy } from '../src/types/game'
import type { BaseItem, ItemSerialized, WardrobeSlot } from './domain/items/index'

export interface ItemCatalogEntry {
  id: string
  name: string
  kind: string
  gameId?: string
  stackable: boolean
  icon: string
  category: string
  description?: string
  price?: number
}

export const ITEM_CATALOG: readonly ItemCatalogEntry[]

export function normalizeRewardPolicy(value?: Partial<RewardPolicy>): RewardPolicy
export function drawToolRewards(value?: Partial<RewardPolicy>, random?: () => number): { itemId: string; quantity: number }[]

export interface ProfileSnapshot {
  profileId: string
  revision: number
  coins: { gold: number; heart: number }
  tools: { hint: number; rescue: number; shuffle: number }
  items: ItemSerialized[]
  coupons: any[]
  avatar?: any
  homeSpace?: any
  companion?: any
  idleJob?: any
}

export class InventoryService {
  constructor(value: any)
  authenticate(credentials?: { profileId?: string; profileSecret?: string }): any
  create(credentials: { profileId: string; profileSecret: string }): any
  grant(profileId: string, itemId: string, quantity?: number, metadata?: Record<string, any>): void
  spend(profileId: string, itemId: string, count?: number): void
  getCoins(profileId: string): { gold: number; heart: number }
  grantCoins(profileId: string, type: 'gold' | 'heart', amount: number): void
  spendCoins(profileId: string, type: 'gold' | 'heart', amount: number): void
  equip(profileId: string, itemId: string, slot: WardrobeSlot): any
  tools(profileId: string): { hint: number; rescue: number; shuffle: number }
  snapshot(profileId: string): ProfileSnapshot | null
}
