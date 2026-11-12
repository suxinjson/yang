import type { GameSettings } from '../src/types/game'
export interface BoardLayout { padding: number; cardWidth: number; cardHeight: number; stepX: number; stepY: number; width: number; height: number }
export function getBoardLayout(settings?: GameSettings): BoardLayout
export const BOARD_LAYOUT: BoardLayout
export const CARD_GRID_WIDTH: number, CARD_GRID_HEIGHT: number, BOARD_MAX_X: number, BOARD_MAX_Y: number
export function getBoardCardStyle(card: { x: number; y: number; layer: number }, layout?: BoardLayout): { left: string; top: string; width: string; height: string; zIndex: number }
