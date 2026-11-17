import { shallowRef, ref } from 'vue'
import type { LoveCoupon } from '../types/game'
import { getBaseUrl } from './api'
import { clientIdentity } from './clientSession'

export interface BackpackItem { itemId: string; quantity: number; kind: string; name: string; icon?: string; gameId?: string }
export interface Backpack { profileId: string; revision: number; tools: { hint: number; rescue: number }; items: BackpackItem[]; coupons: LoveCoupon[] }
export const personalBackpack = shallowRef<Backpack | null>(null)
let registration: Promise<void> | undefined
export const accountGeneration = ref(0)
function resetAccountState() {
  registration = undefined
  personalBackpack.value = null
  for (const key of ['gang_solo_v2', 'gang_room_credentials', 'gang_room_pending', 'gang_room_entry', 'gang_pending_redeem']) localStorage.removeItem(key)
  accountGeneration.value++
}
export interface AuthUser {
  username: string
  nickname: string
  gender: 'male' | 'female' | 'neutral'
  profileId: string
  profileSecret: string
}

export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('ganglegang_auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredAuthUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem('ganglegang_auth_user', JSON.stringify(user))
    setAccountCredentials({ profileId: user.profileId, profileSecret: user.profileSecret })
  } else {
    localStorage.removeItem('ganglegang_auth_user')
    localStorage.removeItem('gang_personal_profile_v1')
    resetAccountState()
  }
}

export function setAccountCredentials(credentials: { profileId: string; profileSecret: string }) {
  localStorage.setItem('gang_personal_profile_v1', JSON.stringify(credentials))
  resetAccountState()
}

export function profileCredentials() {
  const key = 'gang_personal_profile_v1', raw = localStorage.getItem(key)
  if (raw) { let saved; try { saved = JSON.parse(raw) } catch { throw new Error('个人身份缓存损坏，请恢复原身份记录') }; if (/^[a-f0-9-]{36}$/.test(saved?.profileId) && /^[a-f0-9]{64}$/.test(saved?.profileSecret)) return saved as { profileId: string; profileSecret: string }; throw new Error('个人身份缓存格式错误，请恢复原记录') }
  const profileSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('')
  const credentials = { profileId: crypto.randomUUID(), profileSecret }
  // Persist before registration: retries after a lost response cannot grant a second starter bundle.
  localStorage.setItem(key, JSON.stringify(credentials)); return credentials
}
export function acceptBackpack(value: Backpack) {
  if (!value || value.profileId !== profileCredentials().profileId) return
  if (personalBackpack.value && value.revision < personalBackpack.value.revision) return
  personalBackpack.value = value
}
export async function ensureProfile() {
  const credentials = profileCredentials(), generation = accountGeneration.value
  if (!registration) registration = (async () => {
    const response = await fetch(getBaseUrl() + '/api/play/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, ...clientIdentity() }), signal: AbortSignal.timeout(5000) })
    const result = await response.json()
    if (generation !== accountGeneration.value) throw new Error('账号已切换，请重试')
    if (!response.ok) throw Object.assign(new Error(result.error || '个人背包暂不可用'), { status: response.status })
    acceptBackpack(result.backpack)
  })().catch(error => { if (generation === accountGeneration.value) registration = undefined; throw error })
  await registration
}
