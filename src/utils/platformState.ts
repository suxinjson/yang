import { ref, shallowRef } from 'vue'
import { getBaseUrl } from './api'
import { profileCredentials } from './backpack'

export interface AvatarFeatures {
  gender: 'neutral' | 'female' | 'male'
  skin: string
  eyes: string
  brows: string
  lips: string
}

export interface PlacedFurniture {
  instanceId: string
  catalogId: string
  x: number
  y: number
  w?: number
  h?: number
  rot?: number
  layer?: 'ground' | 'rug' | 'wall' | 'decor'
}

export interface HomeSpaceData {
  wallpaperId: string
  flooringId: string
  placedFurnitures: PlacedFurniture[]
}

export interface CompanionData {
  partnerName: string
  favorability: number
  partnerAvatar?: any
  petType: 'cat' | 'dog'
  petHunger: number
  petStatus: 'idle' | 'foraging'
  petForageEndAt?: string | null
}

export interface IdleJobData {
  jobId: string
  startedAt: string
  durationSeconds: number
  rewardCoins: number
  claimed: boolean
}

export interface PlatformOverview {
  coins: { gold: number; heart: number }
  tools: { hint: number; rescue: number; shuffle: number }
  items: any[]
  coupons: any[]
  avatar: { features: AvatarFeatures; equippedSlots: Record<string, string | null> }
  homeSpace: HomeSpaceData
  companion: CompanionData
  idleJob: IdleJobData | null
}

export const platformOverview = shallowRef<PlatformOverview | null>(null)
export const platformLoading = ref(false)
export const platformError = ref('')

async function postPlatform(endpoint: string, body: Record<string, any> = {}) {
  const credentials = profileCredentials()
  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...credentials, ...body }),
    signal: AbortSignal.timeout(8000)
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data
}

export async function fetchPlatformOverview() {
  try {
    platformLoading.value = true
    platformError.value = ''
    const data = await postPlatform('/api/home/overview')
    if (data.snapshot) {
      platformOverview.value = data.snapshot
    }
    return data
  } catch (err: any) {
    platformError.value = err.message
    console.warn('Failed to load platform overview:', err)
  } finally {
    platformLoading.value = false
  }
}

export async function saveHomeSpace(placedFurnitures: PlacedFurniture[], wallpaperId?: string, flooringId?: string) {
  const data = await postPlatform('/api/home/space/save', {
    placedFurnitures,
    wallpaperId: wallpaperId || platformOverview.value?.homeSpace.wallpaperId,
    flooringId: flooringId || platformOverview.value?.homeSpace.flooringId
  })
  if (platformOverview.value && data.homeSpace) {
    platformOverview.value = {
      ...platformOverview.value,
      homeSpace: data.homeSpace
    }
  }
  return data
}

export async function updateAvatarFeatures(features: Partial<AvatarFeatures>) {
  const data = await postPlatform('/api/home/avatar/features', { features })
  if (platformOverview.value && data.avatar) {
    platformOverview.value = {
      ...platformOverview.value,
      avatar: data.avatar
    }
  }
  return data
}

export async function equipAvatarItem(catalogId: string, slot: string) {
  const data = await postPlatform('/api/home/avatar/equip', { catalogId, slot })
  if (platformOverview.value) {
    if (data.avatar) {
      platformOverview.value.avatar = data.avatar
    }
    if (data.backpack) {
      platformOverview.value = { ...platformOverview.value, ...data.backpack }
    }
  }
  return data
}

export async function buyStoreItem(catalogId: string, count = 1) {
  const receiptToken = `buy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const data = await postPlatform('/api/home/store/buy', { catalogId, count, receiptToken })
  if (platformOverview.value && data.backpack) {
    platformOverview.value = { ...platformOverview.value, ...data.backpack }
  }
  return data
}

export async function startIdleJob(jobId: string) {
  const data = await postPlatform('/api/home/idle/start', { jobId })
  if (platformOverview.value && data.idleJob) {
    platformOverview.value = { ...platformOverview.value, idleJob: data.idleJob }
  }
  return data
}

export async function claimIdleJob() {
  const receiptToken = `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const data = await postPlatform('/api/home/idle/claim', { receiptToken })
  if (platformOverview.value && data.backpack) {
    platformOverview.value = { ...platformOverview.value, ...data.backpack, idleJob: null }
  }
  return data
}

export async function interactCompanion(action: 'chat' | 'heart' = 'chat') {
  const data = await postPlatform('/api/home/companion/interact', { action })
  if (platformOverview.value && data.companion) {
    platformOverview.value = {
      ...platformOverview.value,
      companion: data.companion,
      coins: data.backpack?.coins || platformOverview.value.coins
    }
  }
  return data
}

export async function feedPet(itemId = 'pet.supply.canned_food') {
  const data = await postPlatform('/api/home/companion/feed', { itemId })
  if (platformOverview.value && data.companion) {
    platformOverview.value = {
      ...platformOverview.value,
      companion: data.companion,
      items: data.backpack?.items || platformOverview.value.items
    }
  }
  return data
}

export async function claimPetReward() {
  const data = await postPlatform('/api/home/companion/pet_reward')
  if (platformOverview.value && data.backpack) {
    platformOverview.value = {
      ...platformOverview.value,
      ...data.backpack,
      companion: data.companion
    }
  }
  return data
}
