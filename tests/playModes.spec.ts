import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import WebSocket from 'ws'
import { backend } from './helpers/backend'

const state = (page: Page) => page.evaluate(() => { const setup = (document.querySelector('#app') as any).__vue_app__._instance.setupState; const game = JSON.parse(JSON.stringify(setup.game)); if (setup.couple) { delete game.tools; delete game.rewardId; delete game.rewards }; return game })
async function clickPick(page: Page) {
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await page.locator('.board-arena .is-clickable').first().click()
}
async function ready(page: Page) { await expect(page.locator('.board-arena')).toBeVisible(); await expect.poll(() => page.evaluate(() => !(document.querySelector('#app') as any).__vue_app__._instance.setupState.solo.practice)).toBe(true) }

test('Android solo picks stay local, meaningful inventory and coupon transactions carry App/IP/device source', async ({ page }) => {
  const server = await backend()
  try {
    const token = await server.login()
    await server.post('/api/config', { rewardPolicy: { simultaneous: true, hintChance: 100, rescueChance: 0, couponChance: 100 }, gameSettings: { levels: [{ minCards: 6, maxCards: 6, types: 1 }] } }, token)
    await server.attach(page, true)
    const requests: string[] = []
    page.on('request', request => { if (request.url().includes('/api/')) requests.push(new URL(request.url()).pathname) })
    await page.goto('/'); await ready(page)
    const baseline = requests.length
    await clickPick(page)
    await page.getByTitle('静音').click()
    expect((await state(page)).slots).toHaveLength(1)
    expect(requests).toHaveLength(baseline)
    expect(requests.some(url => /events|heartbeat|client\/state/.test(url))).toBe(false)
    await page.getByRole('button', { name: /透视卡/ }).click()
    await expect(page.getByRole('button', { name: /透视卡/ })).toContainText('剩 1 次')
    await page.route('**/api/play/solo/finish', async route => { await route.fetch({ url: server.base + '/api/play/solo/finish' }); await route.abort() }, { times: 1 })
    for (let pick = 1; pick < 6; pick++) await clickPick(page)
    await expect(page.getByText('第 1 关顺利通关！')).toBeVisible()
    await page.getByRole('button', { name: '重试通关奖励', exact: true }).click()
    await expect(page.getByRole('button', { name: /进入下一关/ })).toBeEnabled()
    await expect.poll(() => (readLedger().coupons as any[]).filter(coupon => coupon.roundId).length).toBe(1)
    const game = await state(page)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gang_solo_v2')!))
    await server.post('/api/play/solo/finish', { roundId: game.roundId, token: saved.token, outcome: 'won' })
    const ledger = readLedger()
    expect(ledger.coupons.filter((coupon: any) => coupon.roundId === game.roundId)).toHaveLength(1)
    const events = ledger.transactions.filter((row: any) => row.details.roundId === game.roundId)
    expect(events.map((row: any) => row.event).sort()).toEqual(['coupon_gain', 'prop_gain', 'prop_use', 'round_end', 'round_start'])
    expect(events.every((row: any) => row.source === 'android_app' && row.ip && row.device)).toBe(true)
    expect(events.find((row: any) => row.event === 'round_end').details.elapsedMs).toBeGreaterThan(0)
    await page.getByRole('button', { name: /查看我的背包/ }).click()
    await page.getByRole('button', { name: /兑现/ }).first().click()
    await expect.poll(() => readLedger().transactions.filter((row: any) => row.event === 'coupon_use').length).toBe(1)
    const coupon = readLedger().coupons.find((coupon: any) => coupon.used)
    const [a, b] = await Promise.all([server.post('/api/play/coupons/redeem', { operationId: 'duplicate_test_123', couponId: coupon.id }), server.post('/api/play/coupons/redeem', { operationId: 'duplicate_test_456', couponId: coupon.id })])
    expect([a.status, b.status]).toEqual([409, 409])
    function readLedger() { return JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8')) }
  } finally { await page.close(); await server.close() }
})

test('solo tool lost acknowledgement retries the same receipt without double consumption', async ({ page }) => {
  const server = await backend()
  try {
    await server.attach(page, true); await page.goto('/'); await ready(page)
    let operationId = ''
    await page.route('**/api/play/solo/tool', async route => {
      operationId = route.request().postDataJSON().operationId
      await route.fetch({ url: server.base + '/api/play/solo/tool' }); await route.abort()
    }, { times: 1 })
    await page.getByRole('button', { name: /透视卡/ }).click()
    await expect(page.getByRole('button', { name: '重试未确认操作' })).toBeVisible()
    await page.reload(); await ready(page)
    await page.getByRole('button', { name: '重试未确认操作' }).click()
    await expect.poll(() => page.evaluate(() => {
      const state = (document.querySelector('#app') as any).__vue_app__._instance.setupState
      return { hint: state.game.tools.hint, pending: !!state.solo.pending, error: state.operationError, busy: state.actionBusy, booting: state.booting }
    })).toEqual({ hint: 1, pending: false, busy: false, error: '', booting: false })
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gang_solo_v2')!))
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(ledger.rounds[saved.game.roundId].operations[operationId].tool).toBe('hint')
    expect(ledger.transactions.filter((row: any) => row.event === 'prop_use')).toHaveLength(1)
  } finally { await page.close(); await server.close() }
})

test('couple mode synchronizes both directions, animations, modals, rewards, reconnect and developer control', async ({ page, browser }) => {
  test.setTimeout(60000)
  const server = await backend(), partner = await browser.newPage({ viewport: { width: 390, height: 900 } })
  try {
    const token = await server.login()
    await server.post('/api/config', { gameSettings: { levels: [{ minCards: 12, maxCards: 12, types: 1 }] } }, token)
    await server.attach(page, true); await server.attach(partner, true)
    await page.setViewportSize({ width: 390, height: 900 })
    await Promise.all([page.goto('/'), partner.goto('/')]); await ready(page); await ready(partner)
    await page.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await page.getByRole('button', { name: '创建情侣房间' }).click()
    const code = await page.getByTestId('room-code').textContent()
    expect(code).toMatch(/^\d{4}$/)
    await partner.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await partner.getByLabel('四位房间密码').fill(code!)
    await partner.getByRole('button', { name: '加入房间', exact: true }).click()
    await expect(page.getByText('已连接 2/2 人')).toBeVisible()
    await expect(partner.getByText('已连接 2/2 人')).toBeVisible()
    expect(await state(partner)).toEqual(await state(page))
    await clickPick(page); await expect(partner.locator('.in-slot')).toHaveCount(1)
    await clickPick(partner); await expect(page.locator('.in-slot')).toHaveCount(2)
    await page.getByRole('button', { name: /召唤男友卡/ }).click()
    await expect(partner.getByTestId('rescue-photo-name')).toBeVisible()
    expect(await state(partner)).toEqual(await state(page))
    await partner.getByRole('button', { name: /继续一起闯关/ }).click()
    await expect(page.getByTestId('rescue-photo-name')).toHaveCount(0)
    await page.locator('.staged-area [title="点击移回卡槽"]').first().click()
    await expect(partner.locator('.staged-area .game-card')).toHaveCount(1)
    await partner.locator('.staged-area [title="点击移回卡槽"]').first().click()
    await expect(page.locator('.staged-area')).toHaveCount(0)
    await partner.reload(); await expect(partner.getByText('已连接 2/2 人')).toBeVisible()
    expect(await state(partner)).toEqual(await state(page))
    for (let pick = 2; pick < 12; pick++) {
      await clickPick(pick % 2 ? partner : page)
      await expect.poll(async () => (await state(page)).cards.filter((card: any) => card.status === 'board').length).toBe(11 - pick)
      await expect.poll(async () => (await state(partner)).cards.filter((card: any) => card.status === 'board').length).toBe(11 - pick)
    }
    await expect(page.getByText('第 1 关顺利通关！')).toBeVisible()
    await expect(partner.getByText('第 1 关顺利通关！')).toBeVisible()
    expect(await page.evaluate(() => (document.querySelector('#app') as any).__vue_app__._instance.setupState.game.rewardId)).not.toBe(await partner.evaluate(() => (document.querySelector('#app') as any).__vue_app__._instance.setupState.game.rewardId))
    const roomId = await page.evaluate(() => JSON.parse(localStorage.getItem('gang_room_credentials')!).roomId)
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    const roundId = (await state(page)).roundId
    expect(ledger.coupons.filter((coupon: any) => coupon.roundId === roundId)).toHaveLength(2)
    expect(ledger.transactions.some((row: any) => /click|card_pick|heartbeat/.test(row.event))).toBe(false)
    await page.getByRole('button', { name: /查看我的背包/ }).click()
    await expect(partner.getByRole('heading', { name: '我的背包' })).toBeVisible()
    expect((await state(partner)).modal).toBe('coupons')
    await partner.getByRole('tab', { name: /待兑现/ }).click()
    await expect.poll(async () => (await state(page)).couponTab).toBe('unredeemed')
    const patches = server.frames.filter(frame => frame.type === 'patch')
    expect(patches.length).toBeGreaterThan(10)
    expect(patches.every(frame => !frame.patch.defs && !frame.patch.settings && !frame.patch.cards)).toBe(true)
    expect((await server.post('/api/play/admin/control', { roomId, action: 'grant_tool', tool: 'rescue', count: 1 })).status).toBe(401)
    await server.post('/api/play/admin/control', { roomId, action: 'restart', level: 2 }, token)
    await expect.poll(async () => (await state(page)).level).toBe(2)
    await expect.poll(async () => (await state(partner)).level).toBe(2)
    await page.screenshot({ path: 'test-results/couple-app.png', fullPage: true })
    await server.restart()
    await expect(partner.getByText('已连接 2/2 人')).toBeVisible({ timeout: 15000 })
    await expect.poll(async () => (await state(page)).roundId).toBe((await state(partner)).roundId)
    await clickPick(partner); await expect(page.locator('.in-slot')).toHaveCount(1)
    await page.getByRole('button', { name: '房间', exact: true }).click()
    await page.getByRole('button', { name: '回到单人模式' }).click()
    await expect(page.getByText('单人闯关', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('单人闯关', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await page.getByRole('button', { name: '回到上次的情侣房间' }).click()
    await expect(page.getByText('已连接 2/2 人')).toBeVisible()
    expect(await state(partner)).toEqual(await state(page))
    const admin = await server.login()
    await server.post('/api/play/admin/control', { roomId, action: 'close_room' }, admin)
    await expect(page.getByText('单人闯关', { exact: true })).toBeVisible()
    await expect(partner.getByText('单人闯关', { exact: true })).toBeVisible()
  } finally { await page.close(); await partner.close(); await server.close() }
})

test('developer dashboard is separate from the App, saves in place and manages the global ledger', async ({ page, browser }) => {
  const server = await backend(), app = await browser.newPage()
  try {
    await server.attach(page); await server.attach(app, true)
    await app.goto('/?admin'); await ready(app)
    await expect(app.getByText('后台管理身份验证')).toHaveCount(0)
    for (let tap = 0; tap < 5; tap++) await app.locator('h1').click()
    await expect(app.getByText('后台管理身份验证')).toHaveCount(0)
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/admin')
    await expect(page.locator('.board-arena')).toHaveCount(0)
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: /登录后台/ }).click()
    await page.getByLabel('棋盘宽度', { exact: true }).fill('380')
    await page.getByRole('button', { name: '保存全部配置' }).click()
    await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
    await expect(page.getByTestId('game-settings')).toBeVisible()
    await expect(page.getByRole('button', { name: /保存并退出/ })).toHaveCount(0)
    await page.getByRole('button', { name: /运行与个人背包/ }).click()
    await page.getByLabel('发放券名').fill('开发者验证券')
    await page.getByLabel('发放券说明').fill('全局账本事务验证')
    await page.getByRole('button', { name: '发放心愿券' }).click()
    await expect(page.getByText('开发者验证券', { exact: true })).toBeVisible()
    await page.screenshot({ path: 'test-results/developer-dashboard.png', fullPage: true })
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(ledger.transactions.find((row: any) => row.event === 'coupon_gain' && row.details.source === 'admin_grant').source).toBe('admin_web')
  } finally { await app.close(); await page.close(); await server.close() }
})

test('simultaneous room picks serialize, stale tool requests do not spend, and coupon races have one winner', async () => {
  const server = await backend(), sockets: WebSocket[] = []
  function message(socket: WebSocket, predicate: (data: any) => boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.off('message', listener); reject(new Error('Room response timeout')) }, 5000)
      function listener(raw: WebSocket.RawData) { const data = JSON.parse(raw.toString()); if (predicate(data)) { clearTimeout(timer); socket.off('message', listener); resolve(data) } }
      socket.on('message', listener)
    })
  }
  try {
    const creator = await (await server.post('/api/play/rooms', { deviceId: 'parallel_device_a' })).json()
    const partner = await (await server.post('/api/play/rooms/join', { deviceId: 'parallel_device_b', code: creator.room.code })).json()
    expect((await server.post('/api/play/rooms/join', { deviceId: 'parallel_device_c', code: creator.room.code })).status).toBe(409)
    for (const member of [creator, partner]) {
      const socket = new WebSocket(server.base.replace('http:', 'ws:') + '/api/play/socket'); sockets.push(socket)
      await new Promise<void>(resolve => socket.once('open', resolve))
      const ready = message(socket, data => data.type === 'snapshot')
      socket.send(JSON.stringify({ type: 'auth', ...server.credentials(member.backpack.profileId), roomId: member.room.id, token: member.token })); await ready
    }
    const command = { type: 'command', revision: partner.room.revision, roundId: creator.game.roundId }
    const hint = { ...command, operationId: 'parallel_hint_001', action: { type: 'hint' } }
    let ack = message(sockets[0], data => data.ack === hint.operationId)
    sockets[0].send(JSON.stringify(hint)); await ack
    ack = message(sockets[0], data => data.ack === hint.operationId)
    sockets[0].send(JSON.stringify(hint)); expect((await ack).game.tools.hint).toBe(1)
    const rejected = message(sockets[1], data => data.rejected === 'parallel_hint_002')
    sockets[1].send(JSON.stringify({ ...hint, operationId: 'parallel_hint_002' })); expect((await rejected).game.tools.hint).toBe(2)
    const cards = creator.game.cards.filter((card: any) => !card.isCovered).slice(0, 2)
    expect(cards).toHaveLength(2)
    const picks = sockets.map((socket, index) => message(socket, data => data.ack === `parallel_pick_00${index}`))
    sockets.forEach((socket, index) => socket.send(JSON.stringify({ ...command, operationId: `parallel_pick_00${index}`, action: { type: 'pick', cardId: cards[index].id } })))
    await Promise.all(picks)
    const synced = message(sockets[0], data => data.type === 'snapshot')
    sockets[0].send(JSON.stringify({ type: 'sync' })); expect((await synced).game.slots).toHaveLength(2)
    const receipts = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(receipts.transactions.filter((row: any) => row.event === 'prop_use')).toHaveLength(1)
    const body = { couponId: 'coupon_init_1' }
    const results = await Promise.all([server.post('/api/play/coupons/redeem', { ...body, operationId: 'coupon_race_0001' }), server.post('/api/play/coupons/redeem', { ...body, operationId: 'coupon_race_0002' })])
    expect(results.map(result => result.status).sort()).toEqual([200, 409])
    const winner = results[0].status === 200 ? 'coupon_race_0001' : 'coupon_race_0002'
    expect((await server.post('/api/play/coupons/redeem', { ...body, operationId: winner })).status).toBe(200)
    const token = await server.login()
    const grant = { operationId: 'admin_receipt_0001', action: 'grant_coupon', title: 'Idempotent developer grant' }
    expect((await server.post('/api/play/admin/control', grant, token)).status).toBe(200)
    expect((await server.post('/api/play/admin/control', grant, token)).status).toBe(200)
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(ledger.coupons.filter((coupon: any) => coupon.title === grant.title)).toHaveLength(1)
  } finally { sockets.forEach(socket => socket.terminate()); await server.close() }
})
