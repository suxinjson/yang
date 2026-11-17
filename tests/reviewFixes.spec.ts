import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { backend } from './helpers/backend'
import { winningActions } from './helpers/gameProof.mjs'
import { createHash } from 'node:crypto'

test('ownership, slot validation, authoritative furniture and verified settlement reject forged requests', async () => {
  const server = await backend()
  try {
    const cred = server.credentials('review_owner')
    await server.post('/api/play/profile', cred)
    const post = (url: string, body: any) => server.post(url, { ...cred, ...body })
    for (const equippedSlots of [{ top: 'gang.hint' }, { hair: 'wardrobe.fake' }, { top: 'wardrobe.top.couple_suit' }, { bad: null }]) {
      expect((await post('/api/home/avatar/save-all', { equippedSlots })).status).toBeGreaterThanOrEqual(400)
    }
    const good = await (await post('/api/home/avatar/save-all', { equippedSlots: { top: 'wardrobe.top.white_tshirt' } })).json()
    expect(good.backpack.tools.hint).toBe(2)
    for (const change of [{ catalogId: 'furniture.fake' }, { w: -1 }, { layer: 'rug' }, { x: 0.5 }, { rot: 45 }]) {
      expect((await post('/api/home/space/save', { placedFurnitures: [{ instanceId: 'sofa', catalogId: 'furniture.sofa.modern', x: 0, y: 0, ...change }] })).status).toBe(400)
    }
    expect((await post('/api/home/space/save', { placedFurnitures: [{ instanceId: 'bed', catalogId: 'furniture.bed.double', x: 0, y: 0 }] })).status).toBe(403)
    const sofa = { instanceId: 'sofa', catalogId: 'furniture.sofa.modern', x: 0, y: 0 }
    expect((await post('/api/home/space/save', { placedFurnitures: [sofa, sofa] })).status).toBe(400)
    const tv = { instanceId: 'tv', catalogId: 'furniture.tv.retro', x: 0, y: 0 }
    expect((await post('/api/home/space/save', { placedFurnitures: [sofa, tv] })).status).toBe(409)
    expect((await post('/api/home/space/save', { placedFurnitures: [sofa, { ...tv, x: 5, rot: 90 }] })).status).toBe(200)
    const admin = await server.login()
    await server.post('/api/config', { gameSettings: { levels: [{ minCards: 6, maxCards: 6, types: 1 }] }, rewardPolicy: { simultaneous: true, hintChance: 100, rescueChance: 0, couponChance: 100 } }, admin)
    const round = await (await post('/api/play/solo/start', { operationId: crypto.randomUUID(), deviceId: 'review_device' })).json()
    const finish = { roundId: round.game.roundId, token: round.token, outcome: 'won' }
    expect((await post('/api/play/solo/finish', finish)).status).toBe(400)
    expect((await post('/api/play/solo/finish', { ...finish, actions: [{ type: 'hint', operationId: 'fake' }] })).status).toBe(400)
    const actions = winningActions(round.game)
    expect((await post('/api/play/solo/finish', { ...finish, actions: [...actions, actions[0]] })).status).toBe(400)
    expect((await post('/api/play/solo/finish', { ...finish, actions })).status).toBe(200)
    expect((await post('/api/play/solo/finish', { ...finish, actions })).status).toBe(200)
    expect((await server.post('/api/game/record', { username: 'forged', durationSeconds: 1 })).status).toBe(410)
    const board = await (await fetch(server.base + '/api/game/leaderboard')).json()
    expect(board.list).toHaveLength(1)
    expect(board.list[0]).toMatchObject({ profileId: cred.profileId, movesCount: 6, verified: true })
  } finally { await server.close() }
})

test('job receipts survive lost acknowledgements and restart; pet rewards reject absent deadlines', async () => {
  const server = await backend()
  try {
    const cred = server.credentials('jobs_review')
    await server.post('/api/play/profile', cred)
    const post = (url: string, body: any = {}) => server.post(url, { ...cred, ...body })
    await post('/api/home/idle/start', { jobId: 'job_barista' })
    const file = path.join(server.directory, 'coupon-ledger.json')
    const value = JSON.parse(readFileSync(file, 'utf8'))
    value.idleJobs[cred.profileId].startedAt = new Date(Date.now() - 7200000).toISOString()
    value.companions[cred.profileId].petStatus = 'foraging'
    delete value.companions[cred.profileId].petForageEndAt
    writeFileSync(file, JSON.stringify(value))
    expect((await post('/api/home/idle/start', { jobId: 'job_illustrator' })).status).toBe(409)
    expect((await post('/api/home/companion/pet_reward')).status).toBe(400)
    const receiptToken = crypto.randomUUID()
    const first = await (await post('/api/home/idle/claim', { receiptToken })).json()
    expect(first.backpack.coins.gold).toBe(250)
    await server.restart()
    const retry = await (await post('/api/home/idle/claim', { receiptToken })).json()
    expect(retry.idempotent).toBe(true)
    expect(retry.backpack.coins.gold).toBe(250)
    expect((await post('/api/home/idle/claim', { receiptToken: crypto.randomUUID() })).status).toBe(409)
    const other = server.credentials('other_jobs_review')
    await server.post('/api/play/profile', other)
    expect((await server.post('/api/home/idle/claim', { ...other, receiptToken })).status).toBe(409)
  } finally { await server.close() }
})

test('password hashing, legacy migration, generic failures, rate limits and credential revocation', async () => {
  const server = await backend()
  try {
    const data = { username: 'review_user', password: 'a-long-test-password', nickname: '审查用户' }
    const registered = await (await server.post('/api/auth/register', data)).json()
    expect(registered.success).toBe(true)
    const file = path.join(server.directory, 'coupon-ledger.json')
    const ledger = () => JSON.parse(readFileSync(file, 'utf8'))
    expect(ledger().users.review_user.passwordHash).toMatch(/^scrypt:/)
    expect(ledger().users.review_user.profileSecret).toBeUndefined()
    const logged = await (await server.post('/api/auth/login', data)).json()
    expect(logged.user.profileSecret).not.toBe(registered.user.profileSecret)
    expect((await server.post('/api/home/overview', registered.user)).status).toBe(403)
    expect((await server.post('/api/home/overview', logged.user)).status).toBe(200)
    expect((await server.post('/api/auth/logout', logged.user)).status).toBe(200)
    expect((await server.post('/api/home/overview', logged.user)).status).toBe(403)
    const missing = await server.post('/api/auth/login', { username: 'absent', password: 'wrong' })
    const wrong = await server.post('/api/auth/login', { ...data, password: 'wrong' })
    expect(missing.status).toBe(401)
    expect(await missing.json()).toEqual(await wrong.json())
    for (let i = 0; i < 8; i++) await server.post('/api/auth/login', { ...data, password: 'wrong' })
    expect((await server.post('/api/auth/login', data)).status).toBe(429)
    const old = ledger()
    old.users.review_user.passwordHash = createHash('sha256').update('old' + '_gang_salt').digest('hex')
    old.users.review_user.profileSecret = registered.user.profileSecret
    writeFileSync(file, JSON.stringify(old))
    await server.restart()
    expect(ledger().users.review_user.profileSecret).toBeUndefined()
    expect((await server.post('/api/auth/login', { username: data.username, password: 'old' })).status).toBe(200)
    expect(ledger().users.review_user.passwordHash).toMatch(/^scrypt:/)
  } finally { await server.close() }
})

test('account changes clear snapshots and delayed responses cannot overwrite the next account', async ({ page }) => {
  const server = await backend()
  try {
    await server.attach(page)
    await page.goto('/?view=home')
    await page.evaluate(async () => {
      const { fetchPlatformOverview } = await import('/src/utils/platformState.ts' as string)
      await fetchPlatformOverview()
    })
    const state = await page.evaluate(async () => {
      const platform = await import('/src/utils/platformState.ts' as string)
      const backpack = await import('/src/utils/backpack.ts' as string)
      const previous = backpack.profileCredentials().profileId
      backpack.setStoredAuthUser(null)
      const cleared = platform.platformOverview.value === null
      const guest = backpack.profileCredentials().profileId
      await platform.fetchPlatformOverview()
      return { previous, guest, cleared, snapshot: platform.platformOverview.value?.profileId }
    })
    expect(state.cleared).toBe(true)
    expect(state.previous).not.toBe(state.guest)
    expect(state.snapshot).toBe(state.guest)
    let release!: () => void, received!: () => void
    const waiting = new Promise<void>(resolve => { received = resolve })
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/home/overview', async route => {
      const response = await route.fetch({ url: server.base + '/api/home/overview' })
      received()
      await gate
      await route.fulfill({ response })
    }, { times: 1 })
    await page.evaluate(() => { (window as any).reviewPending = import('/src/utils/platformState.ts' as string).then(module => module.fetchPlatformOverview()) })
    await waiting
    await page.evaluate(async () => { const module = await import('/src/utils/backpack.ts' as string); module.setStoredAuthUser(null) })
    release()
    await page.evaluate(() => (window as any).reviewPending)
    expect(await page.evaluate(async () => (await import('/src/utils/platformState.ts' as string)).platformOverview.value)).toBeNull()
  } finally { await page.close(); await server.close() }
})
