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

// Generate Level 1 (Warm up, 6 cards total, 2 sets of 3)
export function generateLevel1(availableTypes: string[]): CardItem[] {
  const selectedTypes = availableTypes.slice(0, 2)
  const pool = [
    selectedTypes[0], selectedTypes[0], selectedTypes[0],
    selectedTypes[1], selectedTypes[1], selectedTypes[1]
  ]
  // Shuffle pool
  pool.sort(() => Math.random() - 0.5)

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

  pool.sort(() => Math.random() - 0.5)

  // Heart-shaped layout coordinates
  const heartCoords: [number, number][] = [
    // Top bumps
    [1.5, 0.8], [2.5, 0.8], [3.5, 0.8], [4.5, 0.8],
    [1.0, 1.6], [2.0, 1.6], [3.0, 1.6], [4.0, 1.6], [5.0, 1.6],
    // Middle wide body
    [0.6, 2.4], [1.6, 2.4], [2.6, 2.4], [3.6, 2.4], [4.6, 2.4], [5.4, 2.4],
    [1.0, 3.2], [2.0, 3.2], [3.0, 3.2], [4.0, 3.2], [5.0, 3.2],
    // Lower taper
    [1.6, 4.0], [2.6, 4.0], [3.6, 4.0], [4.4, 4.0],
    [2.2, 4.8], [3.0, 4.8], [3.8, 4.8],
    // Bottom tip
    [3.0, 5.5]
  ] // 23 positions on base layer 0

  const positions: CardPosition[] = heartCoords.map(c => ({ x: c[0], y: c[1], layer: 0 }))

  // Inner Heart Layer 1 (12 cards)
  const innerCoords1: [number, number][] = [
    [1.8, 1.8], [2.6, 1.8], [3.4, 1.8], [4.2, 1.8],
    [1.6, 2.6], [2.4, 2.6], [3.2, 2.6], [4.0, 2.6], [4.4, 2.6],
    [2.2, 3.4], [3.0, 3.4], [3.8, 3.4]
  ]
  innerCoords1.forEach(c => positions.push({ x: c[0], y: c[1], layer: 1 }))

  // Inner Peak Layer 2 (7 cards to reach 42)
  const innerCoords2: [number, number][] = [
    [2.2, 2.2], [3.0, 2.2], [3.8, 2.2],
    [2.6, 3.0], [3.4, 3.0],
    [3.0, 3.8],
    [3.0, 2.6]
  ]
  innerCoords2.forEach((c, idx) => positions.push({ x: c[0], y: c[1], layer: 2 + (idx >= 6 ? 1 : 0) }))

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
