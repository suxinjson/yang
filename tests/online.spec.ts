import { test, expect } from '@playwright/test'
import { fork, type ChildProcess } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { once } from 'node:events'
import { defaultGameSettings } from '../shared/gameConfig.js'
function mockState(config: any = { gameSettings: defaultGameSettings() }, coupons: any[] = []) {
  return { config, coupons, state: { epoch: 'test-epoch', revision: 0, configVersion: 'a'.repeat(64), config, coupons } }
}

test('native client refuses cached offline play, acknowledges operations and locks on recording failure', async ({ page, context }) => {
  let available = false
  let failEvents = false
  const events: any[] = []
  const settings = defaultGameSettings()
  await page.addInitScript(() => { (window as any).androidBridge = {} })
  await page.route('**/photos/**', route => route.abort())
  await page.route('**/api/**', route => {
    const url = route.request().url()
    if (!available) return route.abort()
    if (url.endsWith('/client/session')) return route.fulfill({ json: { token: 'a'.repeat(64), sessionId: 'session-1234', ...mockState({ gameSettings: settings, summonCostEnabled: false }) } })
    if (url.endsWith('/client/events')) {
      const event = route.request().postDataJSON()
      events.push(event)
      if (failEvents) return route.fulfill({ status: 503, json: { error: 'disk unavailable' } })
      return route.fulfill({ json: { ok: true, id: event.eventId } })
    }
    return route.fulfill({ json: { ok: true, ...mockState({ gameSettings: settings, summonCostEnabled: false }) } })
  })
  await page.goto('/')
  await expect(page.getByText('需要保持在线')).toBeVisible()
  await expect(page.locator('.board-arena')).toHaveCount(0)
  available = true
  await page.getByRole('button', { name: '重新连接', exact: true }).click()
  await expect(page.locator('.game-card.is-clickable').first()).toBeVisible()
  await page.locator('.game-card.is-clickable').first().click()
  await expect.poll(() => events.filter(event => event.event === 'card_pick').length).toBe(1)
  await expect(page.locator('.in-slot')).toHaveCount(1)
  await context.setOffline(true)
  await expect(page.getByText('需要保持在线')).toBeVisible()
  await expect(page.locator('.board-arena')).toHaveCount(0)
  await context.setOffline(false)
  await page.getByRole('button', { name: '重新连接', exact: true }).click()
  await expect(page.locator('.game-card.is-clickable').first()).toBeVisible()
  failEvents = true
  await page.locator('.game-card.is-clickable').first().click()
  await expect(page.getByText('需要保持在线')).toBeVisible()
  const slot = await page.evaluate(() => (document.querySelector('#app') as any).__vue_app__._instance.setupState.slotCards.length)
  expect(slot).toBe(0)
  expect(events.some(event => event.event === 'round_start')).toBe(true)
})

test('native heartbeat failure and an older backend cannot enable offline play', async ({ page }) => {
  await page.addInitScript(() => { (window as any).androidBridge = {} })
  await page.route('**/photos/**', route => route.abort())
  let modern = false
  await page.route('**/api/**', route => {
    if (!modern) return route.fulfill({ contentType: 'text/html', body: '<html>old backend</html>' })
    if (route.request().url().endsWith('/session')) return route.fulfill({ json: { token: 'b'.repeat(64), sessionId: 'session-5678', ...mockState() } })
    if (route.request().url().endsWith('/heartbeat')) return route.fulfill({ status: 503, json: { error: 'unavailable' } })
    return route.fulfill({ json: { ok: true, ...mockState() } })
  })
  await page.goto('/')
  await expect(page.getByText('需要保持在线')).toBeVisible()
  modern = true
  await page.getByRole('button', { name: '重新连接', exact: true }).click()
  await expect(page.locator('.board-arena')).toBeVisible()
  await expect(page.getByText('需要保持在线')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('.board-arena')).toHaveCount(0)
})

test('native coupon failure never creates a local reward and returning to the foreground revalidates the session', async ({ page }) => {
  let sessions = 0
  await page.addInitScript(() => { (window as any).androidBridge = {} })
  await page.route('**/photos/**', route => route.abort())
  await page.route('**/api/**', route => {
    const url = route.request().url()
    if (url.endsWith('/session')) {
      sessions++
      return route.fulfill({ json: { token: 'c'.repeat(64), sessionId: `session-${sessions}`, ...mockState({ gameSettings: defaultGameSettings(), summonCostEnabled: true }) } })
    }
    if (url.endsWith('/coupons/draw')) return route.fulfill({ status: 503, json: { error: 'unavailable' } })
    return route.fulfill({ json: { ok: true, ...mockState({ gameSettings: defaultGameSettings(), summonCostEnabled: true }) } })
  })
  await page.goto('/')
  await expect(page.locator('.board-arena')).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.board-arena')).toHaveCount(0)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.board-arena')).toBeVisible()
  expect(sessions).toBe(2)
  await page.getByRole('button', { name: /召唤男友/ }).click()
  await expect(page.getByText('需要保持在线')).toBeVisible()
  const coupons = await page.evaluate(() => JSON.parse(localStorage.getItem('couple_game_love_coupons_v2') || '[]'))
  expect(coupons).toEqual([])
})

test('client journal persists, deduplicates, sanitizes, paginates and requires administrator access', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'yang-online-test-'))
  let child: ChildProcess | undefined
  let base = ''
  async function start() {
    child = fork(path.resolve('server.js'), [], { env: { ...process.env, PORT: '0', DATA_DIR: directory }, silent: true })
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server timeout')), 10000)
      child!.once('message', (message: any) => { clearTimeout(timer); resolve(message.port) })
      child!.once('error', reject)
    })
    base = `http://127.0.0.1:${port}`
  }
  async function stop() { if (child && child.exitCode === null && !child.killed) { const exited = once(child, 'exit'); child.kill(); await exited } }
  const post = (route: string, body: unknown, token?: string) => fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Client-Token': token } : {}) }, body: JSON.stringify(body) })
  async function login() { return (await (await post('/api/admin/login', { password: 'admin' })).json()).token }
  try {
    await start()
    expect((await fetch(`${base}/api/admin/client-logs`)).status).toBe(401)
    expect((await post('/api/client/heartbeat', {})).status).toBe(440)
    const session = await (await post('/api/client/session', { deviceId: 'device_test_123', platform: 'android', version: '1.2.0' })).json()
    expect(session.config).not.toHaveProperty('adminPassword')
    const event = { event: 'card_pick', eventId: 'event_unique_123', details: { cardId: 3, level: 1, password: 'must-not-log', photo: 'data:secret', token: 'must-not-log' } }
    const first = await (await post('/api/client/events', event, session.token)).json()
    expect((await (await post('/api/client/events', event, session.token)).json()).id).toBe(first.id)
    expect((await post('/api/client/events', { ...event, event: 'arbitrary_event' }, session.token)).status).toBe(400)
    expect((await post('/api/client/heartbeat', {}, session.token)).status).toBe(200)
    const draw = { operationId: 'operation_test_123', context: 'win_1' }
    const coupon = await (await post('/api/client/coupons/draw', draw, session.token)).json()
    const retry = await (await post('/api/client/coupons/draw', draw, session.token)).json()
    expect(retry.coupon.id).toBe(coupon.coupon.id)
    expect(retry.list.length).toBe(coupon.list.length)
    expect((await fetch(`${base}/api/coupons`, { headers: { 'X-Client-Mode': 'online', 'X-Client-Token': 'forged' } })).status).toBe(440)
    const admin = await login()
    const headers = { Authorization: `Bearer ${admin}` }
    const logs = await (await fetch(`${base}/api/admin/client-logs?deviceId=device_test_123&event=card_pick`, { headers })).json()
    expect(logs.items).toHaveLength(1)
    expect(logs.items[0].details).toEqual({ cardId: 3, level: 1 })
    const page1 = await (await fetch(`${base}/api/admin/client-logs?limit=1`, { headers })).json()
    expect(page1.nextCursor).toBeTruthy()
    const page2 = await (await fetch(`${base}/api/admin/client-logs?limit=1&cursor=${page1.nextCursor}`, { headers })).json()
    expect(page1.items[0].id).not.toBe(page2.items[0].id)
    await stop()
    await start()
    expect((await post('/api/client/heartbeat', {}, session.token)).status).toBe(440)
    const restored = await (await fetch(`${base}/api/admin/client-logs?deviceId=device_test_123&event=card_pick`, { headers: { Authorization: `Bearer ${await login()}` } })).json()
    expect(restored.items).toHaveLength(1)
    const contents = readdirSync(path.join(directory, 'client-logs')).map(name => readFileSync(path.join(directory, 'client-logs', name), 'utf8')).join('')
    expect(contents).not.toContain('must-not-log')
    expect(contents).not.toContain(session.token)
    const another = await (await post('/api/client/session', { deviceId: 'device_test_456', platform: 'android' })).json()
    renameSync(path.join(directory, 'client-logs'), path.join(directory, 'journal-backup'))
    writeFileSync(path.join(directory, 'client-logs'), 'storage unavailable')
    expect((await post('/api/client/events', event, another.token)).status).toBe(503)
  } finally {
    await stop()
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-online-test-')) throw new Error('Unexpected test directory')
    rmSync(directory, { recursive: true, force: true })
  }
})

test('administrator can filter client records and sees expired authentication', async ({ page }) => {
  let expired = false
  const queries: string[] = []
  await page.route('**/photos/**', route => route.abort())
  await page.route('**/api/**', route => {
    const url = route.request().url()
    if (url.includes('/admin/client-logs')) {
      queries.push(url)
      return expired ? route.fulfill({ status: 401, json: {} }) : route.fulfill({ json: { items: [{ id: 'log123', at: new Date().toISOString(), event: 'card_pick', deviceId: 'device1234', sessionId: 'session1234', platform: 'android', version: '1.2.0', details: { cardId: 3 } }], nextCursor: null } })
    }
    if (url.endsWith('/admin/login')) return route.fulfill({ json: { success: true, token: 'admin-token' } })
    return route.fulfill({ json: url.endsWith('/coupons') ? [] : null })
  })
  await page.goto('/?admin')
  await page.getByPlaceholder('请输入管理员密码...').fill('admin')
  await page.getByRole('button', { name: /解锁后台控制中心/ }).click()
  await page.getByRole('button', { name: /客户端日志/ }).click()
  await expect(page.locator('article strong').getByText('选择卡牌', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '设备：device1234' }).click()
  await expect.poll(() => queries.some(url => url.includes('deviceId=device1234'))).toBe(true)
  expired = true
  await page.getByRole('button', { name: '查询 / 刷新', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('登录已过期')
})
