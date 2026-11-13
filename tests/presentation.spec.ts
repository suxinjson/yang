import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { backend } from './helpers/backend'
import { normalizeCardTextMode } from '../shared/gameConfig.js'

test('card text modes normalize and persist without changing old board settings', async () => {
  for (const input of [undefined, null, '', true, {}, 'invalid']) expect(normalizeCardTextMode(input)).toBe('name')
  const server = await backend()
  try {
    const token = await server.login()
    const initial = (await (await fetch(server.base + '/api/state')).json()).state
    expect(initial.config.cardTextMode).toBe('name')
    for (const mode of ['none', 'description', 'name']) {
      const response = await server.post('/api/config', { cardTextMode: mode }, token)
      expect(response.status).toBe(200)
      const { state } = await response.json()
      expect(state.config.cardTextMode).toBe(mode)
      expect(state.config.gameSettings).toEqual(initial.config.gameSettings)
      expect(state.config).not.toHaveProperty('summonCostEnabled')
    }
    await server.post('/api/config', { cardTextMode: 'none' }, token)
    await server.restart()
    expect((await (await fetch(server.base + '/api/state')).json()).state.config.cardTextMode).toBe('none')
  } finally { await server.close() }
})

test('admin config controls card text on both room pages, tray and staging while hidden labels remain accessible', async ({ page, browser }) => {
  const server = await backend(), partner = await browser.newPage({ viewport: { width: 390, height: 844 } })
  try {
    const token = await server.login()
    await server.post('/api/config', { cardTextMode: 'description', gameSettings: { levels: [{ minCards: 18, maxCards: 18, types: 2 }] } }, token)
    await server.attach(page, true); await server.attach(partner, true)
    await page.setViewportSize({ width: 390, height: 844 })
    await Promise.all([page.goto('/'), partner.goto('/')])
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('.board-arena .card-description').first()).toBeVisible()
    await page.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await page.getByRole('button', { name: '创建情侣房间', exact: true }).click()
    const code = await page.getByTestId('room-code').innerText()
    await partner.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await partner.getByLabel('四位房间密码').fill(code)
    await partner.getByRole('button', { name: '加入房间', exact: true }).click()
    await expect(page.getByTestId('mode-panel').getByRole('status')).toContainText('已连接 2/2')
    await page.locator('.board-arena .is-clickable').first().click()
    await expect(partner.locator('.main-tray .card-description')).toHaveCount(1)
    await page.getByRole('button', { name: /召唤男友卡/ }).click()
    await partner.getByRole('button', { name: '继续一起闯关', exact: true }).click()
    await expect(partner.locator('.staged-area .card-description')).toHaveCount(1)
    await server.post('/api/config', { cardTextMode: 'none' }, token)
    await expect(page.locator('.card-copy')).toHaveCount(0)
    await expect(partner.locator('.card-copy')).toHaveCount(0)
    await expect(page.locator('.board-arena .is-clickable').first()).toHaveAttribute('aria-label', /.+/)
    const pendingRequests: string[] = []
    page.on('request', req => { if (req.url().includes('/api/')) pendingRequests.push(req.url()) })
    await page.screenshot({ path: 'artifacts/ui/game-mobile.png', fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await server.post('/api/config', { cardTextMode: 'name' }, token)
    await expect(page.locator('.card-name').first()).toBeVisible()
    await expect(page.locator('.card-description')).toHaveCount(0)
    expect(pendingRequests.some(url => /card_pick|events|heartbeat/.test(url))).toBe(false)
  } finally { await partner.close(); await page.close(); await server.close() }
})

test('admin card preview saves display settings and edits cards and reward pools in place', async ({ page }) => {
  const server = await backend()
  const config = () => JSON.parse(readFileSync(path.join(server.directory, 'config.json'), 'utf8'))
  try {
    await server.attach(page); await page.setViewportSize({ width: 1280, height: 900 }); await page.goto('/admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: '登录后台', exact: true }).click()
    await page.getByRole('button', { name: '卡牌种类与图片', exact: true }).click()
    await page.getByLabel('卡片文字', { exact: true }).selectOption('none')
    await expect.poll(() => config().cardTextMode).toBe('none')
    await expect(page.locator('.card-preview .card-copy')).toHaveCount(0)
    await page.getByLabel('卡片文字', { exact: true }).selectOption('description')
    await expect.poll(() => config().cardTextMode).toBe('description')
    await expect(page.locator('.card-preview .card-description')).toBeVisible()
    await page.screenshot({ path: 'artifacts/ui/admin-cards-desktop.png', fullPage: true })
    await page.getByRole('button', { name: '添加卡牌', exact: true }).click()
    await page.getByLabel('新卡片名称').fill('午后咖啡')
    await page.getByLabel('新卡片描述').fill('一起休息一会')
    await page.getByRole('button', { name: '添加', exact: true }).click()
    await expect.poll(() => config().customCards.some((card: any) => card.name === '午后咖啡')).toBe(true)
    await page.getByRole('button', { name: '男友心愿', exact: true }).click()
    await page.getByLabel('券名称', { exact: true }).fill('散步')
    await page.getByLabel('券说明', { exact: true }).fill('晚饭后一起走走')
    await page.getByRole('button', { name: '添加', exact: true }).click()
    await expect.poll(() => config().girlfriendTasks[0].title).toBe('散步')
    await page.getByLabel('散步说明', { exact: true }).fill('周末一起走走')
    await page.getByLabel('散步说明', { exact: true }).press('Tab')
    await expect.poll(() => config().girlfriendTasks[0].desc).toBe('周末一起走走')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'artifacts/ui/admin-mobile.png', fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.board-arena')).toHaveCount(0)
  } finally { await page.close(); await server.close() }
})
