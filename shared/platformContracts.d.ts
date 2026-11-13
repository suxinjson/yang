// Shared platform contracts for the next homepage/game/wardrobe phase.
export type ItemKind = 'game_tool' | 'wish_coupon' | 'currency' | 'avatar_clothing' | 'avatar_decoration' | 'furniture' | 'collectible'
export type EquipmentSlot = 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory'
export interface ItemDefinition {
  id: string; name: string; kind: ItemKind; gameId?: string
  stackable: boolean; equipmentSlot?: EquipmentSlot; metadata?: Record<string, unknown>
}
export interface OwnedItem {
  itemId: string; quantity: number; instanceId?: string; metadata?: Record<string, unknown>
}
export interface AvatarState {
  profileId: string; appearance: Record<string, string | number>
  equipment: Partial<Record<EquipmentSlot, { itemId: string; instanceId?: string }>>
}
export interface GameReward {
  itemId: string; quantity: number; metadata?: Record<string, unknown>
}
export interface GameAdapter<TSession, TAction, TProgress> {
  readonly gameId: string
  createSession(profileId: string, progress: TProgress): TSession
  validateAction(session: TSession, action: TAction): void
  applyAction(session: TSession, action: TAction): TSession
  completion(session: TSession): { complete: boolean; rewardKey: string; candidates: GameReward[] }
}
export interface PlatformInventory {
  snapshot(profileId: string): Promise<OwnedItem[]>
  spend(profileId: string, itemId: string, operationId: string): Promise<OwnedItem[]>
  settle(profileId: string, gameId: string, rewardKey: string, rewards: GameReward[]): Promise<OwnedItem[]>
  equip(profileId: string, slot: EquipmentSlot, itemId: string, instanceId?: string): Promise<AvatarState>
}

