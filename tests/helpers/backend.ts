import { fork } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import WebSocket from 'ws'
import { randomUUID, randomBytes } from 'node:crypto'
import type { Page } from '@playwright/test'

export async function backend() {
  const directory = mkdtempSync(path.join(tmpdir(), 'yang-play-test-'))
  let child: ReturnType<typeof fork>, base = ''
  const profiles = new Map<string, { profileId: string; profileSecret: string }>()
  function credentials(key: string) { if (!profiles.has(key)) { const value = { profileId: randomUUID(), profileSecret: randomBytes(32).toString('hex') }; profiles.set(key, value); profiles.set(value.profileId, value) }; return profiles.get(key)! }
  const bridges = new Set<WebSocket>()
  const frames: any[] = []
  async function start() {
    child = fork(path.resolve('server.js'), [], { env: { ...process.env, PORT: '0', DATA_DIR: directory, STORAGE_DRIVER: 'file' }, silent: true })
    const [message] = await Promise.race([once(child, 'message'), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('Backend timeout')), 10000); timer.unref() })])
    base = `http://127.0.0.1:${message.port}`
  }
  async function stop() { if (child && !child.killed && child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited } }
  await start()
  const send = (url: string, data: unknown, token?: string) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) })
  async function post(url: string, data: unknown, token?: string) {
    let body = data as Record<string, any>
    if (url.startsWith('/api/play/') && !url.includes('/admin/') && !body.profileId && url !== '/api/play/profile') {
      let owner = ''
      try { const ledger = JSON.parse(readFileSync(path.join(directory, 'coupon-ledger.json'), 'utf8')); owner = ledger.rounds?.[body.roundId]?.actor.profileId || ledger.rooms?.[body.roomId]?.members.find((member: any) => member.token === body.token)?.actor.profileId || ledger.coupons.find((coupon: any) => coupon.id === body.couponId)?.ownerId || '' } catch { /* New ledger. */ }
      const identity = credentials(owner || body.deviceId || 'test_default_device')
      await send('/api/play/profile', identity)
      body = { ...body, ...identity }
    }
    return send(url, body, token)
  }
  return {
    directory, frames, credentials, get base() { return base }, post,
    async login() { return (await (await post('/api/admin/login', { password: 'admin' })).json()).token as string },
    async attach(page: Page, native = false, forwardFrame: (frame: any) => boolean = () => true) {
      const profile = credentials(randomUUID())
      await page.addInitScript(value => { if (!localStorage.getItem('gang_personal_profile_v1')) localStorage.setItem('gang_personal_profile_v1', JSON.stringify(value)) }, profile)
      if (native) await page.addInitScript(() => { (window as any).androidBridge = {} })
      await page.route('**/api/**', async route => {
        try { const response = await route.fetch({ url: base + new URL(route.request().url()).pathname + new URL(route.request().url()).search }); await route.fulfill({ response }) }
        catch { await route.abort().catch(() => {}) }
      })
      await page.route('**/photos/**', route => route.abort())
      await page.routeWebSocket('**/api/play/socket', downstream => {
        const upstream = new WebSocket(base.replace('http:', 'ws:') + '/api/play/socket')
        bridges.add(upstream)
        const queue: (string | Buffer)[] = []
        downstream.onMessage(data => { if (upstream.readyState === WebSocket.OPEN) upstream.send(data); else queue.push(data) })
        upstream.on('open', () => { for (const data of queue) upstream.send(data) })
        upstream.on('message', data => { const frame = JSON.parse(data.toString()); frames.push(frame); if (forwardFrame(frame)) downstream.send(data.toString()) })
        upstream.on('close', () => { bridges.delete(upstream); void downstream.close() })
        upstream.on('error', () => { void downstream.close() })
        downstream.onClose(() => upstream.close())
      })
    },
    async restart(beforeStart?: () => void) { for (const bridge of bridges) bridge.terminate(); await stop(); beforeStart?.(); await start() },
    async close() {
      for (const bridge of bridges) bridge.terminate()
      await stop()
      if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-play-test-')) throw new Error('Unexpected test directory')
      rmSync(directory, { recursive: true, force: true })
    }
  }
}
