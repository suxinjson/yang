export interface CardItem {
  id: number
  type: string
  x: number // grid step in x (0 to max)
  y: number // grid step in y (0 to max)
  layer: number // z-layer (0 = bottom, higher = on top)
  status: 'board' | 'slot' | 'staged' | 'cleared'
  isCovered: boolean
}

export interface CardDefinition {
  id: string
  name: string
  desc: string
  defaultIconSvg: string
  customImage?: string // Base64 or uploaded URL
  staticImage?: string // Preset local static file in public/photos/
  tag: string
  bgColor: string
  borderColor: string
}

export type CouponTarget = 'girlfriend_pays' | 'boyfriend_pays' // 趣味互动任务 vs 甜蜜特权礼券

export interface LoveCoupon {
  id: string
  title: string
  desc: string
  icon: string
  used: boolean
  target: CouponTarget
  obtainedAt: string
}

export interface TaskItem {
  id: string
  title: string
  desc: string
  icon: string
  target: CouponTarget
}

export interface AdminConfig {
  adminPassword: string // Password to unlock admin panel (default: '5201314')
  bfPhotoIndex: number // 1 to 6, or 0 for random
  gfPenaltyRatio: number // 0 to 100 (percentage of girlfriend tasks)
  summonCostEnabled: boolean // Whether summoning boyfriend inflicts a penalty on her
  activeCardPhotos: Record<string, string> // cardId -> photo path or base64
  girlfriendTasks: TaskItem[] // Customizable GF penalties / tasks
  boyfriendRewards: TaskItem[] // Customizable BF rewards / treats
}
