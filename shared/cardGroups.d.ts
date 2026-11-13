import type { AdminConfig, CardDefinition, CardGroup } from '../src/types/game'
export const DEFAULT_CARD_GROUPS: readonly CardGroup[]
export function normalizeCardCatalog(config?: Partial<AdminConfig>): { cardGroups: CardGroup[]; customCards: CardDefinition[] }
