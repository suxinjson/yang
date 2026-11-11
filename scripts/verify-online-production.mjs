import { chromium } from '@playwright/test'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { readFile, mkdtemp, readdir, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const directory = await mkdtemp(path.join(tmpdir(), 'yang-production-'))
const backend = fork(path.resolve('server.js'), [], { env: { ...process.env, PORT: '0', DATA_DIR: directory }, silent: true })
const root = path.resolve('android/app/src/main/assets/public')
const web = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404).end() }
})
let browser
try {
  const [{ port }] = await Promise.race([
    once(backend, 'message'),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Backend start timed out')), 10000); timer.unref() })
  ])
  const base = `http://127.0.0.1:${port}`
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve))
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.addInitScript(() => { window.androidBridge = {} })
  await page.route('https://124.70.184.136/gang/**', async route => {
    const original = route.request().url()
    const response = await route.fetch({ url: base + original.slice('https://124.70.184.136/gang'.length) })
    await route.fulfill({ response })
  })
  await page.goto(`http://127.0.0.1:${web.address().port}`)
  await page.locator('.game-card.is-clickable').first().waitFor()
  await page.locator('.game-card.is-clickable').first().click()
  await page.locator('.in-slot').first().waitFor()
  await mkdir('artifacts/android', { recursive: true })
  await page.screenshot({ path: 'artifacts/android/online-game.png', fullPage: true })
  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'admin' }) })
  const { token } = await login.json()
  const logs = await (await fetch(`${base}/api/admin/client-logs`, { headers: { Authorization: `Bearer ${token}` } })).json()
  assert(logs.items.some(row => row.event === 'card_pick'))
  assert(logs.items.some(row => row.event === 'session_start' && row.platform === 'android' && row.version === '1.2.1'))
  await context.setOffline(true)
  await page.locator('[data-online-gate]').waitFor()
  assert.equal(await page.locator('.board-arena').count(), 0)
  await page.screenshot({ path: 'artifacts/android/offline-locked.png', fullPage: true })
  assert((await readdir(path.join(directory, 'client-logs'))).length > 0)
  console.log(JSON.stringify({ productionSmoke: 'passed', realBackend: true, operationPersisted: true, offlineLocked: true, events: logs.items.map(row => row.event) }))
} finally {
  if (browser) await browser.close()
  if (web.listening) await new Promise(resolve => web.close(resolve))
  if (!backend.killed && backend.exitCode === null) { const exited = once(backend, 'exit'); backend.kill(); await exited }
  if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-production-')) throw new Error('Unexpected smoke directory')
  await rm(directory, { recursive: true, force: true })
}
