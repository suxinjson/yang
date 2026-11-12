import { chromium, expect } from '@playwright/test'
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
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404).end() }
})
let browser
try {
  const [{ port }] = await Promise.race([once(backend, 'message'), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Backend timeout')), 10000); timer.unref() })])
  const base = 'http://127.0.0.1:' + port
  const post = (url, body, token) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })
  const { token } = await (await post('/api/admin/login', { password: 'admin' })).json()
  await post('/api/config', { gameSettings: { levels: [{ minCards: 6, maxCards: 6, types: 1 }] } }, token)
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve))
  assert(!(await readdir(path.join(root, 'assets'))).some(file => /Admin/.test(file)), 'Android bundle includes administrator code')
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
  const page = await context.newPage(), requests = []
  await page.addInitScript(() => { window.androidBridge = {} })
  page.on('request', req => { if (req.url().includes('/api/')) requests.push(req.url()) })
  const embeddedBase = (await readFile('.env.android', 'utf8')).match(/^VITE_API_URL=(.+)$/m)[1].trim()
  await page.route(embeddedBase + '/**', async route => {
    try { const response = await route.fetch({ url: base + route.request().url().slice(embeddedBase.length) }); await route.fulfill({ response }) }
    catch { await route.abort().catch(() => {}) }
  })
  await page.goto('http://127.0.0.1:' + web.address().port)
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  const baseline = requests.length
  await page.locator('.board-arena .is-clickable').first().click()
  await expect(page.locator('.in-slot')).toHaveCount(1)
  await context.setOffline(true)
  await page.locator('.board-arena .is-clickable').first().click()
  await expect(page.locator('.in-slot')).toHaveCount(2)
  assert.equal(requests.length, baseline, 'Card picks must stay local')
  assert(!requests.some(url => /events|heartbeat|client\/state/.test(url)))
  await context.setOffline(false)
  await page.locator('.props-bar button').first().click()
  await expect(page.locator('.props-bar button').first()).toContainText('1')
  for (let pick = 2; pick < 6; pick++) {
    await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
    await page.locator('.board-arena .is-clickable').first().click()
  }
  const ledger = async () => JSON.parse(await readFile(path.join(directory, 'coupon-ledger.json'), 'utf8'))
  await expect.poll(async () => (await ledger()).transactions.filter(row => row.event === 'coupon_gain' && row.details.roundId).length).toBe(1)
  const value = await ledger()
  assert(value.transactions.filter(row => row.source !== 'server').every(row => row.source === 'android_app' && row.ip && row.device && row.version === '2.0.0'))
  assert.equal(value.transactions.filter(row => row.event === 'prop_use').length, 1)
  assert(!value.transactions.some(row => /click|card_pick|heartbeat/.test(row.event)))
  await expect(page.getByRole('button', { name: '进入下一关！', exact: true })).toBeEnabled()
  await expect(page.locator('.operation-overlay')).toHaveCount(0)
  await mkdir('artifacts/android', { recursive: true })
  await page.screenshot({ path: 'artifacts/android/production-win.png', fullPage: true })
  console.log(JSON.stringify({ productionSmoke: 'passed', realBackend: true, noClickRequests: true, offlinePicks: true, atomicReward: true, adminExcludedFromApk: true, events: value.transactions.map(row => row.event) }))
} finally {
  if (browser) await browser.close()
  if (web.listening) await new Promise(resolve => web.close(resolve))
  if (!backend.killed && backend.exitCode === null) { const exited = once(backend, 'exit'); backend.kill(); await exited }
  if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-production-')) throw new Error('Unexpected smoke directory')
  await rm(directory, { recursive: true, force: true })
}
