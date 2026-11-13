import { shallowRef } from 'vue'
import type { LoveCoupon } from '../types/game'
import { getBaseUrl } from './api'

export interface BackpackItem { itemId: string; quantity: number; kind: string; name: string; icon?: string; gameId?: string }
export interface Backpack { profileId: string; revision: number; tools: { hint: number; rescue: number }; items: BackpackItem[]; coupons: LoveCoupon[] }
export const personalBackpack = shallowRef<Backpack | null>(null)
let registration: Promise<void> | undefined
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
  profileCredentials()
  if (!registration) registration = (async () => {
    const response = await fetch(getBaseUrl() + '/api/play/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileCredentials()), signal: AbortSignal.timeout(5000) })
    const result = await response.json()
    if (!response.ok) throw Object.assign(new Error(result.error || '个人背包暂不可用'), { status: response.status })
    acceptBackpack(result.backpack)
  })().catch(error => { registration = undefined; throw error })
  await registration
}
