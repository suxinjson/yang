import type { LoveCoupon } from '../types/game'

const COUPON_STORAGE_KEY = 'couple_game_love_coupons_v2'

export function loadCoupons(): LoveCoupon[] {
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter(coupon => coupon && typeof coupon.id === 'string' && typeof coupon.title === 'string')
      }
    }
  } catch (e) {
    console.error('Failed to load coupons', e)
  }
  // Only the server can issue global coupons.
  return []
}

export function saveCoupons(coupons: LoveCoupon[]) {
  try {
    localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupons))
  } catch (e) {
    console.error('Failed to save coupons', e)
  }
}
