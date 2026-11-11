import type { LoveCoupon } from '../types/game'
import { apiRedeemCoupon, apiFetchCoupons } from './api'
import { clientFetch, onlineRequired, getInstallationId } from './clientSession'
import { acceptServerState, serverState } from './serverState'
import { getBaseUrl } from './api'

const COUPON_STORAGE_KEY = 'couple_game_love_coupons_v2'

// 互动心愿清单
export const GIRLFRIEND_PENALTY_TEMPLATES: Omit<LoveCoupon, 'id' | 'used' | 'obtainedAt'>[] = [
  {
    title: '手洗袜子券',
    desc: '帮对方手洗袜子一次，洗完当面夸赞袜子好香！',
    icon: '🧦',
    target: 'girlfriend_pays'
  },
  {
    title: '捏肩伺候 15 分钟',
    desc: '为对方进行 15 分钟全身推拿捏肩，态度端正，中途不准喊累！',
    icon: '💆‍♂️',
    target: 'girlfriend_pays'
  },
  {
    title: '快乐水 / 奶茶投喂',
    desc: '向对方奉上冰阔乐或奶茶一杯，附带甜蜜微笑和双手奉上！',
    icon: '🥤',
    target: 'girlfriend_pays'
  },
  {
    title: '甜甜夸夸三分钟',
    desc: '深情看着对方的眼睛，认真说出对方身上最迷人的三个优点！',
    icon: '🤴',
    target: 'girlfriend_pays'
  },
  {
    title: '今晚家务承包卡',
    desc: '主动包揽今晚的洗碗、擦桌子或倒垃圾，让对方舒舒服服休息！',
    icon: '🍽️',
    target: 'girlfriend_pays'
  },
  {
    title: '半日听话小跟班',
    desc: '在接下来的半天内，对对方提出的合理要求无条件配合，不得顶嘴！',
    icon: '🫡',
    target: 'girlfriend_pays'
  },
  {
    title: '爱心夜宵加餐券',
    desc: '给对方准备一份惊喜小夜宵或者洗切水果，亲手投喂！',
    icon: '🍱',
    target: 'girlfriend_pays'
  },
  {
    title: '甜蜜心愿兑现券',
    desc: '无论对方提出什么合理小心愿，必须无条件配合兑现！',
    icon: '🌟',
    target: 'girlfriend_pays'
  }
]

// 甜蜜特权清单
export const BOYFRIEND_REWARD_TEMPLATES: Omit<LoveCoupon, 'id' | 'used' | 'obtainedAt'>[] = [
  {
    title: '全糖奶茶免单券',
    desc: '凭此券任意点一杯最爱喝的奶茶，大杯加料，甜蜜畅饮！',
    icon: '🧋',
    target: 'boyfriend_pays'
  },
  {
    title: '绝不生气免死金牌',
    desc: '拥有一次无论发生什么对方必须无条件认错并夸夸的特权！',
    icon: '🛡️',
    target: 'boyfriend_pays'
  },
  {
    title: '大餐任选请客券',
    desc: '今天吃什么由你全权做主，火锅烤肉日料随心挑选！',
    icon: '🥩',
    target: 'boyfriend_pays'
  },
  {
    title: '专属推拿按摩券',
    desc: '享受专属全身推拿按摩 15 分钟，直到满意为止！',
    icon: '💆‍♀️',
    target: 'boyfriend_pays'
  }
]

export function loadCoupons(): LoveCoupon[] {
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter(coupon => coupon && typeof coupon.id === 'string' && typeof coupon.title === 'string')
      }
    }
  } catch (e) {
    console.error('Failed to load coupons', e)
  }
  // Default initial set
  return [
    {
      id: 'coupon_init_1',
      title: '手洗袜子券',
      desc: '帮对方手洗袜子一次，并夸赞袜子香喷喷！',
      icon: '🧦',
      used: false,
      target: 'girlfriend_pays',
      obtainedAt: '初始心愿'
    },
    {
      id: 'coupon_init_2',
      title: '全糖奶茶免单券',
      desc: '大杯加料全糖奶茶一杯，甜蜜畅饮！',
      icon: '🧋',
      used: false,
      target: 'boyfriend_pays',
      obtainedAt: '初始心愿'
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
export async function generateRandomCoupon(context: string): Promise<LoveCoupon> {
  const match = context.match(/([123])/)
  const key = 'gang_pending_reward_' + (match ? 'win_' + match[1] : 'summon')
  const operationId = localStorage.getItem(key) || crypto.randomUUID()
  localStorage.setItem(key, operationId)
  const response = await clientFetch(getBaseUrl() + (onlineRequired ? '/api/client/coupons/draw' : '/api/coupons/draw'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ operationId, deviceId: getInstallationId(), context: match ? 'win_' + match[1] : 'summon' })
  })
  const data = await response.json()
  if (data.state) acceptServerState(data.state)
  if (response.status === 409) localStorage.removeItem(key)
  if (!response.ok || !data.coupon?.id || !Array.isArray(data.list)) throw new Error('Coupon draw not confirmed')
  saveCoupons(serverState.value?.coupons || data.list)
  localStorage.removeItem(key)
  const confirmed = serverState.value ? serverState.value.coupons.find(c => c.id === data.coupon.id) : data.coupon
  if (!confirmed) throw new Error('Coupon was removed by a newer server update')
  return confirmed
}

export async function redeemCoupon(id: string): Promise<LoveCoupon[]> {
  if (!await apiRedeemCoupon(id)) throw new Error('Coupon redemption failed')
  const list = serverState.value?.coupons || await apiFetchCoupons()
  if (!list) throw new Error('Coupon synchronization failed')
  saveCoupons(list)
  return list
}

export async function syncCouponsFromServer(): Promise<LoveCoupon[]> {
  try {
    const list = await apiFetchCoupons()
    if (list !== null) {
      saveCoupons(list)
      return list
    }
  } catch (e) {
    console.warn('Sync coupons failed', e)
  }
  if (onlineRequired) throw new Error('Online coupons unavailable')
  return loadCoupons()
}
