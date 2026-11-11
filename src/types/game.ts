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

export interface LevelSettings {
  minCards: number
  maxCards: number
  types: number
  layers: number
  spreadX: number
  spreadY: number
  randomness: number
  layout: 'scatter' | 'heart'
}

export interface GameSettings {
  boardWidth: number
  boardHeight: number
  levels: [LevelSettings, LevelSettings, LevelSettings]
}

export interface AdminConfig {
  gameSettings: GameSettings
  bfPhotoIndex: number // 1 to 6, or 0 for random
  couponName: string // Configurable name for coupons displayed to user (default: '专属心愿券')
  gfPenaltyRatio: number // 0 to 100 (percentage of girlfriend tasks vs boyfriend tasks)
  summonCostEnabled: boolean // Whether summoning boyfriend gives a coupon
  activeCardPhotos: Record<string, string> // cardId -> photo path or base64
  customCards?: CardDefinition[] // Dynamic card definitions (add, delete, rename, change image)
  girlfriendTasks: TaskItem[] // Customizable GF penalties / tasks
  boyfriendRewards: TaskItem[] // Customizable BF rewards / treats
}
