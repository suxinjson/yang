import type { CardItem, GameSettings, LevelSettings } from '../types/game'
import { CARD_GRID_WIDTH, CARD_GRID_HEIGHT } from './boardGeometry.ts'
import { defaultGameSettings, normalizeGameSettings, layoutGrid } from '../../shared/gameConfig.js'

interface CardPosition {
  x: number
  y: number
  layer: number
}

type RandomSource = () => number

const defaults = defaultGameSettings().levels
function defaultRule(index: number) {
  const rule = defaults[index]
  return { minSets: rule.minCards / 3, maxSets: rule.maxCards / 3, types: rule.types, layers: rule.layers }
}
export const LEVEL_RULES = { 1: defaultRule(0), 2: defaultRule(1), 3: defaultRule(2) }

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

// Rows have enough spacing to prevent overlap within a layer, even with jitter.
function createLayer(layer: number, settings: GameSettings, rules: LevelSettings, random: RandomSource): CardPosition[] {
  const positions: CardPosition[] = []
  const grid = layoutGrid(settings, rules)
  const strength = rules.randomness / 100
  const shiftX = between(-0.10, 0.10, random) * strength
  const shiftY = between(-0.08, 0.08, random) * strength
  const mirror = random() < 0.5 ? -1 : 1
  grid.rowCounts.forEach((count, row) => {
    const rowShift = between(-0.04, 0.04, random) * strength
    for (let col = 0; col < count; col++) {
      const offset = rules.layout === 'heart' && row === 0
        ? (col < count / 2 ? -(grid.columns - 1) / 2 + col : (grid.columns - 1) / 2 - (count - 1 - col)) * 1.06
        : (col - (count - 1) / 2) * 1.06
      const x = grid.maxX / 2 + offset * mirror + shiftX + rowShift + between(-0.015, 0.015, random) * strength
      const y = (grid.maxY - (grid.rows - 1) * 1.06) / 2 + row * 1.06 + shiftY + between(-0.025, 0.025, random) * strength
      positions.push({ x, y, layer })
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
function dealSolvableTypes(cards: CardItem[], types: string[], batchSets: number, random: RandomSource): number[] {
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

export function createLevel(level: keyof typeof LEVEL_RULES, availableTypes: string[], random: RandomSource = Math.random, input: unknown = defaultGameSettings()): { cards: CardItem[]; solution: number[] } {
  const settings = normalizeGameSettings(input)
  const rules = settings.levels[level - 1]
  const types = shuffleArray([...new Set(availableTypes.filter(Boolean))], random).slice(0, rules.types)
  if (types.length === 0) throw new Error('至少需要一种有效卡牌才能生成关卡')

  const total = Math.floor(between(rules.minCards / 3, rules.maxCards / 3 + 1, random)) * 3
  const positions: CardPosition[] = []
  // Upper layers have more gaps, so the opening offers several choices.
  // Equal distribution never exceeds the validated per-layer capacity.
  const counts = Array.from({ length: rules.layers }, () => Math.floor(total / rules.layers))
  const remainder = total % rules.layers
  for (let i = 0; i < remainder; i++) counts[i]++

  for (let layer = 0; layer < rules.layers; layer++) {
    const candidates = createLayer(layer, settings, rules, random)
    let selected = candidates.slice(0, counts[layer])
    if (rules.layout === 'heart' && layer === 0) {
      // Preserve the two lobes, outer edges and tip of the heart.
      const { maxX, maxY } = layoutGrid(settings, rules)
      const outline = candidates.filter(p => p.y < 0.4 || p.y > maxY - 0.4 || p.x < 0.5 || p.x > maxX - 0.5)
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
  const solution = dealSolvableTypes(cards, types, level === 1 ? 2 : 3, random)
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
