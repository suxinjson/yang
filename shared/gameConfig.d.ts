import type { GameSettings, LevelSettings } from '../src/types/game'

export const CARD_GEOMETRY: Readonly<{ padding: 12; cardWidth: 54; cardHeight: 64; stepX: 58; stepY: 68 }>
export function defaultGameSettings(): GameSettings
export function normalizeGameSettings(input?: unknown): GameSettings
export function layoutGrid(settings: GameSettings, level: LevelSettings): {
  maxX: number; maxY: number; spanX: number; spanY: number
  columns: number; rows: number; rowCounts: number[]; capacity: number
}
