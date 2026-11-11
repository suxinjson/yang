import { test, expect, type Page } from '@playwright/test'
import { createLevel } from '../src/utils/levelGenerator'

const types = ['iron_heart', 'steel_heart', 'sock_meme', 'birthday_photo', 'flower_photo', 'boyfriend_photo', 'boba_tea', 'hug_kiss', 'gold_card']

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

async function openGame(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/coupons') ? [] : null }))
  await page.route('**/photos/**', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.board-arena .game-card').first()).toBeVisible()
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

test('move out, undo and restart during elimination preserve card state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 950 })
  await openGame(page)
  await page.clock.install()
  await loadLevel(page, 1)
  const initial = await page.locator('.board-arena .game-card').count()
  await page.locator('.board-arena .is-clickable').first().click()
  await page.getByRole('button', { name: /移出3张/ }).click()
  await expect(page.locator('.staged-area .game-card')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /后悔撤回/ })).toBeEnabled()
  await page.getByRole('button', { name: /后悔撤回/ }).click()
  await expect(page.locator('.board-arena .game-card')).toHaveCount(initial)
  await expect(page.locator('.staged-area')).toHaveCount(0)

  const { cards, solution } = await loadLevel(page, 1, 9)
  for (const index of solution) {
    await page.locator(`.board-arena [data-card-id="${cards[index].id}"]`).click()
    if (await page.locator('.is-eliminating').count()) break
  }
  await expect(page.getByRole('button', { name: /洗牌重组/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: /移出3张/ })).toBeDisabled()
  await page.getByTitle('重新开始本关').click()
  const restarted = await page.locator('.board-arena .game-card').count()
  await page.clock.runFor(1000)
  await expect(page.locator('.board-arena .game-card')).toHaveCount(restarted)
  await expect(page.locator('.slot-container .game-card')).toHaveCount(0)
  await expect(page.locator('.board-arena')).toHaveAttribute('aria-busy', 'false')
})
