import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { defaultGameSettings } from '../shared/gameConfig.js'

async function adminFixture(page: Page) {
  let config: any = { gameSettings: defaultGameSettings() }
  let writes = 0
  const snapshot = () => ({ epoch: 'fixture', revision: writes + 1, configVersion: createHash('sha256').update(JSON.stringify(config)).digest('hex'), config, coupons: [] })
  let rejectWrites = false
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/admin/login')) {
      const success = route.request().postDataJSON().password === 'admin'
      await route.fulfill({ status: success ? 200 : 401, json: success ? { success, token: 'test-admin-session' } : { success } })
    } else if (url.pathname.endsWith('/state')) {
      await route.fulfill({ json: { state: snapshot() } })
    } else if (url.pathname.endsWith('/config')) {
      if (route.request().method() === 'POST') {
        writes++
        if (rejectWrites) return route.fulfill({ status: 503, json: { success: false } })
        config = route.request().postDataJSON()
      }
      await route.fulfill({ json: { ...config, state: snapshot() } })
    } else {
      await route.fulfill({ json: [] })
    }
  })
  await page.route('**/photos/**', route => route.abort())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?admin')
  await expect(page.getByText('后台管理身份验证')).toBeVisible()
  return { getConfig: () => config, getWrites: () => writes, rejectWrites: () => { rejectWrites = true } }
}

async function login(page: Page) {
  await page.getByPlaceholder('请输入管理员密码...').fill('admin')
  await page.getByRole('button', { name: /登录后台/ }).click()
  await expect(page.getByTestId('game-settings')).toBeVisible()
}

test('admin saves per-level rules, applies on restart and restores after refresh', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const fixture = await adminFixture(page)
  expect(fixture.getWrites()).toBe(0)
  await expect(page.locator('.board-arena')).toHaveCount(0)
  await login(page)
  expect(fixture.getWrites()).toBe(0)
  await page.getByLabel('棋盘宽度', { exact: true }).fill('360')
  await page.getByLabel('棋盘高度', { exact: true }).fill('640')
  await page.getByLabel('第1关最少张数', { exact: true }).fill('36')
  await page.getByLabel('第1关最多张数', { exact: true }).fill('36')
  await page.getByLabel('第1关层叠数量', { exact: true }).fill('3')
  await page.getByLabel('第1关牌型数量', { exact: true }).fill('2')
  await page.getByLabel('第1关横向范围(%)', { exact: true }).fill('70')
  await page.getByLabel('第1关随机扰动(%)', { exact: true }).fill('0')
  await page.getByLabel('第1关摆放造型', { exact: true }).selectOption('heart')
  await page.getByRole('button', { name: '保存关卡配置', exact: true }).click()
  await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
  expect(fixture.getConfig().gameSettings.levels[0].minCards).toBe(36)
  await page.getByLabel('棋盘宽度', { exact: true }).fill('380')
  await expect(page.getByText('已保存并同步到服务器', { exact: true })).toHaveCount(0)
  await page.getByLabel('棋盘宽度', { exact: true }).fill('360')
  await expect(page.locator('.board-arena')).toHaveCount(0)
  await page.getByRole('button', { name: '关卡与布局', exact: true }).click()
  await page.getByLabel('棋盘宽度', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/admin-game-settings.png' })
  await page.getByRole('button', { name: '保存全部配置' }).click()
  await expect(page.getByTestId('game-settings')).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.board-arena .game-card')).toHaveCount(36)
  const round = await page.evaluate(() => {
    const state = (document.querySelector('#app') as any).__vue_app__._instance.setupState
    return { types: [...new Set(state.allCards.map((c: any) => c.type))].length, layers: [...new Set(state.allCards.map((c: any) => c.layer))].length, height: state.boardLayout.height }
  })
  expect(round).toEqual({ types: 2, layers: 3, height: 640 })
  await page.goto('/')
  await expect(page.locator('.board-arena .game-card')).toHaveCount(36)
  expect(errors).toEqual([])
})

test('failed remote saves preserve the draft and do not claim synchronization', async ({ page }) => {
  const fixture = await adminFixture(page)
  await login(page)
  fixture.rejectWrites()
  await page.getByLabel('第1关最少张数', { exact: true }).fill('31')
  await page.getByLabel('第1关最多张数', { exact: true }).fill('25')
  await page.getByRole('button', { name: '保存关卡配置', exact: true }).click()
  await expect(page.getByText(/保存失败，请重试/)).toBeVisible()
  await expect(page.getByText(/已修正参数范围/)).toBeVisible()
  await expect(page.getByLabel('第1关最少张数', { exact: true })).toHaveValue('25')
  await expect(page.getByLabel('第1关最多张数', { exact: true })).toHaveValue('31')
  await page.getByRole('button', { name: '保存全部配置' }).click()
  await expect(page.getByTestId('game-settings')).toBeVisible()
  await expect(page.getByText('已保存并同步到服务器', { exact: true })).toHaveCount(0)
})

test('dashboard never mounts a game or exposes player controls', async ({ page }) => {
  await adminFixture(page); await login(page)
  for (const name of [/卡牌种类与图片/, /心愿券设置/, /关卡与布局/]) {
    await page.getByRole('button', { name }).click()
    await expect(page.locator('.board-arena')).toHaveCount(0)
    await expect(page.getByTitle('重新开始本关')).toHaveCount(0)
  }
})

test('saving includes layout edits after switching tabs and stays on dashboard', async ({ page }) => {
  const fixture = await adminFixture(page)
  await login(page)
  await page.getByLabel('第1关最少张数', { exact: true }).fill('42')
  await page.getByLabel('第1关最多张数', { exact: true }).fill('42')
  await page.getByRole('button', { name: /卡牌种类与图片/ }).click()
  await page.getByRole('button', { name: '保存全部配置' }).click()
  await expect(page.getByRole('button', { name: '保存全部配置' })).toBeVisible()
  expect(fixture.getConfig().gameSettings.levels[0].minCards).toBe(42)
  await page.goto('/')
  await expect(page.locator('.board-arena .game-card')).toHaveCount(42)
})

test('a full local cache does not undo a successful server save', async ({ page }) => {
  const fixture = await adminFixture(page)
  await login(page)
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage quota exceeded') } })
  await page.getByRole('button', { name: '保存全部配置' }).click()
  await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
  await expect(page.getByTestId('game-settings')).toBeVisible()
  expect(fixture.getWrites()).toBe(1)
})

test('rapid saves keep the latest snapshot despite a slow first request', async ({ page }) => {
  await adminFixture(page)
  let savedName = ''
  let requests = 0
  await page.route('**/api/config', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    const data = route.request().postDataJSON()
    requests++
    if (requests === 1) await new Promise(resolve => setTimeout(resolve, 100))
    savedName = data.couponName
    await route.fulfill({ json: { success: true } })
  })
  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/adminConfig.ts'
    const { loadAdminConfig, saveAdminConfig } = await import(modulePath)
    const config = loadAdminConfig()
    return Promise.all([
      saveAdminConfig({ ...config, couponName: 'first' }),
      saveAdminConfig({ ...config, couponName: 'latest' })
    ])
  })
  expect(result).toEqual(['synced', 'synced'])
  expect(savedName).toBe('latest')
})

test('wrong passwords cannot unlock the dashboard through local fallback', async ({ page }) => {
  await adminFixture(page)
  await page.getByPlaceholder('请输入管理员密码...').fill('wrong')
  await page.getByRole('button', { name: /登录后台/ }).click()
  await expect(page.getByText('密码错误，请重新输入！')).toBeVisible()
  await expect(page.getByTestId('game-settings')).toHaveCount(0)
})

test('an empty server coupon list replaces stale local records', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('couple_game_love_coupons_v2', JSON.stringify([{ id: 'stale', title: '旧记录', used: false }]))
  })
  await adminFixture(page)
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('couple_game_love_coupons_v2') || '[]').length)).toBe(0)
})

test('malformed cached data does not prevent the game or dashboard from opening', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('couple_game_love_coupons_v2', 'null')
    localStorage.setItem('couple_game_admin_config_v3', JSON.stringify({ girlfriendTasks: null, customCards: [null], gameSettings: 'invalid' }))
  })
  await adminFixture(page)
  await login(page)
  await expect(page.locator('.board-arena')).toHaveCount(0)
  await page.goto('/')
  await expect(page.locator('.board-arena .game-card').first()).toBeAttached()
  expect(errors).toEqual([])
})
