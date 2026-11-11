import { test, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createLevel, LEVEL_RULES, updateCardCoverage, checkCardOverlap } from '../src/utils/levelGenerator'
import { BOARD_MAX_X, BOARD_MAX_Y, BOARD_LAYOUT, getBoardCardStyle } from '../src/utils/boardGeometry'

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

const types = Array.from({ length: 12 }, (_, i) => `card-${i}`)

for (const level of [1, 2, 3] as const) {
  test(`level ${level}: 100 random boards fit, vary, and can be solved in seven slots`, () => {
    const layouts = new Set<string>()
    const totals = new Set<number>()
    const usedTypes = new Set<string>()
    for (let seed = 1; seed <= 100; seed++) {
      const { cards, solution } = createLevel(level, types, seeded(seed))
      const rules = LEVEL_RULES[level]
      expect(cards.length).toBeGreaterThanOrEqual(rules.minSets * 3)
      expect(cards.length).toBeLessThanOrEqual(rules.maxSets * 3)
      expect(new Set(cards.map(c => c.id)).size).toBe(cards.length)
      expect(solution.length).toBe(cards.length)
      expect(cards.filter(c => !c.isCovered).length).toBeGreaterThanOrEqual(3)
      totals.add(cards.length)
      layouts.add(JSON.stringify(cards.map(({ x, y, layer }) => [x, y, layer])))
      const counts = new Map<string, number>()
      for (const card of cards) {
        assert(types.includes(card.type))
        usedTypes.add(card.type)
        counts.set(card.type, (counts.get(card.type) || 0) + 1)
        assert(card.x >= 0 && card.x <= BOARD_MAX_X)
        assert(card.y >= 0 && card.y <= BOARD_MAX_Y)
        const style = getBoardCardStyle(card)
        assert(parseFloat(style.left) + parseFloat(style.width) < 100)
        assert(parseFloat(style.top) + parseFloat(style.height) < 100)
      }
      for (const count of counts.values()) expect(count % 3).toBe(0)
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          if (cards[i].layer === cards[j].layer) assert(!checkCardOverlap(cards[i], cards[j]))
        }
      }

      let tray: string[] = []
      for (const index of solution) {
        updateCardCoverage(cards)
        const card = cards[index]
        assert(!card.isCovered)
        assert.equal(card.status, 'board')
        tray.push(card.type)
        card.status = 'cleared'
        if (tray.filter(type => type === card.type).length === 3) tray = tray.filter(type => type !== card.type)
        assert(tray.length < 7)
      }
      expect(tray).toHaveLength(0)
    }
    expect(layouts.size).toBe(100)
    expect(totals.size).toBe(LEVEL_RULES[level].maxSets - LEVEL_RULES[level].minSets + 1)
    expect(usedTypes.size).toBe(types.length)
  })
}

test('coverage matches visible rectangles, DOM order, removal and undo', () => {
  const a = { id: 1, type: 'a', x: 0, y: 0, layer: 0, status: 'board' as const, isCovered: false }
  const b = { ...a, id: 2, x: 0.925, layer: 1 }
  expect(checkCardOverlap(a, b)).toBe(true)
  updateCardCoverage([a, b])
  expect(a.isCovered).toBe(true)
  b.x = BOARD_LAYOUT.cardWidth / BOARD_LAYOUT.stepX
  updateCardCoverage([a, b])
  expect(a.isCovered).toBe(false)
  b.x = 0
  b.layer = 0
  updateCardCoverage([a, b])
  expect(a.isCovered).toBe(true)
  expect(b.isCovered).toBe(false)
  updateCardCoverage([a, { ...b, status: 'slot' }])
  expect(a.isCovered).toBe(false)
  updateCardCoverage([a, b])
  expect(a.isCovered).toBe(true)
})

test('a single custom type is supported and empty types are rejected', () => {
  for (const level of [1, 2, 3] as const) {
    expect(createLevel(level, ['only', 'only'], seeded(42)).cards.every(c => c.type === 'only')).toBe(true)
    expect(() => createLevel(level, [])).toThrow()
  }
})
