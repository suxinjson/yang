import { test, expect } from '@playwright/test'
import { backend } from './helpers/backend'
import { defaultPublicConfig } from '../shared/defaultConfig.js'
import { cardCountWarning } from '../shared/gameConfig.js'
import { createLevel } from '../shared/levelGenerator.js'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const fixed = (count = 6) => ({ minCards: count, maxCards: count, types: 1, layers: 1 })
const logs = async (server: Awaited<ReturnType<typeof backend>>, token: string, query = '') =>
  (await (await fetch(server.base + '/api/admin/client-logs?limit=100&' + query, { headers: { Authorization: 'Bearer ' + token } })).json()).items as any[]

test('equal default wish pools describe the correct partner and supplementation preserves customized wishes', async ({ page }) => {
  const config = defaultPublicConfig()
  expect(config.girlfriendTasks).toHaveLength(12)
  expect(config.boyfriendRewards).toHaveLength(12)
  expect(config.girlfriendTasks.map(item => item.title)).toEqual(config.boyfriendRewards.map(item => item.title))
  expect(config.girlfriendTasks.every(item => item.target === 'girlfriend_pays' && item.desc.includes('女友'))).toBe(true)
  expect(config.boyfriendRewards.every(item => item.target === 'boyfriend_pays' && item.desc.includes('男友'))).toBe(true)
  expect(config.girlfriendTasks[0].desc).toContain('男友全权做主')
  expect(config.girlfriendTasks[0].desc).toContain('女友买单')
  const server = await backend()
  const custom = { ...config.girlfriendTasks[0], desc: '今天吃什么由男友全权做主，火锅烤肉日料随心挑，女友买单。' }
  try {
    const token = await server.login()
    await server.post('/api/config', { girlfriendTasks: [custom] }, token)
    await server.attach(page)
    await page.goto('/admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: '登录后台', exact: true }).click()
    await page.getByRole('button', { name: '男友心愿', exact: true }).click()
    await expect(page.getByText('男友选择，女友兑现或买单。', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '补充默认心愿', exact: true }).click()
    await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
    const saved = (await (await fetch(server.base + '/api/config')).json())
    expect(saved.girlfriendTasks).toHaveLength(12)
    expect(saved.girlfriendTasks.find((item: any) => item.id === custom.id).desc).toBe(custom.desc)
    await page.getByRole('button', { name: '女友心愿', exact: true }).click()
    await expect(page.getByText('女友选择，男友兑现或买单。', { exact: true })).toBeVisible()
  } finally { await page.close(); await server.close() }
})

test('invalid counts receive honest suggestions, and hard paths repeatedly occupy almost all slots', () => {
  expect(cardCountWarning(fixed(520))).toContain('519 或 522')
  expect(cardCountWarning(fixed(1314))).toBe('')
  expect(cardCountWarning({ minCards: 520, maxCards: 521 })).toContain('没有 3 的倍数')
  expect(cardCountWarning({ minCards: 520, maxCards: 524 })).toBe('')
  const types = Array.from({ length: 9 }, (_, i) => String(i))
  for (let seed = 1; seed <= 20; seed++) {
    let value = seed
    const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296 }
    const { cards, solution } = createLevel(2, types, random, { initialSlots: 7, totalLevels: 2, levels: [fixed(), { ...fixed(90), types: 9, solvability: 'hard' }] })
    let tray: string[] = [], pressure = 0
    expect(solution).toHaveLength(90)
    for (const index of solution) {
      const type = cards[index].type
      tray.push(type)
      if (tray.filter(item => item === type).length === 3) tray = tray.filter(item => item !== type)
      expect(tray.length).toBeLessThan(7)
      if (tray.length >= 5) pressure++
    }
    expect(tray).toEqual([])
    expect(pressure).toBeGreaterThan(35)
  }
})

test('native lifecycle callbacks distinguish background, foreground and explicit exit, with offline retry and no click logs', async ({ page, context }) => {
  const server = await backend()
  try {
    const token = await server.login()
    await server.post('/api/config', { gameSettings: { levels: [fixed()] } }, token)
    await page.addInitScript(() => {
      const win = window as any
      win.androidBridge = {}; win.nativeListeners = {}; win.nativeExited = false
      win.Capacitor = {
        PluginHeaders: [{ name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }, { name: 'exitApp', rtype: 'promise' }] }],
        nativeCallback: (_plugin: string, _method: string, options: any, callback: any) => { win.nativeListeners[options.eventName] = callback; return Promise.resolve(options.eventName) },
        nativePromise: (_plugin: string, method: string) => { if (method === 'exitApp') win.nativeExited = true; return Promise.resolve() }
      }
    })
    await server.attach(page)
    let loseAck = true
    await page.route('**/api/client/lifecycle', async route => {
      if (!loseAck) return route.fallback()
      loseAck = false
      await server.post('/api/client/lifecycle', route.request().postDataJSON())
      await route.abort()
    })
    await page.goto('/')
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await expect.poll(async () => (await logs(server, token, 'event=app_open')).length).toBe(1)
    await expect.poll(() => page.evaluate(() => typeof (window as any).nativeListeners.appStateChange)).toBe('function')
    await page.evaluate(() => { const win = window as any; win.nativeListeners.appStateChange({ isActive: false }); win.nativeListeners.appStateChange({ isActive: false }) })
    await expect.poll(async () => (await logs(server, token, 'event=app_background')).length).toBe(1)
    expect((await logs(server, token, 'event=app_open'))).toHaveLength(1)
    expect((await logs(server, token, 'event=app_exit'))).toHaveLength(0)
    await context.setOffline(true)
    await page.evaluate(() => (window as any).nativeListeners.appStateChange({ isActive: true }))
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('gang_lifecycle_queue_v1') || '[]').some((row: any) => row.event === 'app_foreground'))).toBe(true)
    await page.locator('.board-arena .is-clickable').first().click()
    await expect(page.locator('.main-tray .in-slot')).toHaveCount(1)
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect.poll(async () => (await logs(server, token, 'event=app_foreground')).length).toBe(1)
    await page.evaluate(() => (window as any).nativeListeners.backButton({ canGoBack: false }))
    await expect.poll(() => page.evaluate(() => (window as any).nativeExited)).toBe(true)
    const rows = await logs(server, token, 'category=lifecycle')
    expect(rows.filter(row => row.event === 'app_exit')).toHaveLength(1)
    expect(rows.every(row => row.source === 'android_app' && row.ip && row.sessionId && row.deviceId)).toBe(true)
    expect(new Set(rows.map(row => row.sessionId)).size).toBe(1)
    expect((await logs(server, token)).some(row => /card_pick|heartbeat/.test(row.event))).toBe(false)
  } finally { await page.close(); await server.close() }
})

test('lifecycle retries survive server restart, use occurrence dates, reject bad batches and sanitize private fields', async () => {
  const server = await backend()
  try {
    const report = { deviceId: 'lifecycle_device_123', sessionId: crypto.randomUUID(), eventId: crypto.randomUUID(), event: 'app_background', platform: 'android', version: '2.0.0',
      at: new Date(Date.now() - 86400000).toISOString(), details: { foregroundMs: 60000, reason: 'native_state', password: 'never-log-this', photo: 'never-log-this' } }
    expect((await server.post('/api/client/lifecycle', { reports: [report, report] })).status).toBe(200)
    await server.restart()
    expect((await server.post('/api/client/lifecycle', { reports: [report] })).status).toBe(200)
    const token = await server.login(), day = report.at.slice(0, 10)
    const rows = await logs(server, token, `from=${day}&to=${day}&category=lifecycle`)
    expect(rows).toHaveLength(1)
    expect(rows[0].at).toBe(report.at)
    expect(rows[0].details).toEqual({ foregroundMs: 60000, reason: 'native_state' })
    const report2 = { ...report, eventId: crypto.randomUUID(), at: day + 'T17:30:00.000Z' }
    await server.post('/api/client/lifecycle', { reports: [report2] })
    const localDay = new Date(Date.parse(report2.at) + 8 * 3600000).toISOString().slice(0, 10)
    expect((await logs(server, token, `from=${localDay}&to=${localDay}&timezoneOffset=-480`)).some(row => row.eventId === report2.eventId)).toBe(true)
    const invalid = { ...report, eventId: 'x', at: 'invalid' }
    expect((await server.post('/api/client/lifecycle', { reports: [report, invalid] })).status).toBe(400)
    expect((await fetch(server.base + '/api/admin/client-logs')).status).toBe(401)
    const text = readdirSync(path.join(server.directory, 'client-logs')).map(name => readFileSync(path.join(server.directory, 'client-logs', name), 'utf8')).join('')
    expect(text).not.toContain('never-log-this')
    const start = await (await server.post('/api/play/solo/start', { deviceId: report.deviceId, operationId: crypto.randomUUID(), level: 1 })).json()
    // Start a mathematically invalid count and reject an attempted false reward.
    await server.post('/api/config', { gameSettings: { levels: [fixed(520)] } }, token)
    const next = await (await server.post('/api/play/solo/start', { deviceId: report.deviceId, operationId: crypto.randomUUID(), level: 1 })).json()
    const finish = await server.post('/api/play/solo/finish', { roundId: next.game.roundId, token: next.token, outcome: 'won' })
    expect(finish.status).toBe(400)
    expect((await logs(server, token, 'event=coupon_gain')).some(row => row.details?.roundId === next.game.roundId)).toBe(false)
    expect(start.game.cards).toBeTruthy()
  } finally { await server.close() }
})

test('admin logs present readable app activity and coupon titles, filter by category and search on a narrow screen', async ({ page }) => {
  const server = await backend()
  try {
    const token = await server.login()
    const eventId = crypto.randomUUID()
    await fetch(server.base + '/api/client/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1; wv) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36' },
      body: JSON.stringify({ reports: [{ eventId, deviceId: 'readable_device_123', sessionId: crypto.randomUUID(), event: 'app_background', platform: 'android', version: '2.0.0', at: new Date().toISOString(), details: { foregroundMs: 65000, reason: 'native_state' } }] }) })
    await server.post('/api/play/admin/control', { action: 'grant_coupon', operationId: crypto.randomUUID(), title: '周末大餐', desc: '女友选择，男友买单' }, token)
    await server.attach(page)
    await page.setViewportSize({ width: 390, height: 950 })
    await page.goto('/admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: '登录后台', exact: true }).click()
    await page.getByRole('button', { name: '客户端日志', exact: true }).click()
    await expect(page.getByText('已切到手机后台，本次累计前台使用 1 分 5 秒。', { exact: true })).toBeVisible()
    await expect(page.getByText(/Android 14 · Pixel 8/)).toBeVisible()
    await page.getByLabel('记录类型', { exact: true }).selectOption('lifecycle')
    await page.getByRole('button', { name: '查询日志', exact: true }).click()
    await expect(page.locator('.log-row')).toHaveCount(1)
    await page.locator('.log-details summary').click()
    await expect(page.getByText('累计前台使用', { exact: true })).toBeVisible()
    await expect(page.getByText('手机系统前后台切换', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '清除筛选', exact: true }).click()
    await page.getByLabel('搜索', { exact: true }).fill('周末大餐')
    await page.getByRole('button', { name: '查询日志', exact: true }).click()
    await expect(page.locator('.log-row')).toHaveCount(1)
    await expect(page.locator('.log-summary')).toContainText('周末大餐')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/readable-activity-logs.png', fullPage: true })
  } finally { await page.close(); await server.close() }
})
