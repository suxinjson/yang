import type { LoveCoupon, CouponTarget } from '../types/game'
import { loadAdminConfig } from './adminConfig'

const COUPON_STORAGE_KEY = 'couple_game_love_coupons_v2'

// 女友付出 / 惩罚清单（男友享受特权）
export const GIRLFRIEND_PENALTY_TEMPLATES: Omit<LoveCoupon, 'id' | 'used' | 'obtainedAt'>[] = [
  {
    title: '手洗臭袜子券',
    desc: '给男朋友手洗袜子一次，洗完必须当面夸赞“男朋友的袜子真香”！',
    icon: '🧦',
    target: 'girlfriend_pays'
  },
  {
    title: '捏肩伺候 15 分钟',
    desc: '为超帅男友进行 15 分钟全身推拿捏肩，态度要端正，中途不准喊累！',
    icon: '💆‍♂️',
    target: 'girlfriend_pays'
  },
  {
    title: '快乐水 / 奶茶进贡',
    desc: '今天由女朋友向男朋友奉上冰阔乐或奶茶一杯，附带甜蜜微笑和双手奉上！',
    icon: '🥤',
    target: 'girlfriend_pays'
  },
  {
    title: '甜喊三声好哥哥',
    desc: '深情看着男朋友的眼睛，甜甜地喊三声“好哥哥 / 宇宙第一帅男友”！',
    icon: '🤴',
    target: 'girlfriend_pays'
  },
  {
    title: '今晚家务承包卡',
    desc: '主动包揽今晚的洗碗、擦桌子或倒垃圾，让男朋友舒舒服服休息！',
    icon: '🍽️',
    target: 'girlfriend_pays'
  },
  {
    title: '半日听话小跟班',
    desc: '在接下来的半天内，对男朋友提出的合理要求无条件服从，不得顶嘴！',
    icon: '🫡',
    target: 'girlfriend_pays'
  },
  {
    title: '爱心夜宵加餐券',
    desc: '今晚给男朋友准备一份惊喜小夜宵或者洗切水果，亲手投喂！',
    icon: '🍱',
    target: 'girlfriend_pays'
  },
  {
    title: '男友心愿兑现券',
    desc: '无论男朋友提出什么合理小心愿，女朋友必须无条件配合兑现！',
    icon: '🌟',
    target: 'girlfriend_pays'
  }
]

// 男友付出清单（女友享受特权）
export const BOYFRIEND_REWARD_TEMPLATES: Omit<LoveCoupon, 'id' | 'used' | 'obtainedAt'>[] = [
  {
    title: '全糖奶茶免单券',
    desc: '凭此券向男朋友任意点一杯最爱喝的奶茶，大杯加料，立即买单！',
    icon: '🧋',
    target: 'boyfriend_pays'
  },
  {
    title: '绝不生气免死金牌',
    desc: '拥有一次无论发生什么男朋友必须无条件认错并夸夸的特权！',
    icon: '🛡️',
    target: 'boyfriend_pays'
  },
  {
    title: '大餐任选请客券',
    desc: '今天吃什么由你全权做主，火锅烤肉日料随心挑，男友买单！',
    icon: '🥩',
    target: 'boyfriend_pays'
  },
  {
    title: '男友推拿按摩券',
    desc: '享受专属男友力推拿按摩 15 分钟，直到你满意为止！',
    icon: '💆‍♀️',
    target: 'boyfriend_pays'
  }
]

export function loadCoupons(): LoveCoupon[] {
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.error('Failed to load coupons', e)
  }
  // Default initial set
  return [
    {
      id: 'coupon_init_1',
      title: '手洗臭袜子券',
      desc: '给男朋友手洗袜子一次，并夸赞袜子香喷喷！',
      icon: '🧦',
      used: false,
      target: 'girlfriend_pays',
      obtainedAt: '初始情侣契约'
    },
    {
      id: 'coupon_init_2',
      title: '全糖奶茶免单券',
      desc: '男友请客喝大杯奶茶，立即执行！',
      icon: '🧋',
      used: false,
      target: 'boyfriend_pays',
      obtainedAt: '初始情侣契约'
    }
  ]
}

export function saveCoupons(coupons: LoveCoupon[]) {
  try {
    localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupons))
  } catch (e) {
    console.error('Failed to save coupons', e)
  }
}

// Draw a random coupon based on the admin configured penalty ratio
export function generateRandomCoupon(context: string): LoveCoupon {
  const config = loadAdminConfig()
  const rand = Math.random() * 100
  const isGfPenalty = rand < config.gfPenaltyRatio // e.g. 75% chance of girlfriend task

  let chosen: { title: string; desc: string; icon: string; target: CouponTarget }

  if (isGfPenalty && config.girlfriendTasks && config.girlfriendTasks.length > 0) {
    const idx = Math.floor(Math.random() * config.girlfriendTasks.length)
    chosen = config.girlfriendTasks[idx]
  } else if (config.boyfriendRewards && config.boyfriendRewards.length > 0) {
    const idx = Math.floor(Math.random() * config.boyfriendRewards.length)
    chosen = config.boyfriendRewards[idx]
  } else {
    chosen = {
      title: '手洗臭袜子券',
      desc: '给男朋友手洗袜子一次，并夸赞袜子香喷喷！',
      icon: '🧦',
      target: 'girlfriend_pays'
    }
  }

  const newCoupon: LoveCoupon = {
    id: `coupon_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: chosen.title,
    desc: chosen.desc,
    icon: chosen.icon,
    used: false,
    target: chosen.target,
    obtainedAt: context
  }

  // Save to stored list & sync to server
  const existing = loadCoupons()
  existing.unshift(newCoupon)
  saveCoupons(existing)

  import('./api').then(({ apiAddCoupon }) => {
    apiAddCoupon(newCoupon)
  }).catch(() => {})

  return newCoupon
}

export function redeemCoupon(id: string): LoveCoupon[] {
  const list = loadCoupons()
  const target = list.find(c => c.id === id)
  if (target) {
    target.used = true
    saveCoupons(list)
    import('./api').then(({ apiRedeemCoupon }) => {
      apiRedeemCoupon(id)
    }).catch(() => {})
  }
  return list
}

export async function syncCouponsFromServer(): Promise<LoveCoupon[]> {
  try {
    const { apiFetchCoupons } = await import('./api')
    const list = await apiFetchCoupons()
    if (list && list.length > 0) {
      saveCoupons(list)
      return list
    }
  } catch (e) {
    console.warn('Sync coupons failed', e)
  }
  return loadCoupons()
}
