import type { AdminConfig } from '../types/game'
import { Capacitor } from '@capacitor/core'
import { acceptServerState } from './serverState'

const STORAGE_API_KEY = 'ganglegang_api_url'
const TOKEN_KEY = 'ganglegang_admin_token'

/**
 * 动态根据当前部署路径（根路径或 /gang/ 二级子路径）补全静态资源绝对 URL
 */
export function resolveAssetUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const clean = url.replace(/^\/+/, '')
  if (Capacitor.isNativePlatform()) {
    return `${getBaseUrl()}/${clean}`
  }
  const prefix = typeof window !== 'undefined' && window.location.pathname.startsWith('/gang') ? '/gang/' : '/'
  return prefix + clean
}

/**
 * 动态获取后端 API 基础地址：
 * 1. 优先使用本地配置存储的自定义服务器地址 (便于在原生 APK 或测试环境中随时切换)
 * 2. 其次使用环境变量 VITE_API_URL (编译期传入)
 * 3. 浏览器端默认取 window.location.origin (如果在 /gang 二级子路径下则自动附带 /gang 前缀)
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') return ''

  // Native clients use the server embedded at build time, without a setup screen.
  const savedUrl = Capacitor.isNativePlatform() ? null : localStorage.getItem(STORAGE_API_KEY)
  if (savedUrl) return savedUrl.trim().replace(/\/+$/, '')

  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) return envUrl.trim().replace(/\/+$/, '')

  const origin = window.location.origin
  const isGangSubpath = window.location.pathname.startsWith('/gang')
  return isGangSubpath ? `${origin}/gang` : origin
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const token = getAdminToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function apiLogin(password: string): Promise<boolean> {
  const baseUrl = getBaseUrl()
  try {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await res.json()
    if (data.success && data.token) {
      setAdminToken(data.token)
      return true
    }
    return false
  } catch (e) {
    console.warn('API login unavailable', e)
    return false
  }
}

export async function apiSaveConfig(config: AdminConfig, expectedVersion?: string, onSavedVersion?: (version: string) => void): Promise<boolean> {
  const baseUrl = getBaseUrl()
  try {
    const res = await fetch(`${baseUrl}/api/config`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), ...(expectedVersion ? { 'If-Match': expectedVersion } : {}) },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(8000)
    })
    if (res.status === 401) setAdminToken(null)
    const data = await res.json()
    if (data.state) acceptServerState(data.state)
    if (res.ok && data.state) onSavedVersion?.(data.state.configVersion)
    return res.ok
  } catch (e) {
    console.warn('Failed to save config to server', e)
    return false
  }
}

export async function apiChangePassword(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/admin/password`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ password }), signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return false
    const data = await res.json()
    setAdminToken(data.token)
    return true
  } catch {
    return false
  }
}

export async function apiResetCoupons(): Promise<boolean> {
  const baseUrl = getBaseUrl()
  try {
    const res = await fetch(`${baseUrl}/api/coupons/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000)
    })
    const data = await res.json()
    if (data.state) acceptServerState(data.state)
    return res.ok && data.success === true
  } catch (e) {
    console.warn('Failed to reset coupons on server', e)
    return false
  }
}
