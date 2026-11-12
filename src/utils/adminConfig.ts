import type { AdminConfig, TaskItem } from '../types/game'
import { apiSaveConfig } from './api'
import { normalizeGameSettings, normalizeCardTextMode } from '../../shared/gameConfig.js'
import { normalizeBoyfriendSettings } from '../../shared/boyfriendConfig.js'
import { defaultPublicConfig } from '../../shared/defaultConfig.js'
import { serverState } from './serverState'

const ADMIN_STORAGE_KEY = 'couple_game_admin_config_v3'

export const DEFAULT_ADMIN_CONFIG: AdminConfig = defaultPublicConfig()

export function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return normalizeAdminConfig(parsed)
    }
  } catch (e) {
    console.error('Failed to load admin config', e)
  }
  return normalizeAdminConfig({})
}

export function normalizeAdminConfig(input: unknown): AdminConfig {
  const parsed = input && typeof input === 'object' && !Array.isArray(input) ? input as Partial<AdminConfig> : {}
  const tasks = (value: unknown, fallback: TaskItem[]) => Array.isArray(value)
    ? value.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string').map(item => ({ ...item }))
    : structuredClone(fallback)
  const cards = Array.isArray(parsed.customCards) ? [...new Map(parsed.customCards.filter(card => card && typeof card.id === 'string' && card.id && typeof card.name === 'string').map(card => [card.id, { ...card }])).values()] : []
  return {
    cardTextMode: normalizeCardTextMode(parsed.cardTextMode),
    ...normalizeBoyfriendSettings(parsed),
    gameSettings: normalizeGameSettings(parsed.gameSettings),
    bfPhotoIndex: typeof parsed.bfPhotoIndex === 'number' && Number.isFinite(parsed.bfPhotoIndex) ? Math.max(0, Math.min(6, Math.round(parsed.bfPhotoIndex))) : 1,
    couponName: typeof parsed.couponName === 'string' ? parsed.couponName.trim().slice(0, 30) || '专属心愿券' : '专属心愿券',
    gfPenaltyRatio: typeof parsed.gfPenaltyRatio === 'number' && Number.isFinite(parsed.gfPenaltyRatio) ? Math.max(0, Math.min(100, Math.round(parsed.gfPenaltyRatio))) : 75,
    activeCardPhotos: { ...DEFAULT_ADMIN_CONFIG.activeCardPhotos, ...(parsed.activeCardPhotos && typeof parsed.activeCardPhotos === 'object' && !Array.isArray(parsed.activeCardPhotos) ? parsed.activeCardPhotos : {}) },
    customCards: cards.length >= 3 ? cards : undefined,
    girlfriendTasks: tasks(parsed.girlfriendTasks, DEFAULT_ADMIN_CONFIG.girlfriendTasks),
    boyfriendRewards: tasks(parsed.boyfriendRewards, DEFAULT_ADMIN_CONFIG.boyfriendRewards)
  }
}

export type ConfigSaveResult = 'synced' | 'failed'
let saveQueue: Promise<unknown> = Promise.resolve()
const ownConfigVersions = new Map<string, string>()

export function saveAdminConfig(config: AdminConfig, expectedVersion?: string, onSavedVersion?: (version: string) => void): Promise<ConfigSaveResult> {
  const snapshot = normalizeAdminConfig(config)
  const pending = saveQueue.then(async (): Promise<ConfigSaveResult> => {
    let expected = expectedVersion
    const visited = new Set<string>()
    while (expected && ownConfigVersions.has(expected) && !visited.has(expected)) {
      visited.add(expected)
      expected = ownConfigVersions.get(expected)
    }
    let savedVersion: string | undefined
    if (!await apiSaveConfig(snapshot, expected, version => { savedVersion = version; onSavedVersion?.(version) })) return 'failed'
    if (expected && savedVersion && expected !== savedVersion) ownConfigVersions.set(expected, savedVersion)
    try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(serverState.value?.config || snapshot)) } catch { /* Server commit is authoritative; a full cache cannot undo a successful save. */ }
    return 'synced'
  })
  saveQueue = pending.catch(() => {})
  return pending.catch(() => 'failed')
}

export function acceptServerConfig(config: AdminConfig) {
  const normalized = normalizeAdminConfig(config)
  try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(normalized)) } catch { /* Keep the current server config usable when the device cache is full. */ }
  return normalized
}

export function getActiveBfProfile(config: AdminConfig, random: () => number = Math.random) {
  const photos = normalizeBoyfriendSettings(config).bfPhotos
  const index = config.bfPhotoIndex === 0 ? Math.floor(random() * photos.length) : Math.max(0, Math.min(5, config.bfPhotoIndex - 1))
  return { ...photos[index] }
}
