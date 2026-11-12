import { chromium, expect } from '@playwright/test'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { createServer, request } from 'node:http'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

assert((await readdir('dist/assets')).some(file => /^AdminApp-.*\.js$/.test(file)), 'Run npm run build before verifying the Web release')
const directory = await mkdtemp(path.join(tmpdir(), 'yang-web-production-'))
const backend = fork(path.resolve('server.js'), [], { env: { ...process.env, PORT: '0', DATA_DIR: directory }, silent: true })
let browser, proxy
try {
  const [{ port }] = await Promise.race([once(backend, 'message'), new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error('Backend timeout')), 10000); timer.unref()
  })])
  // Match Caddy's handle_path behavior, including relative redirect handling.
  proxy = createServer((req, res) => {
    const url = req.url.startsWith('/gang/') ? req.url.slice(5) : req.url
    const upstream = request({ hostname: '127.0.0.1', port, path: url, method: req.method, headers: req.headers }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res)
    })
    upstream.on('error', () => res.writeHead(502).end()); req.pipe(upstream)
  })
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve))
  const base = 'http://127.0.0.1:' + proxy.address().port
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  for (const entry of ['/admin', '/gang/admin/']) {
    const context = await browser.newContext(), page = await context.newPage(), requests = [], errors = []
    page.on('request', req => requests.push(req.url()))
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + entry)
    await page.getByPlaceholder('请输入管理员密码...').fill('admin')
    await page.getByRole('button', { name: /登录后台/ }).click()
    await expect(page.getByTestId('game-settings')).toBeVisible()
    await page.getByRole('button', { name: '保存全部配置', exact: true }).click()
    await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
    await expect(page.getByTestId('game-settings')).toBeVisible()
    await expect(page.locator('.board-arena')).toHaveCount(0)
    assert(!requests.some(url => /\/api\/play\/solo\//.test(url)), 'Administrator page started a game')
    assert.deepEqual(errors, [])
    assert.equal(new URL(page.url()).pathname, entry.replace(/\/$/, ''))
    await context.close()
  }
  console.log(JSON.stringify({ webProductionSmoke: 'passed', realBackend: true, rootAdmin: true, subpathAdmin: true, savesInPlace: true, noGameMounted: true }))
} finally {
  if (browser) await browser.close()
  if (proxy?.listening) await new Promise(resolve => proxy.close(resolve))
  if (!backend.killed && backend.exitCode === null) { const exited = once(backend, 'exit'); backend.kill(); await exited }
  if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-web-production-')) throw new Error('Unexpected smoke directory')
  await rm(directory, { recursive: true, force: true })
}
