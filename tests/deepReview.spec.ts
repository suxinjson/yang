import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import WebSocket from 'ws'
import { backend } from './helpers/backend'

test('legacy draw preserves live rounds, rooms, receipts and financial journal across restart', async () => {
  const server = await backend()
  const ledger = () => JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
  try {
    const solo = await (await server.post('/api/play/solo/start', { deviceId: 'review_solo_device', operationId: 'review_solo_start' })).json()
    const room = await (await server.post('/api/play/rooms', { deviceId: 'review_room_device' })).json()
    await server.post('/api/play/solo/tool', { roundId: solo.game.roundId, token: solo.token, operationId: 'review_hint_receipt', tool: 'hint' })
    const before = ledger()
    const token = await server.login()
    const drawBody = { deviceId: 'review_draw_device', operationId: 'review_draw_receipt', context: 'win_1' }
    expect((await server.post('/api/coupons/draw', drawBody)).status).toBe(401)
    const draw = await server.post('/api/coupons/draw', drawBody, token)
    expect(draw.status).toBe(200)
    const after = ledger()
    expect(after.rounds).toEqual(before.rounds)
    expect(after.rooms).toEqual(before.rooms)
    expect(after.transactions).toHaveLength(before.transactions.length + 1)
    expect(after.transactions.at(-1).event).toBe('coupon_gain')
    expect((await server.post('/api/coupons/draw', drawBody)).status).toBe(200)
    await server.restart()
    const sync = await server.post('/api/play/solo/sync', { roundId: solo.game.roundId, token: solo.token })
    expect((await sync.json()).tools.hint).toBe(1)
    expect((await server.post('/api/play/rooms/resume', { roomId: room.room.id, token: room.token })).status).toBe(200)
  } finally { await server.close() }
})

test('missing, coerced and inherited identifiers cannot mutate inventory or create memberships', async () => {
  const server = await backend()
  try {
    const solo = await (await server.post('/api/play/solo/start', { deviceId: 'review_valid_device', operationId: 'review_valid_start' })).json()
    for (const bad of [undefined, null, 12345678, {}, 'constructor', '__proto__']) {
      expect((await server.post('/api/play/solo/start', { deviceId: bad, operationId: 'review_invalid_start' })).status).toBe(400)
      expect((await server.post('/api/play/rooms', { deviceId: bad })).status).toBe(400)
      expect((await server.post('/api/play/solo/tool', { roundId: solo.game.roundId, token: solo.token, operationId: bad, tool: 'hint' })).status).toBe(400)
    }
    expect((await server.post('/api/play/solo/tool', { roundId: '__proto__', operationId: 'review_proto_attack', tool: 'hint' })).status).toBe(403)
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(Object.keys(ledger.rounds)).toHaveLength(1)
    expect(Object.keys(ledger.rooms)).toHaveLength(0)
    expect(ledger.rounds[solo.game.roundId].game.tools.hint).toBe(2)
  } finally { await server.close() }
})

test('room creation and join retries recover the same seat and require the original secret', async () => {
  const server = await backend()
  try {
    const create = { deviceId: 'review_create_device', operationId: 'review_create_receipt', claimToken: 'a'.repeat(64) }
    const first = await (await server.post('/api/play/rooms', create)).json()
    const second = await (await server.post('/api/play/rooms', create)).json()
    expect(second.token).toBe(first.token)
    expect(second.room.id).toBe(first.room.id)
    const join = { deviceId: 'review_join_device', operationId: 'review_join_receipt', claimToken: 'b'.repeat(64), code: first.room.code }
    const responses = await Promise.all([server.post('/api/play/rooms/join', join), server.post('/api/play/rooms/join', join)])
    const [a, b] = await Promise.all(responses.map(response => response.json()))
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect(a.token).toBe(b.token)
    expect(a.room.members).toBe(2)
    expect((await server.post('/api/play/rooms/join', { ...join, claimToken: 'c'.repeat(64) })).status).toBe(409)
    await server.restart()
    const resumed = await (await server.post('/api/play/rooms/join', join)).json()
    expect(resumed.token).toBe(a.token)
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(ledger.transactions.filter((row: any) => row.event === 'room_create')).toHaveLength(1)
    expect(ledger.transactions.filter((row: any) => row.event === 'room_join')).toHaveLength(1)
  } finally { await server.close() }
})

test('App recovers a lost join acknowledgement and superseded tabs stay disconnected', async ({ page, context }) => {
  const server = await backend()
  let twin: Awaited<ReturnType<typeof context.newPage>> | undefined
  try {
    const creator = await (await server.post('/api/play/rooms', { deviceId: 'review_host_device' })).json()
    await server.attach(page, true); await page.goto('/')
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await page.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await page.getByLabel('四位房间密码').fill(creator.room.code)
    await page.route('**/api/play/rooms/join', async route => {
      await route.fetch({ url: server.base + '/api/play/rooms/join' }); await route.abort()
    }, { times: 1 })
    await page.getByRole('button', { name: '加入房间', exact: true }).click()
    await expect(page.getByRole('button', { name: '重试未确认操作' })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: '重试未确认操作' }).click()
    await expect(page.getByTestId('room-code')).toHaveText(creator.room.code)
    await expect(page.getByTestId('mode-panel').getByRole('status')).toContainText('已连接')
    twin = await context.newPage(); await server.attach(twin, true); await twin.goto('/')
    await expect(twin.getByTestId('mode-panel').getByRole('status')).toContainText('已连接')
    await expect(page.getByText('同一身份已在另一页面连接；点击重新连接可接管', { exact: true })).toBeVisible()
    const before = server.frames.filter(frame => frame.type === 'replaced').length
    // A stable new connection can issue multiple authoritative commands while the old tab remains paused.
    await twin.getByRole('button', { name: /透视卡/ }).click()
    await expect(twin.getByRole('button', { name: /透视卡/ })).toContainText('剩 1 次')
    await twin.waitForTimeout(1800)
    expect(server.frames.filter(frame => frame.type === 'replaced')).toHaveLength(before)
    await expect(twin.getByTestId('mode-panel').getByRole('status')).toContainText('已连接')
  } finally { await twin?.close(); await page.close(); await server.close() }
})

test('invalid room actions are definitive rejections and do not trap subsequent commands', async () => {
  const server = await backend()
  let socket: WebSocket | undefined
  const receive = (predicate: (data: any) => boolean) => new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Response timeout')), 5000)
    const listener = (raw: WebSocket.RawData) => { const data = JSON.parse(raw.toString()); if (predicate(data)) { clearTimeout(timer); socket!.off('message', listener); resolve(data) } }
    socket!.on('message', listener)
  })
  try {
    const room = await (await server.post('/api/play/rooms', { deviceId: 'review_rules_device' })).json()
    socket = new WebSocket(server.base.replace('http:', 'ws:') + '/api/play/socket')
    await new Promise<void>(resolve => socket!.once('open', resolve))
    const ready = receive(data => data.type === 'snapshot')
    socket.send(JSON.stringify({ type: 'auth', ...server.credentials(room.backpack.profileId), roomId: room.room.id, token: room.token })); await ready
    const rejected = receive(data => data.rejected === 'review_invalid_pick')
    socket.send(JSON.stringify({ operationId: 'review_invalid_pick', revision: room.room.revision, roundId: room.game.roundId, action: { type: 'pick', cardId: -1 } }))
    expect((await rejected).type).toBe('error')
    const ack = receive(data => data.ack === 'review_valid_hint')
    socket.send(JSON.stringify({ operationId: 'review_valid_hint', revision: room.room.revision, roundId: room.game.roundId, action: { type: 'hint' } }))
    expect((await ack).patch.tools.hint).toBe(1)
  } finally { socket?.terminate(); await server.close() }
})

test('transient room storage failure and a lost committed acknowledgement preserve one inventory receipt', async ({ page }) => {
  test.setTimeout(30000)
  const server = await backend(), file = path.join(server.directory, 'coupon-ledger.json')
  let dropAck = true
  try {
    await server.attach(page, true, frame => {
      if (frame.ack && dropAck) { dropAck = false; return false }
      return true
    })
    await page.goto('/')
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await page.getByRole('button', { name: '情侣同玩', exact: true }).click()
    await page.getByRole('button', { name: '创建情侣房间', exact: true }).click()
    await expect(page.getByTestId('mode-panel').getByRole('status')).toContainText('已连接')
    const original = readFileSync(file, 'utf8')
    writeFileSync(file, '{storage temporarily unavailable')
    await page.getByRole('button', { name: /透视卡/ }).click()
    await expect.poll(() => server.frames.some(frame => frame.type === 'error' && !frame.rejected)).toBe(true)
    const operationId = await page.evaluate(() => JSON.parse(localStorage.getItem('gang_room_pending')!).operationId)
    writeFileSync(file, original)
    await expect.poll(() => page.evaluate(() => !localStorage.getItem('gang_room_pending')), { timeout: 15000 }).toBe(true)
    await expect(page.getByRole('button', { name: /透视卡/ })).toContainText('剩 1 次')
    await expect(page.getByRole('alert')).toHaveCount(0)
    const ledger = JSON.parse(readFileSync(file, 'utf8'))
    expect(ledger.transactions.filter((row: any) => row.event === 'prop_use')).toHaveLength(1)
    expect(Object.values(ledger.rooms).some((room: any) => room.operations[operationId])).toBe(true)
    expect(dropAck).toBe(false)
  } finally { await page.close(); await server.close() }
})

test('legacy administrator grant receipts survive reset without resurrecting a removed coupon', async () => {
  const server = await backend()
  try {
    const token = await server.login()
    const coupon = { id: 'review_legacy_grant', title: 'Grant receipt test', used: false }
    expect((await server.post('/api/coupons', coupon, token)).status).toBe(200)
    expect((await server.post('/api/coupons', coupon, token)).status).toBe(200)
    await server.post('/api/coupons/reset', {}, token)
    await server.restart()
    const newToken = await server.login()
    expect((await server.post('/api/coupons', coupon, newToken)).status).toBe(409)
    const state = await (await fetch(server.base + '/api/state')).json()
    expect(state.state.coupons).toEqual([])
  } finally { await server.close() }
})

test('production admin entry avoids redirect loops and preserves a reverse proxy subpath', async () => {
  const server = await backend()
  try {
    const entry = await fetch(server.base + '/admin', { redirect: 'manual' })
    expect(entry.status).toBe(200)
    expect(entry.headers.get('content-type')).toContain('text/html')
    const trailingSlash = await fetch(server.base + '/admin/', { redirect: 'manual' })
    expect(trailingSlash.status).toBe(308)
    const location = trailingSlash.headers.get('location')!
    expect(new URL(location, server.base + '/admin/').pathname).toBe('/admin')
    expect(new URL(location, 'https://example.test/gang/admin/').pathname).toBe('/gang/admin')
  } finally { await server.close() }
})

test('coupon modal can retry a lost redemption acknowledgement after the coupon already appears used', async ({ page }) => {
  const server = await backend()
  try {
    await server.attach(page, true); await page.goto('/')
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await page.getByTitle('查看个人背包').click()
    await page.route('**/api/play/coupons/redeem', async route => {
      await route.fetch({ url: server.base + '/api/play/coupons/redeem' }); await route.abort()
    }, { times: 1 })
    await page.getByRole('button', { name: /兑现/ }).first().click()
    await expect(page.getByRole('button', { name: '重试未确认操作' })).toBeVisible()
    // Refresh with the committed global state: retry must remain reachable inside the modal.
    await page.reload()
    await page.getByRole('button', { name: '重试未确认操作' }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('gang_pending_redeem'))).toBe(null)
    const ledger = JSON.parse(readFileSync(path.join(server.directory, 'coupon-ledger.json'), 'utf8'))
    expect(ledger.transactions.filter((row: any) => row.event === 'coupon_use')).toHaveLength(1)
  } finally { await page.close(); await server.close() }
})
