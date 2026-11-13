import { test, expect, type Page } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { backend } from './helpers/backend'
import { normalizeGameSettings, layoutGrid } from '../shared/gameConfig.js'
import { createLevel, checkCardOverlap, updateCardCoverage } from '../shared/levelGenerator.js'
import { createGame, applyGameAction, settleGame } from '../shared/gameEngine.js'
import { getBoardLayout } from '../shared/boardGeometry.js'

const state = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((document.querySelector('#app') as any).__vue_app__._instance.setupState.game)))
const fixed = (count: number) => ({ minCards: count, maxCards: count, types: 1, layers: 1 })
function seeded(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 } }

test('counts survive normalization, API save, refresh, server restart and solo start beyond level five', async () => {
  const settings = normalizeGameSettings({ totalLevels: 12, levels: Array.from({ length: 12 }, (_, index) => fixed(index === 0 ? 520 : index === 11 ? 1314 : 6)) })
  expect(settings.levels).toHaveLength(12)
  expect(settings.levels[0].minCards).toBe(520)
  expect(settings.levels[11].maxCards).toBe(1314)
  expect(normalizeGameSettings(settings)).toEqual(settings)
  expect(normalizeGameSettings({ levels: Array.from({ length: 100 }, () => fixed(6)) }).levels).toHaveLength(100)
  const server = await backend()
  try {
    const response = await server.post('/api/config', { gameSettings: settings }, await server.login())
    expect(response.status).toBe(200)
    expect((await response.json()).state.config.gameSettings).toEqual(settings)
    expect(JSON.parse(readFileSync(path.join(server.directory, 'config.json'), 'utf8')).gameSettings).toEqual(settings)
    await server.restart()
    expect((await (await fetch(server.base + '/api/state')).json()).state.config.gameSettings).toEqual(settings)
    for (const [level, count] of [[1, 520], [12, 1314]]) {
      const start = await server.post('/api/play/solo/start', { deviceId: 'large_count_device', operationId: crypto.randomUUID(), level })
      expect(start.status).toBe(200)
      const { game } = await start.json()
      expect(game.level).toBe(level)
      expect(game.cards).toHaveLength(count)
      expect(new Set(game.cards.map((card: any) => card.id)).size).toBe(count)
    }
  } finally { await server.close() }
})

test('519, 522 and 1314 cards fit narrow layouts and complete through shared rules with four slots', () => {
  test.setTimeout(60000)
  for (const count of [519, 522, 1314]) for (const solvability of ['guaranteed', 'hard'] as const) {
    const settings = normalizeGameSettings({ totalLevels: 12, boardWidth: 360, boardHeight: 420, cardWidth: 80, cardHeight: 96, initialSlots: 4, maxSlots: 4,
      levels: Array.from({ length: 12 }, () => ({ ...fixed(count), types: 8, layout: 'heart', spreadX: 60, spreadY: 60, solvability })) })
    const game = createGame({ gameSettings: settings }, 12)
    const { cards, solution } = createLevel(12, game.defs.map(def => def.id), seeded(count), settings)
    game.cards = cards
    expect(cards).toHaveLength(count)
    expect(solution).toHaveLength(count)
    expect(new Set(cards.map(card => card.layer)).size).toBe(Math.ceil(count / layoutGrid(settings, settings.levels[11]).capacity))
    const layout = getBoardLayout(settings), width = layout.cardWidth / layout.stepX, height = layout.cardHeight / layout.stepY
    const grid = layoutGrid(settings, settings.levels[11])
    const layers = new Map<number, typeof cards>()
    for (const card of cards) {
      assert(card.x >= 0 && card.x <= grid.maxX && card.y >= 0 && card.y <= grid.maxY)
      for (const other of layers.get(card.layer) || []) assert(!checkCardOverlap(card, other, width, height))
      layers.set(card.layer, [...(layers.get(card.layer) || []), card])
    }
    let now = 1000
    for (const index of solution) {
      const card = cards[index]
      assert(!card.isCovered)
      applyGameAction(game, { type: 'pick', cardId: card.id }, now)
      while (game.resolveAt) { now = game.resolveAt; assert(settleGame(game, now)) }
      assert(game.slots.length < 4)
    }
    expect(game.phase).toBe('won')
    expect(game.slots).toEqual([])
    expect(cards.every(card => card.status === 'cleared')).toBe(true)
  }
})

test('spatial coverage stays exact and incomplete final groups never produce a false win or unlock', () => {
  const game = createGame({ gameSettings: { levels: [fixed(521)] } as any })
  for (const reverse of [false, true]) {
    if (reverse) game.cards.reverse()
    updateCardCoverage(game.cards)
    game.cards.forEach((card, index) => expect(card.isCovered).toBe(game.cards.some((other, otherIndex) =>
      (other.layer > card.layer || (other.layer === card.layer && otherIndex > index)) && checkCardOverlap(card, other))))
  }
  for (const count of [7, 8, 520, 521]) {
    const game = createGame({ gameSettings: { levels: [fixed(count)] } as any })
    const remainder = count % 3, final = game.cards.slice(-remainder)
    game.cards.forEach(card => { card.status = 'cleared' })
    final.forEach(card => { card.status = 'staged' })
    game.staged = final.map(card => card.id)
    game.matches = 0
    const slots = game.unlocked
    for (const card of final) applyGameAction(game, { type: 'return', cardId: card.id }, 1000)
    expect(game.eliminating).toHaveLength(0)
    expect(game.matches).toBe(0)
    expect(game.unlocked).toBe(slots)
    settleGame(game, 1240)
    expect(game.phase).toBe('lost')
    expect(final.every(card => card.status === 'slot')).toBe(true)
    // Checkpoints saved by the former short-group rule must also obey triples.
    game.phase = 'playing'; game.eliminating = final.map(card => card.id); game.resolveAt = 1240
    settleGame(game, 1240)
    expect(game.phase).toBe('lost')
    expect(final.every(card => card.status === 'slot')).toBe(true)
  }
  for (const count of [7, 8, 520, 521]) {
    const { cards } = createLevel(1, ['a', 'b'], seeded(count), { levels: [{ ...fixed(count), types: 2, solvability: 'impossible' }] })
    const residues = ['a', 'b'].map(type => cards.filter(card => card.type === type).length % 3).filter(Boolean)
    expect(residues).not.toEqual([count % 3])
  }
})

test('admin warns about exact 520, preserves it across thirteen levels, and 519 actual picks can win', async ({ page }) => {
  test.setTimeout(240000)
  const server = await backend()
  const config = () => JSON.parse(readFileSync(path.join(server.directory, 'config.json'), 'utf8'))
  try {
    await server.post('/api/config', { gameSettings: { levels: [fixed(6), fixed(6), fixed(6)] } }, await server.login())
    await server.attach(page)
    await page.goto('/admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: '登录后台', exact: true }).click()
    await page.getByLabel('关卡数量', { exact: true }).fill('12')
    await page.getByLabel('关卡数量', { exact: true }).press('Tab')
    await page.getByLabel('第1关最少张数', { exact: true }).fill('520')
    await page.getByLabel('第1关最多张数', { exact: true }).fill('520')
    await page.getByLabel('第12关最少张数', { exact: true }).fill('1314')
    await page.getByLabel('第12关最多张数', { exact: true }).fill('1314')
    await expect(page.getByRole('alert')).toContainText('520 张不是 3 的倍数')
    await page.getByRole('button', { name: '保存关卡配置', exact: true }).click()
    await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
    expect(config().gameSettings.levels).toHaveLength(12)
    expect(config().gameSettings.levels[0].minCards).toBe(520)
    expect(config().gameSettings.levels[11].maxCards).toBe(1314)
    await page.reload()
    await expect(page.getByLabel('第1关最少张数', { exact: true })).toHaveValue('520')
    await expect(page.getByLabel('第12关最多张数', { exact: true })).toHaveValue('1314')
    await expect(page.getByRole('alert')).toContainText('建议设置为 519 或 522 张')
    await page.getByLabel('关卡数量', { exact: true }).fill('13')
    await page.getByLabel('关卡数量', { exact: true }).press('Tab')
    await page.getByRole('button', { name: '保存全部配置', exact: true }).click()
    await expect.poll(() => config().gameSettings.levels.length).toBe(13)
    expect(config().gameSettings.levels[11].maxCards).toBe(1314)
    await page.getByLabel('第1关最少张数', { exact: true }).fill('519')
    await page.getByLabel('第1关最多张数', { exact: true }).fill('519')
    await page.getByRole('button', { name: '保存关卡配置', exact: true }).click()
    await expect.poll(() => config().gameSettings.levels[0].minCards).toBe(519)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.setViewportSize({ width: 390, height: 950 })
    await page.addInitScript(() => { (window as any).androidBridge = {} })
    await page.goto('/')
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('.board-arena .game-card')).toHaveCount(519)
    await page.clock.install()
    for (let pick = 0; pick < 519; pick++) {
      await page.locator('.board-arena .is-clickable').first().click()
      if ((pick + 1) % 3 === 0) await page.clock.runFor(500)
    }
    await expect(page.getByText('第 1 关顺利通关！', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '进入下一关！', exact: true })).toBeEnabled()
    const roundId = (await state(page)).roundId
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(ledger.transactions.filter((row: any) => row.event === 'coupon_gain' && row.details.roundId === roundId)).toHaveLength(1)
  } finally { await page.close(); await server.close() }
})

test('couple pages synchronize 1314 cards and never award a win for an unmatched 520-card checkpoint', async ({ page, browser }) => {
  test.setTimeout(120000)
  const server = await backend(), partner = await browser.newPage({ viewport: { width: 390, height: 950 } })
  try {
    const token = await server.login()
    await server.post('/api/config', { gameSettings: { totalLevels: 12, levels: Array.from({ length: 12 }, (_, index) => fixed(index === 11 ? 520 : 1314)) } }, token)
    await server.attach(page, true); await server.attach(partner, true)
    await page.setViewportSize({ width: 390, height: 950 })
    await Promise.all([page.goto('/'), partner.goto('/')])
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await page.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await page.getByRole('button', { name: '创建情侣房间', exact: true }).click()
    const code = await page.getByTestId('room-code').innerText()
    await partner.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await partner.getByLabel('四位房间密码').fill(code)
    await partner.getByRole('button', { name: '加入房间', exact: true }).click()
    await expect(page.getByTestId('mode-panel').getByRole('status')).toContainText('已连接 2/2')
    await expect(partner.locator('.board-arena .game-card')).toHaveCount(1314)
    await page.locator('.board-arena .is-clickable').first().click()
    await expect(partner.locator('.main-tray .in-slot')).toHaveCount(1)
    const credentials = await page.evaluate(() => JSON.parse(localStorage.getItem('gang_room_credentials')!))
    const reset = await server.post('/api/play/admin/control', { roomId: credentials.roomId, action: 'restart', level: 12, operationId: crypto.randomUUID() }, token)
    expect(reset.status).toBe(200)
    await expect(page.locator('.board-arena .game-card')).toHaveCount(520)
    await expect(partner.locator('.board-arena .game-card')).toHaveCount(520)
    // Restore a legitimate checkpoint just before a last triple plus one short
    // group. This exercises the real server timer chain without 174 wall-clock
    // animation delays in the room regression.
    const ledgerPath = path.join(server.directory, 'coupon-ledger.json')
    let roundId = ''
    await server.restart(() => {
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
      const game = ledger.rooms[credentials.roomId].game
      roundId = game.roundId
      game.cards.forEach((card: any) => { card.status = 'cleared' })
      const tail = game.cards.slice(-4)
      tail.forEach((card: any, index: number) => { card.type = game.defs[index === 3 ? 1 : 0].id; card.status = 'slot' })
      game.slots = tail.map((card: any) => card.id)
      game.eliminating = tail.slice(0, 3).map((card: any) => card.id)
      game.resolveAt = Date.now() + 2500
      writeFileSync(ledgerPath, JSON.stringify(ledger))
    })
    await Promise.all([page.reload(), partner.reload()])
    await expect(page.getByText('剩余卡片无法消除', { exact: true })).toBeVisible({ timeout: 30000 })
    await expect(partner.getByText('剩余卡片无法消除', { exact: true })).toBeVisible({ timeout: 30000 })
    expect((await state(page)).cards.filter((card: any) => card.status !== 'cleared')).toHaveLength(1)
    const finalLedger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
    expect(finalLedger.transactions.filter((row: any) => row.event === 'coupon_gain' && row.details.roundId === roundId)).toHaveLength(0)
  } finally { await partner.close(); await page.close(); await server.close() }
})
