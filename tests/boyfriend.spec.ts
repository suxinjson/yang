import { test, expect, type Page } from '@playwright/test'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { backend } from './helpers/backend'
const servers = new Map<Page, Awaited<ReturnType<typeof backend>>>()
test.afterEach(async ({ page }) => { await page.close(); await servers.get(page)?.close(); servers.delete(page) })
import { defaultGameSettings } from '../shared/gameConfig.js'
import { defaultBoyfriendPhotos, normalizeBoyfriendSettings } from '../shared/boyfriendConfig.js'

async function setup(page: Page) {
  const settings = defaultGameSettings()
  settings.levels[0] = { ...settings.levels[0], minCards: 90, maxCards: 90, types: 12, layers: 3 }
  const server = await backend(); servers.set(page, server)
  const token = await server.login()
  await server.post('/api/config', { gameSettings: settings, ...normalizeBoyfriendSettings({}), bfPhotoIndex: 1 }, token)
  await server.attach(page)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/?admin')
  await page.getByPlaceholder('请输入管理员密码...').fill('admin')
  await page.getByRole('button', { name: /登录后台/ }).click()
  await page.getByRole('button', { name: /卡牌种类与图片/ }).click()
  await expect(page.getByTestId('boyfriend-settings')).toBeVisible()
  return { config: () => JSON.parse(readFileSync(path.join(server.directory, 'config.json'), 'utf8')) }
}

test('legacy names and images migrate, preset switching is preserved, bad values are repaired', () => {
  const migrated = normalizeBoyfriendSettings({ bfPhotoIndex: 3, customCards: [{ id: 'boyfriend_photo', name: '专属名字', customImage: '/photos/custom_old.jpg' }] })
  expect(migrated.bfPhotos[2]).toEqual({ name: '专属名字', image: '/photos/custom_old.jpg' })
  expect(migrated.bfCardEnabled).toBe(true)
  const switched = normalizeBoyfriendSettings({ bfPhotoIndex: 5, activeCardPhotos: { boyfriend_photo: '/photos/bf_1.jpg' } })
  expect(switched.bfPhotos[4].image).toBe('/photos/bf_5.jpg')
  const invalid = normalizeBoyfriendSettings({ bfPhotos: [{ name: '  ', image: 'javascript:alert(1)' }, null], bfCardEnabled: 'false' })
  expect(invalid.bfPhotos).toEqual(defaultBoyfriendPhotos())
  expect(invalid.bfCardEnabled).toBe(true)
  expect(normalizeBoyfriendSettings({ bfCardEnabled: false }).bfCardEnabled).toBe(false)
  expect(normalizeBoyfriendSettings(migrated)).toEqual(migrated)
})

test('rename and replace a photo, persist it and show it in cards and rescue', async ({ page }) => {
  const fixture = await setup(page)
  await page.getByLabel('帅照2名字', { exact: true }).fill('专属救场队长')
  await page.getByLabel('使用哪张帅照', { exact: true }).selectOption('2')
  const buffer = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#4499dd' } }).png().toBuffer()
  await page.getByLabel('更换帅照2', { exact: true }).setInputFiles({ name: 'new-photo.png', mimeType: 'image/png', buffer })
  await expect.poll(() => fixture.config().bfPhotos[1].image).toMatch(/^data:image\/jpeg;base64,/)
  expect(fixture.config().bfPhotos[1].name).toBe('专属救场队长')
  expect(fixture.config().bfPhotos[0].image).toBe('/photos/bf_1.jpg')
  const image = await sharp(Buffer.from(fixture.config().bfPhotos[1].image.split(',')[1], 'base64')).metadata()
  expect(image.width).toBe(640)
  expect(image.height).toBe(427)
  await page.getByTestId('boyfriend-settings').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/boyfriend-settings.png' })
  await page.getByRole('button', { name: '保存全部配置' }).click()
  await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await page.getByTitle('重新开始本关').click()
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.board-arena .game-card').filter({ hasText: '专属救场队长' }).first()).toBeVisible()
  await page.locator('.board-arena .is-clickable').first().click()
  await page.getByRole('button', { name: /应急救场/ }).click()
  await expect(page.getByTestId('rescue-photo-name')).toHaveText('专属救场队长')
  await expect(page.getByAltText('专属救场队长', { exact: true }).last()).toHaveAttribute('src', fixture.config().bfPhotos[1].image)
  await page.goto('/')
  await expect(page.locator('.board-arena .game-card').filter({ hasText: '专属救场队长' }).first()).toBeVisible()
})

test('deck toggle applies next round and rescue continues to use the configured photo', async ({ page }) => {
  const fixture = await setup(page)
  await expect(page.locator('.board-arena')).toHaveCount(0)
  await page.getByLabel('男友帅照加入叠叠卡牌', { exact: true }).uncheck()
  await expect.poll(() => fixture.config().bfCardEnabled).toBe(false)
  await expect(page.locator('.board-arena')).toHaveCount(0)
  await page.getByLabel('帅照1名字', { exact: true }).fill('救场专用')
  await page.getByRole('button', { name: '保存全部配置' }).click()
  await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await page.getByTitle('重新开始本关').click()
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  const types = await page.evaluate(() => {
    const state = (document.querySelector('#app') as any).__vue_app__._instance.setupState
    return state.allCards.map((card: any) => card.type)
  })
  expect(types).not.toContain('boyfriend_photo')
  await page.locator('.board-arena .is-clickable').first().click()
  await page.getByRole('button', { name: /应急救场/ }).click()
  await expect(page.getByTestId('rescue-photo-name')).toHaveText('救场专用')
  await page.getByRole('button', { name: /继续.*闯关/ }).click()
  await page.goto('/?admin')
  await page.getByRole('button', { name: /卡牌种类与图片/ }).click()
  await expect(page.getByLabel('男友帅照加入叠叠卡牌', { exact: true })).not.toBeChecked()
  await page.getByLabel('男友帅照加入叠叠卡牌', { exact: true }).check()
  await page.getByRole('button', { name: '保存全部配置' }).click()
  await expect(page.getByText('已保存并同步到服务器', { exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await page.getByTitle('重新开始本关').click()
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.board-arena .game-card').filter({ hasText: '救场专用' }).first()).toBeVisible()
})

test('invalid uploads keep the previous photo and restore returns to the preset', async ({ page }) => {
  const fixture = await setup(page)
  await page.getByLabel('更换帅照1', { exact: true }).setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(page.getByRole('alert')).toHaveText('照片读取失败，请选择有效图片后重试。')
  expect(fixture.config().bfPhotos[0].image).toBe('/photos/bf_1.jpg')
  const buffer = await sharp({ create: { width: 80, height: 80, channels: 3, background: '#cc4488' } }).png().toBuffer()
  await page.getByLabel('更换帅照1', { exact: true }).setInputFiles({ name: 'valid.png', mimeType: 'image/png', buffer })
  await expect.poll(() => fixture.config().bfPhotos[0].image).toMatch(/^data:/)
  await page.getByLabel('恢复帅照1默认照片', { exact: true }).click()
  await expect.poll(() => fixture.config().bfPhotos[0].image).toBe('/photos/bf_1.jpg')
})

test('random mode keeps each photo paired with its name', async ({ page }) => {
  await setup(page)
  const selected = await page.evaluate(async () => {
    const modulePath = '/src/utils/adminConfig.ts'
    const { loadAdminConfig, getActiveBfProfile } = await import(modulePath)
    const config = loadAdminConfig()
    config.bfPhotoIndex = 0
    config.bfPhotos = config.bfPhotos.map((photo: any, index: number) => ({ ...photo, name: `Name ${index}`, image: `/photos/photo_${index}.jpg` }))
    return [0, 1, 2, 3, 4, 5].map(index => getActiveBfProfile(config, () => (index + 0.5) / 6))
  })
  expect(selected).toEqual(Array.from({ length: 6 }, (_, index) => ({ name: `Name ${index}`, image: `/photos/photo_${index}.jpg` })))
})
