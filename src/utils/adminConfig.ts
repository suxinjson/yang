import type { AdminConfig, TaskItem } from '../types/game'
import { apiSaveConfig, apiFetchConfig } from './api'

const ADMIN_STORAGE_KEY = 'couple_game_admin_config_v3'

export const DEFAULT_GF_TASKS: TaskItem[] = [
  {
    id: 'gf_sock',
    title: '手洗臭袜子券',
    desc: '给男朋友手洗袜子一次，洗完必须当面夸赞“男朋友的袜子真香”！',
    icon: '🧦',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_massage',
    title: '捏肩伺候 15 分钟',
    desc: '为超帅男友进行 15 分钟全身推拿捏肩，态度要端正，中途不准喊累！',
    icon: '💆‍♂️',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_drink',
    title: '快乐水 / 奶茶进贡',
    desc: '今天由女朋友向男朋友奉上冰阔乐或奶茶一杯，附带甜蜜微笑和双手奉上！',
    icon: '🥤',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_brother',
    title: '甜喊三声好哥哥',
    desc: '深情看着男朋友的眼睛，甜甜地喊三声“好哥哥 / 宇宙第一帅男友”！',
    icon: '🤴',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_housework',
    title: '今晚家务承包卡',
    desc: '主动包揽今晚的洗碗、擦桌子或倒垃圾，让男朋友舒舒服服休息！',
    icon: '🍽️',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_obey',
    title: '半日听话小跟班',
    desc: '在接下来的半天内，对男朋友提出的合理要求无条件服从，不得顶嘴！',
    icon: '🫡',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_snack',
    title: '爱心夜宵加餐券',
    desc: '今晚给男朋友准备一份惊喜小夜宵或者洗切水果，亲手投喂！',
    icon: '🍱',
    target: 'girlfriend_pays'
  },
  {
    id: 'gf_wish',
    title: '男友心愿兑现券',
    desc: '无论男朋友提出什么合理小心愿，女朋友必须无条件配合兑现！',
    icon: '🌟',
    target: 'girlfriend_pays'
  }
]

export const DEFAULT_BF_REWARDS: TaskItem[] = [
  {
    id: 'bf_milktea',
    title: '全糖奶茶免单券',
    desc: '凭此券向男朋友任意点一杯最爱喝的奶茶，大杯加料，立即买单！',
    icon: '🧋',
    target: 'boyfriend_pays'
  },
  {
    id: 'bf_forgive',
    title: '绝不生气免死金牌',
    desc: '拥有一次无论发生什么男朋友必须无条件认错并夸夸的特权！',
    icon: '🛡️',
    target: 'boyfriend_pays'
  },
  {
    id: 'bf_dinner',
    title: '大餐任选请客券',
    desc: '今天吃什么由你全权做主，火锅烤肉日料随心挑，男友买单！',
    icon: '🥩',
    target: 'boyfriend_pays'
  },
  {
    id: 'bf_massage',
    title: '男友推拿按摩券',
    desc: '享受专属男友力推拿按摩 15 分钟，直到你满意为止！',
    icon: '💆‍♀️',
    target: 'boyfriend_pays'
  }
]

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  adminPassword: 'admin', // Default password
  bfPhotoIndex: 1, // 1 to 6, 0 for random
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
      return {
        ...DEFAULT_ADMIN_CONFIG,
        ...parsed,
        girlfriendTasks: parsed.girlfriendTasks || [...DEFAULT_GF_TASKS],
        boyfriendRewards: parsed.boyfriendRewards || [...DEFAULT_BF_REWARDS],
        activeCardPhotos: parsed.activeCardPhotos || { ...DEFAULT_ADMIN_CONFIG.activeCardPhotos }
      }
    }
  } catch (e) {
    console.error('Failed to load admin config', e)
  }
  return { ...DEFAULT_ADMIN_CONFIG }
}

export function saveAdminConfig(config: AdminConfig) {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(config))
    // Also sync to server in background
    apiSaveConfig(config).catch(() => {})
  } catch (e) {
    console.error('Failed to save admin config', e)
  }
}

export async function syncAdminConfigFromServer(): Promise<AdminConfig> {
  try {
    const serverCfg = await apiFetchConfig()
    if (serverCfg) {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(serverCfg))
      return serverCfg
    }
  } catch (e) {
    console.warn('Sync config failed', e)
  }
  return loadAdminConfig()
}

export function getActiveBfPhoto(config: AdminConfig): string {
  if (config.bfPhotoIndex === 0) {
    const rand = Math.floor(Math.random() * 6) + 1
    return `/photos/bf_${rand}.jpg`
  }
  return `/photos/bf_${config.bfPhotoIndex}.jpg`
}
