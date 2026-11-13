export interface CardItem {
  id: number
  type: string
  x: number // grid step in x (0 to max)
  y: number // grid step in y (0 to max)
  layer: number // z-layer (0 = bottom, higher = on top)
  status: 'board' | 'slot' | 'staged' | 'cleared'
  isCovered: boolean
}

export interface CardGroup { id: string; name: string }
export type CardLayout = 'scatter' | 'diamond' | 'heart' | 'cross' | 'ring' | 'butterfly' | 'pyramid' | 'hourglass' | 'fortress'
export interface RewardPolicy { simultaneous: boolean; hintChance: number; rescueChance: number; couponChance: number }

export interface CardDefinition {
  groupId?: string
  id: string
  name: string
  desc: string
  defaultIconSvg: string
  customImage?: string // Base64 or uploaded URL
  staticImage?: string // Preset local static file in public/photos/
  bgColor: string
  borderColor: string
}

export type CardTextMode = 'none' | 'name' | 'description'

export type CouponTarget = 'girlfriend_pays' | 'boyfriend_pays' // 趣味互动任务 vs 甜蜜特权礼券

export interface LoveCoupon {
  ownerId?: string
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

export type SolvabilityMode = 'guaranteed' | 'normal' | 'hard' | 'impossible'

export interface LevelSettings {
  minCards: number
  maxCards: number
  types: number
  layers: number
  spreadX: number
  spreadY: number
  randomness: number
  layout: CardLayout
  cardGroupIds?: string[] // omitted means all groups, including new groups
  solvability?: SolvabilityMode
}

export type SlotUnlockConditionType = 'match_count' | 'love_coupon' | 'boyfriend_rescue' | 'urgent_click' | 'free_click'

export interface GameSettings {
  boardWidth: number
  boardHeight: number
  cardWidth?: number
  cardHeight?: number
  initialSlots?: number
  maxSlots?: number
  slotUnlockCondition?: SlotUnlockConditionType
  slotUnlockMatchCount?: number
  totalLevels?: number
  levels: LevelSettings[]
}

export interface AdminConfig {
  cardGroups: CardGroup[]
  rewardPolicy: RewardPolicy
  cardTextMode: CardTextMode
  bfPhotos: BoyfriendPhoto[]
  bfCardEnabled: boolean
  gameSettings: GameSettings
  bfPhotoIndex: number // 1 to 6, or 0 for random
  couponName: string // Configurable name for coupons displayed to user (default: '专属心愿券')
  gfPenaltyRatio: number // 0 to 100 (percentage of girlfriend tasks vs boyfriend tasks)
  activeCardPhotos: Record<string, string> // cardId -> photo path or base64
  customCards?: CardDefinition[] // Dynamic card definitions (add, delete, rename, change image)
  girlfriendTasks: TaskItem[] // Boyfriend wishes, fulfilled by girlfriend
  boyfriendRewards: TaskItem[] // Girlfriend wishes, fulfilled by boyfriend
}

export interface BoyfriendPhoto {
  name: string
  image: string
}
