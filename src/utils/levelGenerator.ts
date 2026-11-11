import type { CardItem, GameSettings, LevelSettings, SolvabilityMode } from '../types/game'
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
// Inter-layer staggering creates classic 羊了个羊 half-card interlocking mounds.
function createLayer(layer: number, settings: GameSettings, rules: LevelSettings, random: RandomSource): CardPosition[] {
  const positions: CardPosition[] = []
  const grid = layoutGrid(settings, rules)
  const strength = rules.randomness / 100

  // Calculate available slack within the bounding box
  const slackX = Math.max(0, grid.spanX - (grid.columns - 1) * 1.06)
  const slackY = Math.max(0, grid.spanY - (grid.rows - 1) * 1.06)

  // Layer staggering phase: creates organic half-step / quarter-step offsets across layers
  const phase = layer % 4
  const dirX = (phase === 0 || phase === 3) ? -1 : 1
  const dirY = (phase === 0 || phase === 2) ? -1 : 1

  const safeSlackX = Math.max(0, slackX / 2 - 0.01)
  const safeSlackY = Math.max(0, slackY / 2 - 0.01)

  // Base staggering offset + organic randomness
  const baseFraction = 0.8
  const randomShiftX = between(-0.10, 0.10, random) * strength * safeSlackX
  const randomShiftY = between(-0.10, 0.10, random) * strength * safeSlackY
  const layerOffsetX = Math.max(-safeSlackX, Math.min(safeSlackX, dirX * safeSlackX * baseFraction + randomShiftX))
  const layerOffsetY = Math.max(-safeSlackY, Math.min(safeSlackY, dirY * safeSlackY * baseFraction + randomShiftY))

  const mirror = random() < 0.5 ? -1 : 1

  grid.rowCounts.forEach((count, row) => {
    const rowShift = between(-0.015, 0.015, random) * strength
    for (let col = 0; col < count; col++) {
      const offset = rules.layout === 'heart' && row === 0
        ? (col < count / 2 ? -(grid.columns - 1) / 2 + col : (grid.columns - 1) / 2 - (count - 1 - col)) * 1.06
        : (col - (count - 1) / 2) * 1.06

      // Micro-jitter per card to avoid rigid alignment while strictly maintaining inter-card spacing
      const microJitterX = between(-0.015, 0.015, random) * strength
      const microJitterY = between(-0.015, 0.015, random) * strength

      let x = grid.maxX / 2 + offset * mirror + layerOffsetX + rowShift + microJitterX
      let y = (grid.maxY - (grid.rows - 1) * 1.06) / 2 + row * 1.06 + layerOffsetY + microJitterY

      // Strictly stay inside span bounds with an epsilon margin against floating-point precision issues
      const maxDiffX = grid.spanX / 2 - 0.0001
      const maxDiffY = grid.spanY / 2 - 0.0001
      const minX = Math.max(0, grid.maxX / 2 - maxDiffX)
      const maxX = Math.min(grid.maxX, grid.maxX / 2 + maxDiffX)
      const minY = Math.max(0, grid.maxY / 2 - maxDiffY)
      const maxY = Math.min(grid.maxY, grid.maxY / 2 + maxDiffY)

      x = Math.max(minX, Math.min(maxX, x))
      y = Math.max(minY, Math.min(maxY, y))

      positions.push({ x, y, layer })
    }
  })

  return positions
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

// Generates strategic, interleaved card distributions that eliminate brainless "对对碰",
// building authentic 羊了个羊 tension while strictly guaranteeing a solvable sequence within 7 slots.
// Supports 100% impossible / unwinnable mode when configured.
function dealSolvableTypes(cards: CardItem[], types: string[], level: number, solvability: SolvabilityMode = 'guaranteed', random: RandomSource = Math.random): number[] {
  const order = getRemovalOrder(cards, random)
  const N = cards.length

  if (solvability === 'impossible') {
    // 100% Impossible / Unwinnable Mode:
    // Intentionally creates unmatched orphan cards (total cards is still multiple of 3, but triples cannot be completed).
    // This creates an impossible trap that cannot be cleared without Boyfriend Superhero Rescue or power-ups!
    const totalSets = Math.max(0, Math.floor(N / 3) - 1)
    const pool: string[] = []
    let typeBag: string[] = []
    for (let s = 0; s < totalSets; s++) {
      if (typeBag.length === 0) typeBag = shuffleArray([...types], random)
      const t = typeBag.pop()!
      pool.push(t, t, t)
    }
    const distinctTypes = shuffleArray([...types], random)
    if (distinctTypes.length >= 3) {
      pool.push(distinctTypes[0], distinctTypes[1], distinctTypes[2])
    } else if (distinctTypes.length === 2) {
      pool.push(distinctTypes[0], distinctTypes[0], distinctTypes[1])
    } else {
      pool.push(distinctTypes[0], distinctTypes[0], distinctTypes[0])
    }
    const shuffled = shuffleArray(pool, random)
    order.forEach((index, step) => { cards[index].type = shuffled[step] })
    return order
  }

  const totalSets = N / 3
  const targetPeak = solvability === 'hard' ? 6 : (level === 1 ? 3 : 5)

  const remaining = new Map<string, number>()
  types.forEach(t => remaining.set(t, 0))
  let bag: string[] = []
  for (let s = 0; s < totalSets; s++) {
    if (bag.length === 0) bag = shuffleArray([...types], random)
    const t = bag.pop()!
    remaining.set(t, remaining.get(t)! + 3)
  }

  const inTray = new Map<string, number>()
  types.forEach(t => inTray.set(t, 0))
  const pool: string[] = []
  let tray: string[] = []

  for (let step = 0; step < N; step++) {
    const remSteps = N - step
    const traySize = tray.length
    let neededToClear = 0
    for (const [, cnt] of inTray.entries()) {
      if (cnt > 0) neededToClear += (3 - cnt)
    }

    const canComplete: string[] = []
    const canAdvance: string[] = []
    const canOpen: string[] = []

    for (const [t, cnt] of inTray.entries()) {
      if (cnt === 2 && remaining.get(t)! > 0) canComplete.push(t)
      else if (cnt === 1 && remaining.get(t)! > 0) canAdvance.push(t)
      else if (cnt === 0 && remaining.get(t)! >= 3) canOpen.push(t)
    }

    let chosenType: string | null = null
    const mustConserve = (neededToClear >= remSteps)

    if (mustConserve || traySize >= 5) {
      if (canComplete.length > 0) {
        chosenType = canComplete[Math.floor(random() * canComplete.length)]
      } else if (canAdvance.length > 0 && traySize < 5) {
        chosenType = canAdvance[Math.floor(random() * canAdvance.length)]
      } else if (canOpen.length > 0 && traySize < 4 && !mustConserve) {
        chosenType = canOpen[Math.floor(random() * canOpen.length)]
      } else if (canAdvance.length > 0 && traySize < 6) {
        chosenType = canAdvance[Math.floor(random() * canAdvance.length)]
      } else if (canComplete.length > 0) {
        chosenType = canComplete[0]
      }
    } else if (traySize >= targetPeak) {
      if (canComplete.length > 0) {
        chosenType = canComplete[Math.floor(random() * canComplete.length)]
      } else if (canAdvance.length > 0 && traySize < 5) {
        chosenType = canAdvance[Math.floor(random() * canAdvance.length)]
      } else if (canOpen.length > 0 && traySize < 4) {
        chosenType = canOpen[Math.floor(random() * canOpen.length)]
      }
    }

    if (!chosenType) {
      const candidates: { t: string; weight: number }[] = []
      if (canOpen.length > 0 && traySize < 4) candidates.push(...canOpen.map(t => ({ t, weight: 3 })))
      if (canAdvance.length > 0 && traySize < 5) candidates.push(...canAdvance.map(t => ({ t, weight: 4 })))
      if (canComplete.length > 0) candidates.push(...canComplete.map(t => ({ t, weight: 3 })))

      if (candidates.length === 0) {
        if (canComplete.length > 0) chosenType = canComplete[0]
        else if (canAdvance.length > 0 && traySize < 6) chosenType = canAdvance[0]
        else if (canOpen.length > 0 && traySize < 5) chosenType = canOpen[0]
      } else {
        const totalWeight = candidates.reduce((s, c) => s + c.weight, 0)
        let r = random() * totalWeight
        for (const c of candidates) {
          r -= c.weight
          if (r <= 0) { chosenType = c.t; break }
        }
        if (!chosenType) chosenType = candidates[candidates.length - 1].t
      }
    }

    if (!chosenType) throw new Error('No candidate at step ' + step)

    remaining.set(chosenType, remaining.get(chosenType)! - 1)
    pool.push(chosenType)
    tray.push(chosenType)
    if (tray.filter(t => t === chosenType).length === 3) {
      inTray.set(chosenType, 0)
      tray = tray.filter(t => t !== chosenType)
    } else {
      inTray.set(chosenType, inTray.get(chosenType)! + 1)
    }
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
  const counts = Array.from({ length: rules.layers }, () => Math.floor(total / rules.layers))
  const remainder = total % rules.layers
  for (let i = 0; i < remainder; i++) counts[i]++

  for (let layer = 0; layer < rules.layers; layer++) {
    const candidates = createLayer(layer, settings, rules, random)
    if (rules.layout !== 'heart' && rules.layers > 2 && layer >= Math.floor(rules.layers / 2)) {
      const grid = layoutGrid(settings, rules)
      candidates.sort((a, b) => {
        const distA = Math.hypot(a.x - grid.maxX / 2, a.y - grid.maxY / 2) + between(-0.3, 0.3, random)
        const distB = Math.hypot(b.x - grid.maxX / 2, b.y - grid.maxY / 2) + between(-0.3, 0.3, random)
        return distA - distB
      })
    } else {
      shuffleArray(candidates, random)
    }

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
  const solution = dealSolvableTypes(cards, types, level, rules.solvability, random)
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

export function updateCardCoverage(
  cards: CardItem[],
  cardWidth = CARD_GRID_WIDTH,
  cardHeight = CARD_GRID_HEIGHT
) {
  const boardCards = cards.filter(c => c.status === 'board')
  boardCards.forEach((card, index) => {
    card.isCovered = boardCards.some((other, otherIndex) =>
      (other.layer > card.layer || (other.layer === card.layer && otherIndex > index)) &&
      checkCardOverlap(card, other, cardWidth, cardHeight)
    )
  })
}
