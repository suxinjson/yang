import type { CardItem } from '../src/types/game'
type Position = { x: number; y: number; layer: number }
type Random = () => number
export const LEVEL_RULES: Record<1 | 2 | 3, { minSets: number; maxSets: number; types: number; layers: number }>
export function checkCardOverlap(a: { x: number; y: number }, b: { x: number; y: number }, width?: number, height?: number): boolean
export function getRemovalOrder(cards: readonly Position[], random?: Random, width?: number, height?: number): number[]
export function createLevel(level: number, types: string[], random?: Random, settings?: unknown): { cards: CardItem[]; solution: number[] }
export function updateCardCoverage(cards: CardItem[], width?: number, height?: number): void
export function generateLevel1(types: string[], random?: Random): CardItem[]
export function generateLevel2(types: string[], random?: Random): CardItem[]
export function generateLevel3(types: string[], random?: Random): CardItem[]
