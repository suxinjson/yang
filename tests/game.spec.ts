import { test, expect, type Page } from '@playwright/test'
import { createLevel } from '../shared/levelGenerator.js'
import { normalizeGameSettings } from '../shared/gameConfig.js'

const types = ['iron_heart', 'steel_heart', 'sock_meme', 'birthday_photo', 'flower_photo', 'boyfriend_photo', 'boba_tea', 'hug_kiss', 'gold_card']

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

async function openGame(page: Page) {
  await page.route('**/api/**', route => {
    if (route.request().url().endsWith('/coupons/draw')) {
      const coupon = { id: crypto.randomUUID(), title: 'Test reward', desc: '', icon: '💖', used: false, obtainedAt: 'test', target: 'boyfriend_pays' }
      return route.fulfill({ json: { coupon, list: [coupon] } })
    }
    return route.fulfill({ json: route.request().url().includes('/coupons') ? [] : null })
  })
  await page.route('**/photos/**', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.board-arena .game-card').first()).toBeVisible()
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
  await page.evaluate(() => {
    const state = (document.querySelector('#app') as any).__vue_app__._instance.setupState
    state.soundEnabled = false
  })
}

async function loadLevel(page: Page, level: 1 | 2 | 3, seed = 42) {
  const generated = createLevel(level, types, seeded(seed))
  await page.evaluate(({ cards, level }) => {
    const state = (document.querySelector('#app') as any).__vue_app__._instance.setupState
    state.initLevel(level)
    state.allCards = cards
  }, { cards: generated.cards, level })
  await expect(page.locator('.board-arena .game-card')).toHaveCount(generated.cards.length)
  return generated
}

for (const width of [320, 360, 390, 440, 1280]) {
  test(`all three layouts stay inside the board at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 })
    await openGame(page)
    for (const level of [1, 2, 3] as const) {
      await loadLevel(page, level)
      const result = await page.evaluate(() => {
        const arena = document.querySelector('.board-arena')!
        const bounds = arena.getBoundingClientRect()
        const cards = [...arena.querySelectorAll('.game-card')]
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          width: bounds.width,
          height: bounds.height,
          clipped: cards.filter(card => {
            const rect = card.getBoundingClientRect()
            return rect.left < bounds.left || rect.top < bounds.top || rect.right > bounds.right || rect.bottom > bounds.bottom
          }).length,
          blocked: cards.filter(card => card.classList.contains('is-clickable')).filter(card => {
            const rect = card.getBoundingClientRect()
            return !card.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
          }).length
        }
      })
      expect(result.overflow).toBe(false)
      expect(result.clipped).toBe(0)
      expect(result.blocked).toBe(0)
      expect(result.height / result.width).toBeCloseTo(540 / 420, 1)
      if (width === 390) await page.screenshot({ path: `test-results/level-${level}-390.png`, fullPage: true })
    }
  })
}

test('complete all three levels through actual card clicks', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 950 })
  await openGame(page)
  await page.clock.install()
  for (const level of [1, 2, 3] as const) {
    const { cards, solution } = await loadLevel(page, level)
    for (const index of solution) {
      const card = page.locator(`.board-arena [data-card-id="${cards[index].id}"]`)
      await expect(card).toHaveClass(/is-clickable/)
      await card.click()
      await page.clock.runFor(260)
    }
    await expect(page.getByText(`第 ${level} 关顺利通关！`)).toBeVisible()
    await expect(page.locator('.slot-container .game-card')).toHaveCount(0)
    if (level < 3) await page.getByRole('button', { name: '进入下一关！' }).click()
  }
  expect(errors).toEqual([])
})

test('removed duplicate powers stay absent and restart cancels an old elimination', async ({ page }) => {
  await openGame(page)
  await page.clock.install()
  await expect(page.getByRole('button', { name: /移出3张|后悔撤回|洗牌重组/ })).toHaveCount(0)
  const { cards, solution } = await loadLevel(page, 1, 9)
  for (const index of solution) {
    await page.locator(`.board-arena [data-card-id="${cards[index].id}"]`).click()
    if (await page.locator('.is-eliminating').count()) break
  }
  await expect(page.getByRole('button', { name: /透视提示/ })).toBeDisabled()
  await page.getByTitle('重新开始本关').click()
  const restarted = await page.locator('.board-arena .game-card').count()
  await page.clock.runFor(1000)
  await expect(page.locator('.board-arena .game-card')).toHaveCount(restarted)
  await expect(page.locator('.slot-container .game-card')).toHaveCount(0)
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
})

test('each extra slot requires another full match target', async ({ page }) => {
  await openGame(page)
  await page.clock.install()
  const settings = normalizeGameSettings({ initialSlots: 4, maxSlots: 7, slotUnlockCondition: 'match_count', slotUnlockMatchCount: 3,
    levels: [{ minCards: 30, maxCards: 30, types: 1 }] })
  const { cards, solution } = createLevel(1, ['iron_heart'], seeded(42), settings)
  await page.evaluate(({ cards, settings }) => {
    const state = (document.querySelector('#app') as any).__vue_app__._instance.setupState
    state.allCards = cards
    state.activeGameSettings = settings
    state.unlockedSlots = 4
    state.matchCountThisRound = 0
    localStorage.setItem('couple_game_admin_config_v3', JSON.stringify({ gameSettings: settings }))
  }, { cards, settings })
  for (let pick = 0; pick < 27; pick++) {
    await page.locator(`.board-arena [data-card-id="${cards[solution[pick]].id}"]`).click()
    await page.clock.runFor(260)
    if ((pick + 1) % 3 === 0) {
      const matches = (pick + 1) / 3
      const state = await page.evaluate(() => {
        const state = (document.querySelector('#app') as any).__vue_app__._instance.setupState
        return { slots: state.unlockedSlots, progress: state.slotUnlockProgress.current }
      })
      expect(state.slots).toBe(4 + Math.floor(matches / 3))
      expect(state.progress).toBe(matches % 3)
    }
  }
  await page.getByTitle('重新开始本关').click()
  await expect(page.locator('.main-tray .in-slot')).toHaveCount(0)
  await expect(page.locator('.main-tray .locked-slot')).toHaveCount(3)
})
