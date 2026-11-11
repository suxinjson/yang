import type { CardItem } from '../types/game'

interface CardPosition {
  x: number // can be fractional, e.g. 0.5, 1.0, 1.5
  y: number
  layer: number
}

// Check if Card B covers Card A (B is on a higher layer and overlaps with A)
export function checkCardOverlap(
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  cardWidth: number = 1.0,
  cardHeight: number = 1.0
): boolean {
  return (
    Math.abs(posA.x - posB.x) < cardWidth * 0.92 &&
    Math.abs(posA.y - posB.y) < cardHeight * 0.92
  )
}

// Shuffle helper implementing Fisher-Yates uniform shuffle
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Generate Level 1 (Warm up, 6 cards total, 2 sets of 3)
export function generateLevel1(availableTypes: string[]): CardItem[] {
  const selectedTypes = availableTypes.slice(0, 2)
  const pool = [
    selectedTypes[0], selectedTypes[0], selectedTypes[0],
    selectedTypes[1], selectedTypes[1], selectedTypes[1]
  ]
  shuffleArray(pool)

  // 6 positions: 4 in bottom layer, 2 on top layer covering bottom
  const positions: CardPosition[] = [
    // Layer 0: 4 cards
    { x: 1.0, y: 1.0, layer: 0 },
    { x: 3.0, y: 1.0, layer: 0 },
    { x: 1.0, y: 3.0, layer: 0 },
    { x: 3.0, y: 3.0, layer: 0 },
    // Layer 1: 2 cards covering the center
    { x: 2.0, y: 2.0, layer: 1 },
    { x: 2.0, y: 2.0, layer: 2 }
  ]

  return positions.map((pos, idx) => ({
    id: idx + 1,
    type: pool[idx],
    x: pos.x,
    y: pos.y,
    layer: pos.layer,
    status: 'board',
    isCovered: false
  }))
}

// Generate Level 2 (Challenging Pyramid & Wings, 48 cards, 16 sets of 3)
export function generateLevel2(availableTypes: string[]): CardItem[] {
  // Use up to 7 types
  const typesToUse = availableTypes.slice(0, 7)
  const totalSets = 16 // 16 * 3 = 48 cards
  const pool: string[] = []

  for (let i = 0; i < totalSets; i++) {
    const t = typesToUse[i % typesToUse.length]
    pool.push(t, t, t)
  }

  // Shuffle pool thoroughly
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const positions: CardPosition[] = []

  // Center Pyramid Layers
  // Layer 0: 4x4 grid (16 cards)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      positions.push({ x: 1.0 + col * 1.0, y: 1.0 + row * 1.0, layer: 0 })
    }
  }

  // Layer 1: 3x3 staggered (9 cards)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      positions.push({ x: 1.5 + col * 1.0, y: 1.5 + row * 1.0, layer: 1 })
    }
  }

  // Layer 2: 2x2 centered (4 cards)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      positions.push({ x: 2.0 + col * 1.0, y: 2.0 + row * 1.0, layer: 2 })
    }
  }

  // Layer 3: 2 cards stacked on top
  positions.push({ x: 2.5, y: 2.5, layer: 3 })
  positions.push({ x: 2.5, y: 2.5, layer: 4 })

  // Left Wing Pile (staggered stack, 8 cards)
  for (let i = 0; i < 8; i++) {
    positions.push({ x: 0.2 + (i % 2) * 0.2, y: 1.5 + i * 0.45, layer: i })
  }

  // Right Wing Pile (staggered stack, 8 cards)
  for (let i = 0; i < 8; i++) {
    positions.push({ x: 4.6 - (i % 2) * 0.2, y: 1.5 + i * 0.45, layer: i })
  }

  // Extra loose cards to reach 48 cards exactly
  positions.push({ x: 2.0, y: 0.2, layer: 0 })

  const finalPositions = positions.slice(0, 48)

  return finalPositions.map((pos, idx) => ({
    id: idx + 100,
    type: pool[idx],
    x: pos.x,
    y: pos.y,
    layer: pos.layer,
    status: 'board',
    isCovered: false
  }))
}

// Generate Level 3 (♥ Romantic Heart Shape, 42 cards = 14 sets of 3)
export function generateLevel3(availableTypes: string[]): CardItem[] {
  const typesToUse = availableTypes.slice(0, 6)
  const totalSets = 14 // 14 * 3 = 42 cards
  const pool: string[] = []

  for (let i = 0; i < totalSets; i++) {
    const t = typesToUse[i % typesToUse.length]
    pool.push(t, t, t)
  }

  shuffleArray(pool)

  // 严格居中且适配 360x390 视口的心形布局（防止尖端与边缘被截断）
  const heartCoords: [number, number][] = [
    // 顶部双峰 (y=0.3 ~ 0.9)
    [1.3, 0.3], [1.9, 0.3], [3.1, 0.3], [3.7, 0.3],
    [0.8, 0.9], [1.6, 0.9], [3.4, 0.9], [4.2, 0.9],
    // 中部最宽主体 (y=1.6 ~ 2.3)
    [0.6, 1.6], [1.5, 1.6], [2.5, 1.6], [3.5, 1.6], [4.4, 1.6],
    [0.9, 2.3], [1.9, 2.3], [3.1, 2.3], [4.1, 2.3],
    // 下部收敛 (y=3.0 ~ 3.7)
    [1.5, 3.0], [2.5, 3.0], [3.5, 3.0],
    [2.0, 3.7], [3.0, 3.7],
    // 底部爱心尖尖 (y=4.3, 完全在 390px 视口内，留足 40px 底边距)
    [2.5, 4.3]
  ] // 4 + 4 + 5 + 4 + 3 + 2 + 1 = 23 张基础层

  const positions: CardPosition[] = heartCoords.map(c => ({ x: c[0], y: c[1], layer: 0 }))

  // 内层爱心 Layer 1 (12 cards)
  const innerCoords1: [number, number][] = [
    [1.4, 1.2], [3.6, 1.2],
    [1.1, 1.8], [2.0, 1.8], [3.0, 1.8], [3.9, 1.8],
    [1.6, 2.5], [2.5, 2.5], [3.4, 2.5],
    [2.1, 3.2], [2.9, 3.2],
    [2.5, 3.8]
  ]
  innerCoords1.forEach(c => positions.push({ x: c[0], y: c[1], layer: 1 }))

  // 核心立体层 Layer 2 & 3 (7 cards to reach 42)
  const innerCoords2: [number, number][] = [
    [1.6, 1.9], [3.4, 1.9],
    [2.0, 2.5], [3.0, 2.5],
    [2.5, 3.1],
    [2.5, 2.0]
  ]
  innerCoords2.forEach(c => positions.push({ x: c[0], y: c[1], layer: 2 }))
  // 顶峰最高单张
  positions.push({ x: 2.5, y: 2.5, layer: 3 })

  const finalPositions = positions.slice(0, 42)

  return finalPositions.map((pos, idx) => ({
    id: idx + 300,
    type: pool[idx],
    x: pos.x,
    y: pos.y,
    layer: pos.layer,
    status: 'board',
    isCovered: false
  }))
}

// Recompute coverage status for all cards on the board
export function updateCardCoverage(cards: CardItem[]) {
  const boardCards = cards.filter(c => c.status === 'board')

  for (let i = 0; i < boardCards.length; i++) {
    const cardA = boardCards[i]
    let covered = false

    for (let j = 0; j < boardCards.length; j++) {
      if (i === j) continue
      const cardB = boardCards[j]
      // If card B is strictly above card A and overlaps in (x, y)
      if (cardB.layer > cardA.layer && checkCardOverlap(cardA, cardB)) {
        covered = true
        break
      }
    }
    cardA.isCovered = covered
  }
}
