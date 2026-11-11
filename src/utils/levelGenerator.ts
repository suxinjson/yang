import type { CardItem } from '../types/game'
import { BOARD_MAX_X, BOARD_MAX_Y, CARD_GRID_WIDTH, CARD_GRID_HEIGHT } from './boardGeometry.ts'

interface CardPosition {
  x: number
  y: number
  layer: number
}

type RandomSource = () => number

export const LEVEL_RULES = {
  1: { minSets: 6, maxSets: 8, types: 3, layers: 2, batchSets: 2 },
  2: { minSets: 30, maxSets: 36, types: 7, layers: 4, batchSets: 3 },
  3: { minSets: 40, maxSets: 48, types: 8, layers: 6, batchSets: 3 }
} as const

export function checkCardOverlap(
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  cardWidth = CARD_GRID_WIDTH,
  cardHeight = CARD_GRID_HEIGHT
): boolean {
  return Math.abs(posA.x - posB.x) < cardWidth && Math.abs(posA.y - posB.y) < cardHeight
}

function shuffleArray<T>(arr: T[], random: RandomSource): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function between(min: number, max: number, random: RandomSource) {
  return min + random() * (max - min)
}

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value))
}

// Rows have enough spacing to prevent overlap within a layer, even with jitter.
function createLayer(layer: number, heart: boolean, random: RandomSource): CardPosition[] {
  const positions: CardPosition[] = []
  const shiftX = between(-0.15, 0.15, random)
  const shiftY = between(-0.08, 0.08, random)
  const mirror = random() < 0.5 ? -1 : 1
  const rowCounts = heart ? [4, 6, 6, 5, 4, 3, 1] : [6, 6, 6, 6, 6, 6, 6]

  rowCounts.forEach((count, row) => {
    const rowShift = between(-0.08, 0.08, random)
    for (let col = 0; col < count; col++) {
      const offset = heart && row === 0 ? [-2.15, -1.15, 1.15, 2.15][col] : (col - (count - 1) / 2) * 1.06
      const x = BOARD_MAX_X / 2 + offset * mirror + shiftX + rowShift + between(-0.025, 0.025, random)
      const y = (BOARD_MAX_Y - 6.36) / 2 + row * 1.06 + shiftY + between(-0.025, 0.025, random)
      positions.push({ x: clamp(x, BOARD_MAX_X), y: clamp(y, BOARD_MAX_Y), layer })
    }
  })
  return shuffleArray(positions, random)
}

// Randomized topological order; ties match the browser's DOM painting order.
export function getRemovalOrder(cards: readonly CardPosition[], random: RandomSource = Math.random): number[] {
  const blockers = cards.map(() => 0)
  const below = cards.map(() => [] as number[])
  for (let a = 0; a < cards.length; a++) {
    for (let b = a + 1; b < cards.length; b++) {
      if (!checkCardOverlap(cards[a], cards[b])) continue
      const [lower, upper] = cards[a].layer > cards[b].layer ? [b, a] : [a, b]
      blockers[lower]++
      below[upper].push(lower)
    }
  }

  const exposed = blockers.flatMap((count, index) => count === 0 ? [index] : [])
  const order: number[] = []
  while (exposed.length > 0) {
    const index = Math.floor(random() * exposed.length)
    const [next] = exposed.splice(index, 1)
    order.push(next)
    for (const lower of below[next]) {
      if (--blockers[lower] === 0) exposed.push(lower)
    }
  }
  return order
}

// At most three types per batch: the tray never exceeds six unmatched cards.
// Returning the removal order makes the generated solution replayable in tests.
export function dealSolvableTypes(cards: CardItem[], types: string[], batchSets: number, random: RandomSource = Math.random): number[] {
  const order = getRemovalOrder(cards, random)
  const pool: string[] = []
  let typeBag: string[] = []
  const totalSets = cards.length / 3
  for (let set = 0; set < totalSets;) {
    const batch: string[] = []
    const size = Math.min(batchSets, totalSets - set)
    for (let i = 0; i < size; i++, set++) {
      if (typeBag.length === 0) typeBag = shuffleArray([...types], random)
      const type = typeBag.pop()!
      batch.push(type, type, type)
    }
    pool.push(...shuffleArray(batch, random))
  }
  order.forEach((index, step) => { cards[index].type = pool[step] })
  return order
}

export function createLevel(level: keyof typeof LEVEL_RULES, availableTypes: string[], random: RandomSource = Math.random): { cards: CardItem[]; solution: number[] } {
  const rules = LEVEL_RULES[level]
  const types = shuffleArray([...new Set(availableTypes.filter(Boolean))], random).slice(0, rules.types)
  if (types.length === 0) throw new Error('至少需要一种有效卡牌才能生成关卡')

  const total = Math.floor(between(rules.minSets, rules.maxSets + 1, random)) * 3
  const positions: CardPosition[] = []
  // Upper layers have more gaps, so the opening offers several choices.
  const weights = Array.from({ length: rules.layers }, (_, layer) => 1 - layer * 0.05)
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const counts = weights.map(weight => Math.floor(total * weight / weightSum))
  const remainder = total - counts.reduce((sum, count) => sum + count, 0)
  for (let i = 0; i < remainder; i++) counts[i]++

  for (let layer = 0; layer < rules.layers; layer++) {
    const candidates = createLayer(layer, level === 3, random)
    let selected = candidates.slice(0, counts[layer])
    if (level === 3 && layer === 0) {
      // Preserve the two lobes, outer edges and tip of the heart.
      const outline = candidates.filter(p => p.y < 0.4 || p.y > 6 || p.x < 0.5 || p.x > BOARD_MAX_X - 0.5)
      selected = [...outline, ...candidates.filter(p => !outline.includes(p))].slice(0, counts[layer])
    }
    positions.push(...selected)
  }

  const cards: CardItem[] = positions.map((pos, index) => ({
    ...pos,
    id: level * 1000 + index,
    type: '',
    status: 'board',
    isCovered: false
  }))
  const solution = dealSolvableTypes(cards, types, rules.batchSets, random)
  updateCardCoverage(cards)
  return { cards, solution }
}

export function generateLevel1(types: string[], random: RandomSource = Math.random): CardItem[] {
  return createLevel(1, types, random).cards
}

export function generateLevel2(types: string[], random: RandomSource = Math.random): CardItem[] {
  return createLevel(2, types, random).cards
}

export function generateLevel3(types: string[], random: RandomSource = Math.random): CardItem[] {
  return createLevel(3, types, random).cards
}

export function updateCardCoverage(cards: CardItem[]) {
  const boardCards = cards.filter(c => c.status === 'board')
  boardCards.forEach((card, index) => {
    card.isCovered = boardCards.some((other, otherIndex) =>
      (other.layer > card.layer || (other.layer === card.layer && otherIndex > index)) &&
      checkCardOverlap(card, other)
    )
  })
}
