import type { AdminConfig, LoveCoupon } from '../types/game'

// Get current server base URL (in webview or browser, it defaults to window.location.origin)
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

export async function apiLogin(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await res.json()
    return !!data.success
  } catch (e) {
    console.warn('API login offline fallback', e)
    return password === 'admin'
  }
}

export async function apiFetchConfig(): Promise<AdminConfig | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/config`)
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {
    console.warn('Failed to fetch config from server, using local fallback', e)
  }
  return null
}

export async function apiSaveConfig(config: AdminConfig): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    return res.ok
  } catch (e) {
    console.warn('Failed to save config to server', e)
    return false
  }
}

export async function apiFetchCoupons(): Promise<LoveCoupon[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/coupons`)
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {
    console.warn('Failed to fetch coupons from server', e)
  }
  return []
}

export async function apiAddCoupon(coupon: LoveCoupon): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coupon)
    })
    return res.ok
  } catch (e) {
    console.warn('Failed to post coupon to server', e)
    return false
  }
}

export async function apiRedeemCoupon(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/coupons/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    return res.ok
  } catch (e) {
    console.warn('Failed to redeem coupon on server', e)
    return false
  }
}

export async function apiResetCoupons(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/coupons/reset`, { method: 'POST' })
    return res.ok
  } catch (e) {
    console.warn('Failed to reset coupons on server', e)
    return false
  }
}

export async function apiUploadPhoto(cardId: string, base64: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, base64 })
    })
    const data = await res.json()
    if (data.success && data.path) {
      return data.path
    }
  } catch (e) {
    console.warn('Failed to upload photo to server', e)
  }
  return null
}
