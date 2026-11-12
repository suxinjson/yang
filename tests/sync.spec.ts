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
  test.setTimeout(60000)
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
    const draw = await (await server.post('/api/coupons/draw', { deviceId: 'sync_device_123', operationId: 'sync_operation_123', context: 'win_1' }, login.token)).json()
    await expect(page.getByText('跨页面同步奖励', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(native.getByText('跨页面同步奖励', { exact: true })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: '兑现', exact: true }).click()
    await expect(page.getByText('已兑现', { exact: true })).toBeVisible()
    await expect(native.getByText('已兑现', { exact: true })).toBeVisible({ timeout: 15000 })
    await server.post('/api/config', { couponName: '全程同步券', bfPhotos: [{ name: '同步帅照', image: '/photos/synced.jpg' }] }, login.token)
    await expect(page.getByText('全程同步券存折', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(native.getByText('全程同步券存折', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect.poll(() => native.evaluate(() => JSON.parse(localStorage.getItem('couple_game_admin_config_v3')!).bfPhotos[0].name)).toBe('同步帅照')
    await server.post('/api/coupons/reset', {}, login.token)
    await expect(page.getByText('暂无心愿券', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(native.getByText('暂无心愿券', { exact: true })).toBeVisible({ timeout: 15000 })
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
    const [a, b] = await Promise.all([server.post('/api/coupons/draw', operation, login.token), server.post('/api/coupons/draw', operation, login.token)])
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

test('slot coupon spending only succeeds once even with concurrent redemption requests', async () => {
  const server = await backend()
  try {
    const body = { id: 'coupon_init_1', requireUnused: true }
    const results = await Promise.all([server.post('/api/coupons/redeem', body), server.post('/api/coupons/redeem', body)])
    expect(results.map(response => response.status).sort()).toEqual([200, 409])
    // Ordinary redemption remains idempotent for existing clients.
    expect((await server.post('/api/coupons/redeem', { id: body.id })).status).toBe(200)
  } finally { await server.close() }
})

test('coupon slot unlock waits for successful redemption and ignores busy or duplicate clicks', async ({ page }) => {
  const server = await backend()
  let release: (() => void) | undefined
  try {
    const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
    await server.post('/api/config', { gameSettings: { slotUnlockCondition: 'love_coupon' } }, login.token)
    await server.attach(page)
    await page.goto('/')
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    let requests = 0, fail = true, held = false
    await page.route('**/api/play/solo/unlock', async route => {
      requests++
      expect(route.request().postDataJSON().operationId).toBeTruthy()
      if (fail) return route.fulfill({ status: 500, json: { error: 'simulated storage failure' } })
      const response = await route.fetch({ url: server.base + '/api/play/solo/unlock' })
      held = true
      await new Promise<void>(resolve => { release = resolve })
      await route.fulfill({ response })
    })
    const slotCount = () => page.evaluate(() => (document.querySelector('#app') as any).__vue_app__._instance.setupState.unlockedSlots)
    const lock = page.locator('.empty-slot[title="点击查看卡槽解锁条件"]').last()
    await page.evaluate(() => { (document.querySelector('#app') as any).__vue_app__._instance.setupState.game.resolveAt = Date.now() + 1000 })
    await lock.click()
    expect(requests).toBe(0)
    expect(await slotCount()).toBe(7)
    await page.evaluate(() => { (document.querySelector('#app') as any).__vue_app__._instance.setupState.game.resolveAt = 0 })
    await lock.click()
    await expect(page.getByRole('alert')).toContainText('simulated storage failure')
    expect(await slotCount()).toBe(7)
    expect((await (await fetch(server.base + '/api/coupons')).json())[0].used).toBe(false)
    fail = false
    await page.getByRole('button', { name: '重试未确认操作' }).click()
    await expect.poll(() => held).toBe(true)
    await lock.dispatchEvent('click')
    expect(requests).toBe(2)
    expect(await slotCount()).toBe(7)
    release!()
    await expect.poll(slotCount).toBe(8)
    expect((await (await fetch(server.base + '/api/coupons')).json()).filter((coupon: any) => coupon.used)).toHaveLength(1)
  } finally { release?.(); await page.close(); await server.close() }
})

for (const native of [false, true]) {
  test(`${native ? 'native' : 'web'} levels four and five award distinct win coupons`, async ({ page }) => {
    const server = await backend()
    try {
      const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
      await server.post('/api/config', { gameSettings: { totalLevels: 5, levels: Array.from({ length: 5 }, () => ({ minCards: 6, maxCards: 6, types: 1 })) } }, login.token)
      await server.attach(page)
      if (native) await page.addInitScript(() => { (window as any).androidBridge = {} })
      const completions: string[] = []
      page.on('request', request => { if (request.url().endsWith('/solo/finish')) completions.push(request.postDataJSON().roundId) })
      await page.goto('/')
      await expect(page.locator('.board-arena')).toBeVisible()
      await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
      await page.evaluate(async () => {
        const modulePath = '/src/utils/playSession.ts'
        const data = await (await import(modulePath)).playPost('solo/start', { operationId: crypto.randomUUID(), level: 4 })
        ;(document.querySelector('#app') as any).__vue_app__._instance.setupState.solo = { game: data.game, token: data.token, practice: false }
      })
      for (const level of [4, 5]) {
        for (let pick = 0; pick < 6; pick++) {
          await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
          await page.locator('.board-arena .is-clickable').first().click()
        }
        await expect(page.getByText(`第 ${level} 关顺利通关！`)).toBeVisible()
        if (level === 4) await page.getByRole('button', { name: /进入下一关/ }).click()
      }
      await expect.poll(() => completions.length).toBe(2)
      expect(new Set(completions).size).toBe(2)
      const coupons = await (await fetch(server.base + '/api/coupons')).json()
      expect(coupons.filter((coupon: any) => /第 [45] 关通关/.test(coupon.obtainedAt))).toHaveLength(2)
      const invalid = await server.post('/api/coupons/draw', { deviceId: 'test_device_123', operationId: 'invalid_level_123', context: 'win_6' })
      expect(invalid.status).toBe(400)
    } finally { await page.close(); await server.close() }
  })
}

test('open dashboard keeps unsaved edits and warns when another page changes configuration', async ({ page }) => {
  const server = await backend()
  try {
    await server.attach(page)
    await page.goto('/?admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: /登录后台/ }).click()
    await page.getByLabel('棋盘宽度', { exact: true }).fill('380')
    const login = await (await server.post('/api/admin/login', { password: 'admin' })).json()
    await server.post('/api/config', { couponName: '远程最新名称' }, login.token)
    await expect(page.getByText('其他页面已更新配置，当前修改已保留。', { exact: false })).toBeVisible({ timeout: 15000 })
    await expect(page.getByLabel('棋盘宽度', { exact: true })).toHaveValue('380')
    await page.getByRole('button', { name: '重新载入最新配置' }).click()
    await expect(page.getByLabel('棋盘宽度', { exact: true })).toHaveValue('420')
    await page.getByRole('button', { name: '保存关卡配置', exact: true }).click()
    await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
  } finally { await page.close(); await server.close() }
})

test('a remote update while save acknowledgement is delayed remains a conflict', async ({ page }) => {
  const server = await backend()
  let release: (() => void) | undefined
  let held = false
  try {
    await server.attach(page)
    await page.goto('/?admin')
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: /登录后台/ }).click()
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
    await expect(page.getByText('其他页面已更新配置，当前修改已保留。', { exact: false })).toBeVisible()
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
