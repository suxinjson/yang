import { ref, shallowRef, watch } from 'vue'
import { getBaseUrl } from './api'
import { profileCredentials, getStoredAuthUser, ensureProfile, accountGeneration } from './backpack'

export interface AvatarFeatures {
  gender: 'neutral' | 'female' | 'male'
  skin: string
  hairColor?: string
  eyeColor?: string
  lipColor?: string
  eyes?: string
  brows?: string
  lips?: string
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
  petType: 'cat' | 'dog' | 'labrador' | 'golden' | 'rabbit' | 'fox'
  petHunger: number
  petStatus: 'idle' | 'foraging'
  petForageEndAt?: string | null
}

export interface IdleJobData {
  id?: string
  jobId: string
  startedAt: string
  durationSeconds: number
  rewardCoins: number
  claimed: boolean
}

export interface PlatformOverview {
  profileId?: string
  coins: { gold: number; heart: number }
  tools: { hint: number; rescue: number; shuffle: number }
  items: any[]
  coupons: any[]
  avatar: { features: AvatarFeatures; equippedSlots: Record<string, string | null> }
  homeSpace: HomeSpaceData
  companion: CompanionData
  idleJob: IdleJobData | null
}

export interface RoomMember {
  profileId: string
  nickname: string
  gender: 'male' | 'female' | 'neutral'
  x: number
  y: number
  avatar: any
  status?: string
  lastSeen?: number
}

export interface RoomWish {
  id: string
  title: string
  desc: string
  author: string
  authorId?: string
  createdAt?: string
  completed: boolean
  completedBy?: string | null
  completedAt?: string | null
}

// Hydrate from localStorage immediately to eliminate cold-start lag / layout flickering
function getCacheKey() {
  try {
    const cred = profileCredentials()
    return `gang_overview_cache_${cred.profileId}`
  } catch {
    return 'gang_overview_cache_default'
  }
}

function loadInitialCache(): PlatformOverview | null {
  try {
    const raw = localStorage.getItem(getCacheKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function persistCache(snapshot: PlatformOverview | null) {
  if (!snapshot) return
  try {
    localStorage.setItem(getCacheKey(), JSON.stringify(snapshot))
  } catch {}
}

export const platformOverview = shallowRef<PlatformOverview | null>(loadInitialCache())
export const platformLoading = ref(false)
export const platformError = ref('')
watch(accountGeneration, () => { platformOverview.value = null; platformLoading.value = false; platformError.value = '' }, { flush: 'sync' })

async function postPlatform(endpoint: string, body: Record<string, any> = {}) {
  const generation = accountGeneration.value
  await ensureProfile()
  if (generation !== accountGeneration.value) throw new Error('账号已切换，请重试')
  const credentials = profileCredentials()
  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ...credentials }),
    signal: AbortSignal.timeout(8000)
  })
  const data = await res.json()
  if (generation !== accountGeneration.value || credentials.profileId !== profileCredentials().profileId) throw new Error('账号已切换，请重试')
  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data
}

export async function fetchPlatformOverview() {
  const generation = accountGeneration.value
  try {
    platformLoading.value = true
    platformError.value = ''
    const data = await postPlatform('/api/home/overview')
    const pendingKey = `gang_job_claim_${profileCredentials().profileId}`
    const pendingReceipt = localStorage.getItem(pendingKey)
    if (pendingReceipt) {
      try {
        const recovered = await postPlatform('/api/home/idle/claim', { receiptToken: pendingReceipt })
        data.snapshot = recovered.backpack
        localStorage.removeItem(pendingKey)
      } catch { /* Keep the receipt until the task or its committed reward can be confirmed. */ }
    }
    if (generation !== accountGeneration.value) return
    if (data.snapshot) {
      platformOverview.value = data.snapshot
      persistCache(data.snapshot)
    }
    return data
  } catch (err: any) {
    if (generation === accountGeneration.value) platformError.value = err.message
    console.warn('Failed to load platform overview:', err)
  } finally {
    if (generation === accountGeneration.value) platformLoading.value = false
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
    persistCache(platformOverview.value)
  }
  return data
}

// 1-Step Fast Batch Save Avatar & Hair/Face Features
export async function saveAvatarAll(features: Partial<AvatarFeatures>, equippedSlots: Record<string, string | null>) {
  const data = await postPlatform('/api/home/avatar/save-all', { features, equippedSlots })
  if (platformOverview.value) {
    platformOverview.value = {
      ...platformOverview.value,
      avatar: data.avatar || platformOverview.value.avatar,
      items: data.backpack?.items || platformOverview.value.items
    }
    persistCache(platformOverview.value)
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
    persistCache(platformOverview.value)
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
    persistCache(platformOverview.value)
  }
  return data
}

export async function buyStoreItem(catalogId: string, count = 1) {
  const receiptToken = `buy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const data = await postPlatform('/api/home/store/buy', { catalogId, count, receiptToken })
  if (platformOverview.value && data.backpack) {
    platformOverview.value = { ...platformOverview.value, ...data.backpack }
    persistCache(platformOverview.value)
  }
  return data
}

export async function startIdleJob(jobId: string) {
  const data = await postPlatform('/api/home/idle/start', { jobId })
  if (platformOverview.value && data.idleJob) {
    platformOverview.value = { ...platformOverview.value, idleJob: data.idleJob }
    persistCache(platformOverview.value)
  }
  return data
}

export async function claimIdleJob() {
  const key = `gang_job_claim_${profileCredentials().profileId}`
  const receiptToken = localStorage.getItem(key) || crypto.randomUUID()
  localStorage.setItem(key, receiptToken)
  const data = await postPlatform('/api/home/idle/claim', { receiptToken })
  localStorage.removeItem(key)
  if (platformOverview.value && data.backpack) {
    platformOverview.value = { ...platformOverview.value, ...data.backpack, idleJob: null }
    persistCache(platformOverview.value)
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
    persistCache(platformOverview.value)
  }
  return data
}

export async function selectPet(petType: CompanionData['petType']) {
  const data = await postPlatform('/api/home/companion/pet', { petType })
  if (platformOverview.value && data.companion) {
    platformOverview.value = { ...platformOverview.value, companion: data.companion }
    persistCache(platformOverview.value)
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
    persistCache(platformOverview.value)
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
    persistCache(platformOverview.value)
  }
  return data
}

// Multiplayer Room Sync & Roaming
export async function syncRoomRoaming(roomId: string, x: number, y: number) {
  const user = getStoredAuthUser()
  const nickname = user?.nickname || '我'
  const gender = user?.gender || platformOverview.value?.avatar?.features?.gender || 'female'
  return postPlatform('/api/home/room/sync', { roomId, x, y, nickname, gender })
}

// Room Wish Action (Add, Redeem, List)
export async function roomWishAction(roomId: string, action: 'add' | 'redeem' | 'list', payload: Record<string, any> = {}) {
  const user = getStoredAuthUser()
  return postPlatform('/api/home/room/wish-action', {
    roomId,
    action,
    authorName: user?.nickname || '伴侣',
    ...payload
  })
}

// Leaderboard APIs
export async function fetchLeaderboard(type: 'fastest' | 'passes' | 'recent' = 'fastest') {
  const res = await fetch(`${getBaseUrl()}/api/game/leaderboard?type=${type}`)
  if (!res.ok) throw new Error('获取排行榜失败')
  return res.json()
}
