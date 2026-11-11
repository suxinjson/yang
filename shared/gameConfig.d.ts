import type { GameSettings, LevelSettings } from '../src/types/game'

export const CARD_GEOMETRY: Readonly<{ padding: 12; cardWidth: number; cardHeight: number; stepX: number; stepY: number }>
export function defaultGameSettings(): GameSettings
export function normalizeGameSettings(input?: unknown): GameSettings
export function layoutGrid(settings: GameSettings, level: LevelSettings): {
  maxX: number; maxY: number; spanX: number; spanY: number
  columns: number; rows: number; rowCounts: number[]; capacity: number
  cardWidth?: number; cardHeight?: number; stepX?: number; stepY?: number
}
