import { test, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { defaultGameSettings, normalizeGameSettings, layoutGrid } from '../shared/gameConfig.js'
import { createLevel, updateCardCoverage, checkCardOverlap } from '../shared/levelGenerator.js'
import { getBoardLayout, getBoardCardStyle } from '../shared/boardGeometry.js'

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

test('old, partial and malformed settings normalize without mutating defaults', () => {
  const initial = defaultGameSettings()
  for (const raw of [null, [], 'invalid', {}, { levels: [null] }]) {
    expect(normalizeGameSettings(raw)).toEqual(initial)
  }
  const fixed = normalizeGameSettings({ boardWidth: NaN, boardHeight: 10000, levels: [{ minCards: 99, maxCards: 7, layers: 0, spreadX: -20, randomness: Infinity }] })
  expect(fixed.boardWidth).toBe(420)
  expect(fixed.boardHeight).toBe(640)
  expect(fixed.levels[0].layers).toBe(1)
  expect(fixed.levels[0].spreadX).toBe(60)
  expect(fixed.levels[0].minCards).toBe(6)
  expect(fixed.levels[0].maxCards % 3).toBe(0)
  expect(normalizeGameSettings(fixed)).toEqual(fixed)
  fixed.levels[0].types = 10
  expect(defaultGameSettings()).toEqual(initial)
})

test('extreme sizes, ranges, layers and shapes respect capacity and remain solvable', () => {
  test.setTimeout(120_000)
  let tested = 0
  for (const [boardWidth, boardHeight] of [[360, 420], [480, 640]]) {
    for (const spreadX of [60, 100]) for (const spreadY of [60, 100]) {
      for (const layers of [1, 8]) for (const layout of ['scatter', 'heart']) for (const randomness of [0, 100]) {
        const settings = normalizeGameSettings({ boardWidth, boardHeight, levels: [{ minCards: 240, maxCards: 240, types: 12, spreadX, spreadY, layers, layout, randomness }] })
        const rules = settings.levels[0]
        const grid = layoutGrid(settings, rules)
        const { cards, solution } = createLevel(1, Array.from({ length: 12 }, (_, i) => `${i}`), Math.random, settings)
        assert.equal(cards.length, rules.maxCards)
        assert.equal(cards.length % 3, 0)
        assert.equal(solution.length, cards.length)
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i]
          assert(card.x >= 0 && card.x <= grid.maxX)
          assert(card.y >= 0 && card.y <= grid.maxY)
          assert(Math.abs(card.x - grid.maxX / 2) <= grid.spanX / 2)
          assert(Math.abs(card.y - grid.maxY / 2) <= grid.spanY / 2)
          const style = getBoardCardStyle(card, getBoardLayout(settings))
          assert(parseFloat(style.left) + parseFloat(style.width) <= 100)
          assert(parseFloat(style.top) + parseFloat(style.height) <= 100)
          for (let j = i + 1; j < cards.length; j++) {
            if (cards[j].layer === card.layer) assert(!checkCardOverlap(card, cards[j]))
          }
        }
        let tray: string[] = []
        for (const index of solution) {
          updateCardCoverage(cards)
          assert(!cards[index].isCovered)
          tray.push(cards[index].type)
          if (tray.filter(type => type === cards[index].type).length === 3) tray = tray.filter(type => type !== cards[index].type)
          cards[index].status = 'cleared'
          assert(tray.length < 7)
        }
        assert.equal(tray.length, 0)
        tested++
      }
    }
  }
  expect(tested).toBe(64)
})

test('impossible solvability mode creates unmatchable cards', () => {
  const settings = normalizeGameSettings({
    levels: [{ minCards: 18, maxCards: 18, solvability: 'impossible' }]
  })
  const { cards } = createLevel(1, ['A', 'B', 'C', 'D'], Math.random, settings)
  expect(cards.length).toBe(18)
  const counts: Record<string, number> = {}
  for (const c of cards) {
    counts[c.type] = (counts[c.type] || 0) + 1
  }
  const hasOrphan = Object.values(counts).some(count => count % 3 !== 0)
  expect(hasOrphan).toBe(true)
})

test('totalLevels supports 1 to 5 levels and initializes accordingly', () => {
  const fiveLevelSettings = normalizeGameSettings({
    totalLevels: 5,
    levels: [
      { minCards: 6, maxCards: 6 },
      { minCards: 12, maxCards: 12 },
      { minCards: 18, maxCards: 18 },
      { minCards: 24, maxCards: 24 },
      { minCards: 30, maxCards: 30 }
    ]
  })
  expect(fiveLevelSettings.totalLevels).toBe(5)
  expect(fiveLevelSettings.levels.length).toBe(5)
  expect(fiveLevelSettings.levels[4].minCards).toBe(30)

  const oneLevelSettings = normalizeGameSettings({
    totalLevels: 1
  })
  expect(oneLevelSettings.totalLevels).toBe(1)
  expect(oneLevelSettings.levels.length).toBe(1)
})

test('card dimensions and slot settings are properly clamped and normalized', () => {
  const settings = normalizeGameSettings({
    cardWidth: 70,
    cardHeight: 85,
    initialSlots: 5,
    maxSlots: 8,
    slotUnlockCondition: 'boyfriend_rescue',
    slotUnlockMatchCount: 5
  })
  expect(settings.cardWidth).toBe(70)
  expect(settings.cardHeight).toBe(85)
  expect(settings.initialSlots).toBe(5)
  expect(settings.maxSlots).toBe(8)
  expect(settings.slotUnlockCondition).toBe('boyfriend_rescue')
  expect(settings.slotUnlockMatchCount).toBe(5)

  const clamped = normalizeGameSettings({
    cardWidth: 10,
    cardHeight: 200,
    initialSlots: 2,
    maxSlots: 10,
    slotUnlockCondition: 'invalid_mode',
    slotUnlockMatchCount: 20
  })
  expect(clamped.cardWidth).toBe(48)
  expect(clamped.cardHeight).toBe(96)
  expect(clamped.initialSlots).toBe(4)
  expect(clamped.maxSlots).toBe(8)
  expect(clamped.slotUnlockCondition).toBe('match_count')
  expect(clamped.slotUnlockMatchCount).toBe(10)
})

test('certified paths respect initial slots and custom card geometry across all five levels', () => {
  for (const initialSlots of [4, 5, 6, 7, 8]) for (const [cardWidth, cardHeight] of [[48, 56], [54, 64], [80, 96]]) {
    for (const solvability of ['guaranteed', 'hard']) for (const seed of [42, 81, 159]) {
      const settings = normalizeGameSettings({ initialSlots, maxSlots: initialSlots, cardWidth, cardHeight, totalLevels: 5,
        levels: Array.from({ length: 5 }, () => ({ minCards: 120, maxCards: 120, types: 12, layers: 8, randomness: 100, solvability })) })
      for (const level of [1, 2, 3, 4, 5]) {
        const { cards, solution } = createLevel(level, Array.from({ length: 12 }, (_, i) => `${i}`), seeded(seed), settings)
        expect(solution).toHaveLength(cards.length)
        let tray: string[] = []
        for (const index of solution) {
          updateCardCoverage(cards, cardWidth / (cardWidth + 4), cardHeight / (cardHeight + 4))
          assert(!cards[index].isCovered, `covered card: level=${level}, seed=${seed}, size=${cardWidth}x${cardHeight}`)
          assert.equal(cards[index].status, 'board')
          tray.push(cards[index].type)
          if (tray.filter(type => type === cards[index].type).length === 3) tray = tray.filter(type => type !== cards[index].type)
          assert(tray.length < initialSlots, `full tray: level=${level}, seed=${seed}, slots=${initialSlots}`)
          cards[index].status = 'cleared'
        }
        assert.equal(tray.length, 0)
      }
    }
  }
  // The small, deeply stacked board from the original four-slot deadlock.
  const { cards, solution } = createLevel(1, ['a', 'b', 'c'], seeded(159), {
    initialSlots: 4, maxSlots: 4, levels: [{ minCards: 18, maxCards: 18, types: 3, layers: 8, spreadX: 60, spreadY: 60 }]
  })
  let tray: string[] = []
  for (const index of solution) {
    updateCardCoverage(cards)
    expect(cards[index].isCovered).toBe(false)
    tray.push(cards[index].type)
    if (tray.filter(type => type === cards[index].type).length === 3) tray = tray.filter(type => type !== cards[index].type)
    expect(tray.length).toBeLessThan(4)
    cards[index].status = 'cleared'
  }
  expect(tray).toEqual([])
})

test('normal deals shuffle triples freely and hard paths use more tray capacity than guaranteed paths', () => {
  const peaks = { guaranteed: 0, hard: 0 }
  let normalDiffers = 0
  const types = Array.from({ length: 9 }, (_, i) => `${i}`)
  for (const level of [1, 2, 3, 4, 5]) for (const seed of [1, 42, 81, 159]) {
    const generate = (solvability: string) => createLevel(level, types, seeded(seed), {
      totalLevels: 5, levels: Array.from({ length: 5 }, () => ({ minCards: 90, maxCards: 90, types: 9, solvability }))
    })
    const normal = generate('normal')
    const guaranteed = generate('guaranteed')
    if (normal.cards.some((card, index) => card.type !== guaranteed.cards[index].type)) normalDiffers++
    expect(normal.solution).toEqual([])
    for (const type of new Set(normal.cards.map(card => card.type))) expect(normal.cards.filter(card => card.type === type).length % 3).toBe(0)
    for (const mode of ['guaranteed', 'hard'] as const) {
      const { cards, solution } = mode === 'guaranteed' ? guaranteed : generate(mode)
      let tray: string[] = [], peak = 0
      for (const index of solution) {
        tray.push(cards[index].type)
        if (tray.filter(type => type === cards[index].type).length === 3) tray = tray.filter(type => type !== cards[index].type)
        peak = Math.max(peak, tray.length)
      }
      peaks[mode] += peak
    }
  }
  expect(normalDiffers).toBe(20)
  expect(peaks.hard).toBeGreaterThan(peaks.guaranteed)
})
