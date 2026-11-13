import type { AdminConfig, CardDefinition, CardItem, GameSettings } from '../src/types/game'
export type Tool = 'hint' | 'rescue'
export interface GameState {
  roundId: string; level: number; settings: GameSettings; defs: CardDefinition[]; profile: { name: string; image: string }
  cards: CardItem[]; slots: number[]; staged: number[]; eliminating: number[]; resolveAt: number
  phase: 'playing' | 'lost' | 'won'; modal: '' | 'coupons' | 'rescue'; couponTab: 'all' | 'unredeemed' | 'redeemed'; startedAt: number; endedAt: number
  matches: number; unlocked: number; tools: Record<Tool, number>; hinted: number[]; hintUntil: number; rewardId: string; rewards?: { itemId: string; quantity: number }[]; applied: string[]
}
export interface GameAction { type: string; cardId?: number; couponId?: string; couponConfirmed?: boolean; tab?: GameState['couponTab'] }
export const INITIAL_TOOLS: Readonly<Record<Tool, number>>
export function createGame(config: Partial<AdminConfig>, level?: number, roundId?: string, now?: number): GameState
export function applyGameAction(game: GameState, action: GameAction, now?: number): void
export function settleGame(game: GameState, now?: number): boolean
