import { test, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { defaultGameSettings, normalizeGameSettings, layoutGrid } from '../shared/gameConfig.js'
import { createLevel, updateCardCoverage, checkCardOverlap } from '../src/utils/levelGenerator'
import { getBoardLayout, getBoardCardStyle } from '../src/utils/boardGeometry'

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
