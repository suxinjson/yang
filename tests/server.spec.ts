import { test, expect } from '@playwright/test'
import { fork, type ChildProcess } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { once } from 'node:events'
import { normalizeGameSettings } from '../shared/gameConfig.js'

test('server persists settings, hides passwords and rejects forged authentication', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'yang-config-test-'))
  let child: ChildProcess | undefined
  let base = ''
  async function start() {
    child = fork(path.resolve('server.js'), [], { env: { ...process.env, PORT: '0', DATA_DIR: directory }, silent: true })
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test server did not start')), 10000)
      child!.once('message', (message: any) => { clearTimeout(timer); resolve(message.port) })
      child!.once('error', error => { clearTimeout(timer); reject(error) })
    })
    base = `http://127.0.0.1:${port}`
  }
  async function stop() {
    if (child && child.exitCode === null && !child.killed) {
      const exited = once(child, 'exit')
      child.kill()
      await exited
    }
  }
  function post(route: string, body: unknown, token?: string) {
    return fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
  }
  try {
    await start()
    const initial = await (await fetch(`${base}/api/config`)).json()
    expect(initial).not.toHaveProperty('adminPassword')
    expect(initial.gameSettings.levels).toHaveLength(3)
    for (const token of [undefined, 'offline_token_fake', `auth_${Date.now() + 1_000_000}`]) {
      expect((await post('/api/config', { couponName: 'forged' }, token)).status).toBe(401)
    }
    expect((await post('/api/admin/login', { password: 'wrong' })).status).toBe(401)
    const login = await (await post('/api/admin/login', { password: 'admin' })).json()
    expect(login.success).toBe(true)
    const token = login.token
    const raw = { boardWidth: 360, boardHeight: 640, levels: [{ minCards: 25, maxCards: 31, layers: 8, spreadX: 60, spreadY: 70, layout: 'heart' }] }
    const saved = await (await post('/api/config', { gameSettings: raw, adminPassword: 'injected' }, token)).json()
    expect(saved.config.gameSettings).toEqual(normalizeGameSettings(raw))
    expect(saved.config).not.toHaveProperty('adminPassword')
    expect(JSON.parse(readFileSync(path.join(directory, 'config.json'), 'utf8')).adminPassword).toBe('admin')
    const boyfriend = await (await post('/api/config', { bfCardEnabled: false, bfPhotoIndex: 2, bfPhotos: [{ name: '帅照一', image: '/photos/replacement.jpg' }, { name: '救场队长', image: '/photos/second.jpg' }] }, token)).json()
    expect(boyfriend.config.bfCardEnabled).toBe(false)
    expect(boyfriend.config.bfPhotos).toHaveLength(6)
    expect(boyfriend.config.bfPhotos[1]).toEqual({ name: '救场队长', image: '/photos/second.jpg' })
    expect((await post('/api/config', [], token)).status).toBe(400)
    expect((await post('/api/config', { customCards: [null, null, null] }, token)).status).toBe(400)
    expect((await post('/api/admin/password', { password: 'x' }, token)).status).toBe(400)
    const changed = await (await post('/api/admin/password', { password: 'test-secret-123' }, token)).json()
    expect(changed.success).toBe(true)
    expect((await post('/api/config', {}, token)).status).toBe(401)
    expect((await post('/api/config', { couponName: '测试配置' }, changed.token)).status).toBe(200)
    await stop()
    await start()
    const restored = await (await fetch(`${base}/api/config`)).json()
    expect(restored.gameSettings).toEqual(normalizeGameSettings(raw))
    expect(restored.couponName).toBe('测试配置')
    expect(restored.bfCardEnabled).toBe(false)
    expect(restored.bfPhotos[1]).toEqual({ name: '救场队长', image: '/photos/second.jpg' })
    expect(restored.activeBfPhoto).toBe('/photos/second.jpg')
    expect(restored).not.toHaveProperty('adminPassword')
    expect((await post('/api/admin/login', { password: 'test-secret-123' })).status).toBe(200)
  } finally {
    await stop()
    const resolved = path.resolve(directory)
    if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith('yang-config-test-')) throw new Error('Unexpected test data directory')
    rmSync(resolved, { recursive: true, force: true })
  }
})
