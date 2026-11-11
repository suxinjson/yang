import type { AdminConfig, TaskItem } from '../types/game'
import { apiSaveConfig, apiFetchConfig } from './api'
import { normalizeGameSettings, defaultGameSettings } from '../../shared/gameConfig.js'
import { normalizeBoyfriendSettings } from '../../shared/boyfriendConfig.js'

const ADMIN_STORAGE_KEY = 'couple_game_admin_config_v3'

export const DEFAULT_GF_TASKS: TaskItem[] = [
  {
    id: 'gf_sock',
    title: '手洗袜子券',
    desc: '帮对方手洗袜子一次，洗完当面夸赞袜子好香！',
    icon: '🧦',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_massage',
    title: '捏肩伺候 15 分钟',
    desc: '为对方进行 15 分钟全身推拿捏肩，态度端正，中途不准喊累！',
    icon: '💆‍♂️',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_drink',
    title: '快乐水 / 奶茶投喂',
    desc: '向对方奉上冰阔乐或奶茶一杯，附带甜蜜微笑和双手奉上！',
    icon: '🥤',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_brother',
    title: '甜甜夸夸三分钟',
    desc: '深情看着对方的眼睛，认真说出对方身上最迷人的三个优点！',
    icon: '🤴',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_housework',
    title: '今晚家务承包卡',
    desc: '主动包揽今晚的洗碗、擦桌子或倒垃圾，让对方舒舒服服休息！',
    icon: '🍽️',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_obey',
    title: '半日听话小跟班',
    desc: '在接下来的半天内，对对方提出的合理要求无条件配合，不得顶嘴！',
    icon: '🫡',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_snack',
    title: '爱心夜宵加餐券',
    desc: '给对方准备一份惊喜小夜宵或者洗切水果，亲手投喂！',
    icon: '🍱',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_wish',
    title: '甜蜜心愿兑现券',
    desc: '无论对方提出什么合理小心愿，必须无条件配合兑现！',
    icon: '🌟',
    target: 'girlfriend_pays'
  }
]

export const DEFAULT_BF_REWARDS: TaskItem[] = [
  {
    id: 'bf_milktea',
    title: '全糖奶茶免单券',
    desc: '凭此券任意点一杯最爱喝的奶茶，大杯加料，甜蜜畅饮！',
    icon: '🧋',
    target: 'boyfriend_pays'
  },
  {
    id: 'bf_forgive',
    title: '绝不生气免死金牌',
    desc: '拥有一次无论发生什么对方必须无条件认错并夸夸的特权！',
    icon: '🛡️',
    target: 'boyfriend_pays'
  },
  {
    id: 'bf_dinner',
    title: '大餐任选请客券',
    desc: '今天吃什么由你全权做主，火锅烤肉日料随心挑选！',
    icon: '🥩',
    target: 'boyfriend_pays'
  },
  {
    id: 'bf_massage',
    title: '专属推拿按摩券',
    desc: '享受专属全身推拿按摩 15 分钟，直到你满意为止！',
    icon: '💆‍♀️',
    target: 'boyfriend_pays'
  }
]

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  ...normalizeBoyfriendSettings({}),
  gameSettings: defaultGameSettings(),
  bfPhotoIndex: 1, // 1 to 6, 0 for random
  couponName: '专属心愿券', // Default coupon display name
  gfPenaltyRatio: 75, // Default 75% girlfriend tasks, 25% boyfriend rewards
  summonCostEnabled: true, // Summoning BF requires a penalty task
  activeCardPhotos: {
    iron_heart: '/photos/iron_heart.jpg',
    steel_heart: '/photos/steel_heart.jpg',
    sock_meme: '/photos/sock_meme.png',
    birthday_photo: '/photos/birthday_photo.jpg',
    flower_photo: '/photos/flower_photo.jpg',
    boyfriend_photo: '/photos/bf_1.jpg'
  },
  girlfriendTasks: [...DEFAULT_GF_TASKS],
  boyfriendRewards: [...DEFAULT_BF_REWARDS]
}

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
    ...normalizeBoyfriendSettings(parsed),
    gameSettings: normalizeGameSettings(parsed.gameSettings),
    bfPhotoIndex: typeof parsed.bfPhotoIndex === 'number' && Number.isFinite(parsed.bfPhotoIndex) ? Math.max(0, Math.min(6, Math.round(parsed.bfPhotoIndex))) : 1,
    couponName: typeof parsed.couponName === 'string' ? parsed.couponName.trim().slice(0, 30) || '专属心愿券' : '专属心愿券',
    gfPenaltyRatio: typeof parsed.gfPenaltyRatio === 'number' && Number.isFinite(parsed.gfPenaltyRatio) ? Math.max(0, Math.min(100, Math.round(parsed.gfPenaltyRatio))) : 75,
    summonCostEnabled: typeof parsed.summonCostEnabled === 'boolean' ? parsed.summonCostEnabled : true,
    activeCardPhotos: { ...DEFAULT_ADMIN_CONFIG.activeCardPhotos, ...(parsed.activeCardPhotos && typeof parsed.activeCardPhotos === 'object' && !Array.isArray(parsed.activeCardPhotos) ? parsed.activeCardPhotos : {}) },
    customCards: cards.length >= 3 ? cards : undefined,
    girlfriendTasks: tasks(parsed.girlfriendTasks, DEFAULT_GF_TASKS),
    boyfriendRewards: tasks(parsed.boyfriendRewards, DEFAULT_BF_REWARDS)
  }
}

export type ConfigSaveResult = 'synced' | 'local' | 'failed'
let saveQueue: Promise<unknown> = Promise.resolve()

export function saveAdminConfig(config: AdminConfig): Promise<ConfigSaveResult> {
  const snapshot = normalizeAdminConfig(config)
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(snapshot))
  } catch (e) {
    console.error('Failed to save admin config', e)
    return Promise.resolve('failed')
  }
  // Serialize snapshots so a slower old save cannot overwrite a newer change.
  const pending = saveQueue.then(async (): Promise<ConfigSaveResult> => await apiSaveConfig(snapshot) ? 'synced' : 'local')
  saveQueue = pending.catch(() => {})
  return pending
}

export async function syncAdminConfigFromServer(): Promise<AdminConfig> {
  try {
    const serverCfg = await apiFetchConfig()
    if (serverCfg) {
      const normalized = normalizeAdminConfig(serverCfg)
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(normalized))
      return normalized
    }
  } catch (e) {
    console.warn('Sync config failed', e)
  }
  return loadAdminConfig()
}

export function getActiveBfPhoto(config: AdminConfig): string {
  return getActiveBfProfile(config).image
}

export function getActiveBfProfile(config: AdminConfig, random: () => number = Math.random) {
  const photos = normalizeBoyfriendSettings(config).bfPhotos
  const index = config.bfPhotoIndex === 0 ? Math.floor(random() * photos.length) : Math.max(0, Math.min(5, config.bfPhotoIndex - 1))
  return { ...photos[index] }
}
