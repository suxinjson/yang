import { test, expect } from '@playwright/test'

test('native photo URLs use the fixed backend and ignore old custom server settings', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as any).androidBridge = {}
    localStorage.setItem('ganglegang_api_url', 'https://old-server.invalid')
  })
  await page.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/coupons') ? [] : null }))
  await page.goto('/')
  const result = await page.evaluate(async () => {
    // The dev server has no build-time backend; native falls back to its origin.
    const api = await import('/src/utils/api.ts' as string)
    return {
      base: api.getBaseUrl(),
      photo: api.resolveAssetUrl('/photos/bf_1.jpg'),
      embedded: api.resolveAssetUrl('data:image/png;base64,abc'),
      external: api.resolveAssetUrl('https://images.example/photo.jpg')
    }
  })
  expect(result.base).toBe('http://127.0.0.1:5175')
  expect(result.photo).toBe('http://127.0.0.1:5175/photos/bf_1.jpg')
  expect(result.embedded).toBe('data:image/png;base64,abc')
  expect(result.external).toBe('https://images.example/photo.jpg')
})
