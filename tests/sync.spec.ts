import { test, expect, type Page } from '@playwright/test'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { acceptServerState, beginStateSession, serverState } from '../src/utils/serverState'
import { defaultGameSettings } from '../shared/gameConfig.js'

async function backend() {
  const directory = mkdtempSync(path.join(tmpdir(), 'yang-sync-'))
  let child: ReturnType<typeof fork>
  let base = ''
  async function start() {
    child = fork(path.resolve('server.js'), [], { env: { ...process.env, PORT: '0', DATA_DIR: directory }, silent: true })
    const [message] = await Promise.race([once(child, 'message'), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('Server timeout')), 10000); timer.unref() })])
    base = `http://127.0.0.1:${message.port}`
  }
  async function stop() { if (child && !child.killed && child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited } }
  await start()
  return {
    directory, get base() { return base },
    async post(url: string, data: unknown, token?: string, version?: string) {
      return fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(version ? { 'If-Match': version } : {}) }, body: JSON.stringify(data) })
    },
    async attach(page: Page) {
      await page.route('**/api/**', async route => {
        const response = await route.fetch({ url: base + new URL(route.request().url()).pathname + new URL(route.request().url()).search })
        await route.fulfill({ response })
      })
      await page.route('**/photos/**', route => route.abort())
    },
    async restart() { await stop(); await start() },
    async close() { await stop(); if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-sync-')) throw new Error('Unexpected sync directory'); rmSync(directory, { recursive: true, force: true }) }
  }
}

test('native and web pages synchronize names, photos, rewards, redemption and reset without reloading', async ({ page, browser }) => {
  const server = await backend()
  const native = await browser.newPage()
  try {
    const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
    await server.post('/api/config', { gfPenaltyRatio: 0, boyfriendRewards: [{ id: 'sync_reward', title: '跨页面同步奖励', desc: '同步测试', icon: '🎁', target: 'boyfriend_pays' }] }, login.token)
    await server.post('/api/coupons/reset', {}, login.token)
    await server.attach(page)
    await server.attach(native)
    await native.addInitScript(() => { (window as any).androidBridge = {} })
    await Promise.all([page.goto('/'), native.goto('http://127.0.0.1:5175/')])
    await expect(page.locator('.board-arena')).toBeVisible()
    await expect(native.locator('.board-arena')).toBeVisible()
    await page.getByTitle('查看情侣心愿存折').click()
    await native.getByTitle('查看情侣心愿存折').click()
    const draw = await (await server.post('/api/coupons/draw', { deviceId: 'sync_device_123', operationId: 'sync_operation_123', context: 'win_1' })).json()
    await expect(page.getByText('跨页面同步奖励', { exact: true })).toBeVisible({ timeout: 8000 })
    await expect(native.getByText('跨页面同步奖励', { exact: true })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '点击兑现 ✨' }).click()
    await expect(page.getByText('该心愿已兑现', { exact: true })).toBeVisible()
    await expect(native.getByText('该心愿已兑现', { exact: true })).toBeVisible({ timeout: 10000 })
    await server.post('/api/config', { couponName: '全程同步券', bfPhotos: [{ name: '同步帅照', image: '/photos/synced.jpg' }] }, login.token)
    await expect(page.getByText('全程同步券存折', { exact: true })).toBeVisible({ timeout: 8000 })
    await expect(native.getByText('全程同步券存折', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect.poll(() => native.evaluate(() => JSON.parse(localStorage.getItem('couple_game_admin_config_v3')!).bfPhotos[0].name)).toBe('同步帅照')
    await server.post('/api/coupons/reset', {}, login.token)
    await expect(page.getByText('暂无心愿券，快去闯关抽取吧~')).toBeVisible({ timeout: 8000 })
    await expect(native.getByText('暂无心愿券，快去闯关抽取吧~')).toBeVisible({ timeout: 10000 })
    const retry = await server.post('/api/coupons/draw', { deviceId: 'sync_device_123', operationId: 'sync_operation_123', context: 'win_1' })
    expect(retry.status).toBe(409)
    expect(draw.coupon.id).toBeTruthy()
  } finally { await native.close(); await page.close(); await server.close() }
})

test('stale responses never roll back a newer revision or a restarted server', () => {
  beginStateSession()
  const state = { epoch: 'epoch-a', revision: 4, configVersion: 'a'.repeat(64), config: { gameSettings: defaultGameSettings() } as any, coupons: [] }
  expect(acceptServerState(state)).toBe(true)
  expect(acceptServerState({ ...state, revision: 3 })).toBe(false)
  expect(serverState.value?.revision).toBe(4)
  expect(acceptServerState({ ...state, epoch: 'epoch-b', revision: 0 })).toBe(true)
  expect(acceptServerState({ ...state, revision: 100 })).toBe(false)
  expect(serverState.value?.epoch).toBe('epoch-b')
  beginStateSession()
})

test('configuration conflicts are rejected; reward idempotency survives reset and restart; corrupt storage never resets silently', async () => {
  const server = await backend()
  try {
    const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
    const initial = (await (await fetch(server.base + '/api/state')).json()).state
    const first = await server.post('/api/config', { couponName: 'first' }, login.token, initial.configVersion)
    expect(first.status).toBe(200)
    const stale = await server.post('/api/config', { couponName: 'stale' }, login.token, initial.configVersion)
    expect(stale.status).toBe(409)
    expect((await stale.json()).state.config.couponName).toBe('first')
    const operation = { deviceId: 'reward_device_123', operationId: 'reward_operation_123', context: 'win_2' }
    const [a, b] = await Promise.all([server.post('/api/coupons/draw', operation), server.post('/api/coupons/draw', operation)])
    expect((await a.json()).coupon.id).toBe((await b.json()).coupon.id)
    await server.post('/api/coupons/reset', {}, login.token)
    await server.restart()
    expect((await server.post('/api/coupons/draw', operation)).status).toBe(409)
    const state = (await (await fetch(server.base + '/api/state')).json()).state
    expect(state.coupons).toEqual([])
    expect(state.epoch).not.toBe(initial.epoch)
    const file = path.join(server.directory, 'coupon-ledger.json')
    const original = readFileSync(file, 'utf8')
    writeFileSync(file, '{broken')
    expect((await fetch(server.base + '/api/state')).status).toBe(500)
    expect(readFileSync(file, 'utf8')).toBe('{broken')
    writeFileSync(file, original)
  } finally { await server.close() }
})

test('open dashboard keeps unsaved edits and warns when another page changes configuration', async ({ page }) => {
  const server = await backend()
  try {
    await server.attach(page)
    await page.goto('/?admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: /解锁后台控制中心/ }).click()
    await page.getByLabel('棋盘宽度', { exact: true }).fill('380')
    const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
    await server.post('/api/config', { couponName: '远程最新名称' }, login.token)
    await expect(page.getByText('其他页面已更新配置。', { exact: false })).toBeVisible({ timeout: 8000 })
    await expect(page.getByLabel('棋盘宽度', { exact: true })).toHaveValue('380')
    await page.getByRole('button', { name: '重新载入最新配置' }).click()
    await expect(page.getByLabel('棋盘宽度', { exact: true })).toHaveValue('420')
    await page.getByRole('button', { name: '保存关卡配置', exact: true }).click()
    await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
  } finally { await page.close(); await server.close() }
})

test('lost draw acknowledgements retry once and delayed rewards cannot restore cleared coupons', async ({ page }) => {
  const server = await backend()
  let release: (() => void) | undefined
  let held = false
  let lostId = ''
  try {
    await server.attach(page)
    await page.goto('/')
    await expect(page.locator('.board-arena')).toBeVisible()
    await page.route('**/api/coupons/draw', async route => {
      const response = await route.fetch({ url: server.base + '/api/coupons/draw' })
      lostId = (await response.json()).coupon.id
      await route.abort('failed')
    }, { times: 1 })
    const first = await page.evaluate(async () => {
      const modulePath = '/src/utils/coupons.ts'
      try { await (await import(modulePath)).generateRandomCoupon('win_1'); return 'unexpected' } catch { return 'failed' }
    })
    expect(first).toBe('failed')
    const retried = await page.evaluate(async () => {
      const modulePath = '/src/utils/coupons.ts'
      return (await (await import(modulePath)).generateRandomCoupon('win_1')).id
    })
    expect(retried).toBe(lostId)
    await page.route('**/api/coupons/draw', async route => {
      const response = await route.fetch({ url: server.base + '/api/coupons/draw' })
      held = true
      await new Promise<void>(resolve => { release = resolve })
      await route.fulfill({ response })
    }, { times: 1 })
    await page.evaluate(() => {
      const modulePath = '/src/utils/coupons.ts'
      ;(window as any).delayedDraw = import(modulePath).then(m => m.generateRandomCoupon('win_2')).then(() => 'unexpected', () => 'removed')
    })
    await expect.poll(() => held).toBe(true)
    const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
    const reset = await (await server.post('/api/coupons/reset', {}, login.token)).json()
    await page.evaluate(async state => {
      const modulePath = '/src/utils/serverState.ts'
      ;(await import(modulePath)).acceptServerState(state)
    }, reset.state)
    release!()
    expect(await page.evaluate(() => (window as any).delayedDraw)).toBe('removed')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('couple_game_love_coupons_v2')!))).toEqual([])
  } finally { release?.(); await page.close(); await server.close() }
})

test('a remote update while save acknowledgement is delayed remains a conflict', async ({ page }) => {
  const server = await backend()
  let release: (() => void) | undefined
  let held = false
  try {
    await server.attach(page)
    await page.goto('/?admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: /解锁后台控制中心/ }).click()
    await page.route('**/api/config', async route => {
      if (route.request().method() !== 'POST') return route.fallback()
      const response = await route.fetch({ url: server.base + '/api/config' })
      held = true
      await new Promise<void>(resolve => { release = resolve })
      await route.fulfill({ response })
    })
    await page.getByLabel('棋盘宽度', { exact: true }).fill('380')
    await page.getByRole('button', { name: '保存关卡配置', exact: true }).click()
    await expect.poll(() => held).toBe(true)
    const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
    const remote = await (await server.post('/api/config', { couponName: 'newer_remote' }, login.token)).json()
    await page.evaluate(async state => {
      const modulePath = '/src/utils/serverState.ts'
      ;(await import(modulePath)).acceptServerState(state)
    }, remote.state)
    release!()
    await expect(page.getByText('其他页面已更新配置。', { exact: false })).toBeVisible()
    await expect(page.getByText('已保存并同步到服务器', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('棋盘宽度', { exact: true })).toHaveValue('380')
  } finally { release?.(); await page.close(); await server.close() }
})

test('legacy coupon files migrate without losing redeemed rewards', async () => {
  const server = await backend()
  try {
    const coupon = { id: 'legacy_reward', title: 'legacy', used: true, target: 'boyfriend_pays' }
    const legacy = path.join(server.directory, 'coupons.json')
    writeFileSync(legacy, JSON.stringify([coupon]))
    const state = (await (await fetch(server.base + '/api/state')).json()).state
    expect(state.coupons).toEqual([coupon])
    expect(JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8')).coupons).toEqual([coupon])
    expect(JSON.parse(readFileSync(legacy, 'utf8'))).toEqual([coupon])
  } finally { await server.close() }
})
