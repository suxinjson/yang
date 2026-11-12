import { fork } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import WebSocket from 'ws'
import type { Page } from '@playwright/test'

export async function backend() {
  const directory = mkdtempSync(path.join(tmpdir(), 'yang-play-test-'))
  let child: ReturnType<typeof fork>, base = ''
  const bridges = new Set<WebSocket>()
  const frames: any[] = []
  async function start() {
    child = fork(path.resolve('server.js'), [], { env: { ...process.env, PORT: '0', DATA_DIR: directory }, silent: true })
    const [message] = await Promise.race([once(child, 'message'), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('Backend timeout')), 10000); timer.unref() })])
    base = `http://127.0.0.1:${message.port}`
  }
  async function stop() { if (child && !child.killed && child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited } }
  await start()
  const post = (url: string, data: unknown, token?: string) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) })
  return {
    directory, frames, get base() { return base }, post,
    async login() { return (await (await post('/api/admin/login', { password: 'admin' })).json()).token as string },
    async attach(page: Page, native = false, forwardFrame: (frame: any) => boolean = () => true) {
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
    async restart() { for (const bridge of bridges) bridge.terminate(); await stop(); await start() },
    async close() {
      for (const bridge of bridges) bridge.terminate()
      await stop()
      if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-play-test-')) throw new Error('Unexpected test directory')
      rmSync(directory, { recursive: true, force: true })
    }
  }
}
