import type { CardDefinition } from '../types/game'
import { loadAdminConfig, getActiveBfProfile } from './adminConfig'

// Default Card Definitions with personalized couple memes
export const DEFAULT_CARD_DEFINITIONS: CardDefinition[] = [
  {
    id: 'iron_heart',
    name: '铁了心爱你',
    desc: '螺栓固定，坚不可摧',
    tag: '专情',
    bgColor: '#FFF0F5',
    borderColor: '#FF69B4',
    staticImage: '/photos/iron_heart.jpg',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <defs>
          <linearGradient id="ironGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#94A3B8" />
            <stop offset="50%" stop-color="#64748B" />
            <stop offset="100%" stop-color="#475569" />
          </linearGradient>
          <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF4D6D" />
            <stop offset="100%" stop-color="#C9184A" />
          </linearGradient>
        </defs>
        <path d="M50 84 C20 60 5 42 5 26 C5 12 16 4 28 4 C38 4 46 11 50 19 C54 11 62 4 72 4 C84 4 95 12 95 26 C95 42 80 60 50 84 Z" fill="url(#heartGrad)"/>
        <rect x="25" y="32" width="50" height="26" rx="6" fill="url(#ironGrad)" stroke="#334155" stroke-width="2"/>
        <circle cx="30" cy="37" r="2.5" fill="#E2E8F0" stroke="#1E293B" stroke-width="1"/>
        <circle cx="70" cy="37" r="2.5" fill="#E2E8F0" stroke="#1E293B" stroke-width="1"/>
        <circle cx="30" cy="53" r="2.5" fill="#E2E8F0" stroke="#1E293B" stroke-width="1"/>
        <circle cx="70" cy="53" r="2.5" fill="#E2E8F0" stroke="#1E293B" stroke-width="1"/>
        <text x="50" y="49" font-family="'PingFang SC', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" text-anchor="middle">铁了心</text>
      </svg>
    `
  },
  {
    id: 'steel_heart',
    name: '钢了心爱你',
    desc: '百炼成钢，永不褪色',
    tag: '真爱',
    bgColor: '#F0F9FF',
    borderColor: '#38BDF8',
    staticImage: '/photos/steel_heart.jpg',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0369A1" />
          </linearGradient>
        </defs>
        <path d="M50 5 L85 20 V50 C85 72 50 92 50 92 C50 92 15 72 15 50 V20 Z" fill="url(#shieldGrad)" stroke="#0C4A6E" stroke-width="2"/>
        <path d="M50 72 C32 55 24 42 24 30 C24 20 31 15 39 15 C45 15 48 19 50 23 C52 19 55 15 61 15 C69 15 76 20 76 30 C76 42 68 55 50 72 Z" fill="#F43F5E"/>
        <text x="50" y="45" font-family="'PingFang SC', sans-serif" font-weight="900" font-size="12" fill="#FFFFFF" text-anchor="middle">钢了心</text>
      </svg>
    `
  },
  {
    id: 'sock_meme',
    name: '可爱袜子表情包',
    desc: '香喷喷/臭烘烘的小袜子',
    tag: '搞笑梗',
    bgColor: '#FEFCE8',
    borderColor: '#FACC15',
    staticImage: '/photos/sock_meme.png',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <defs>
          <linearGradient id="sockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCD34D" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
        </defs>
        <path d="M35 15 H65 V45 C65 52 68 58 75 62 L82 67 C88 72 88 82 82 87 C76 92 65 92 58 87 L28 65 C22 60 20 52 20 44 L35 15 Z" fill="url(#sockGrad)" stroke="#B45309" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="48" cy="62" r="3" fill="#1F2937"/>
        <circle cx="62" cy="62" r="3" fill="#1F2937"/>
        <path d="M52 68 Q55 72 58 68" stroke="#1F2937" stroke-width="2" fill="none"/>
      </svg>
    `
  },
  {
    id: 'birthday_photo',
    name: '生日合照',
    desc: '吹蜡烛许愿永远在一起',
    tag: '甜蜜',
    bgColor: '#FFF1F2',
    borderColor: '#FB7185',
    staticImage: '/photos/birthday_photo.jpg',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <rect x="15" y="10" width="70" height="78" rx="8" fill="#FFFFFF" stroke="#E11D48" stroke-width="2.5"/>
        <rect x="22" y="17" width="56" height="50" rx="4" fill="#FFE4E6"/>
        <rect x="32" y="44" width="36" height="18" rx="4" fill="#F43F5E"/>
        <rect x="36" y="32" width="28" height="13" rx="3" fill="#FB7185"/>
        <text x="50" y="80" font-family="'PingFang SC', sans-serif" font-weight="bold" font-size="10" fill="#E11D48" text-anchor="middle">🎂 生日快乐</text>
      </svg>
    `
  },
  {
    id: 'boyfriend_photo',
    name: '我的帅照',
    desc: '随叫随到的超帅男友',
    tag: '心动',
    bgColor: '#EFF6FF',
    borderColor: '#60A5FA',
    staticImage: '/photos/bf_1.jpg',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <circle cx="50" cy="50" r="42" fill="#DBEAFE" stroke="#3B82F6" stroke-width="2"/>
        <ellipse cx="50" cy="52" rx="22" ry="24" fill="#FDE68A"/>
        <text x="50" y="86" font-family="'PingFang SC', sans-serif" font-weight="900" font-size="10" fill="#1D4ED8" text-anchor="middle">超帅男友</text>
      </svg>
    `
  },
  {
    id: 'flower_photo',
    name: '浪漫鲜花',
    desc: '送你的专属浪漫玫瑰',
    tag: '浪漫',
    bgColor: '#FFF5F5',
    borderColor: '#F87171',
    staticImage: '/photos/flower_photo.jpg',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <circle cx="50" cy="50" r="30" fill="#FEE2E2"/>
        <text x="50" y="60" font-size="34" text-anchor="middle">🌹</text>
      </svg>
    `
  },
  {
    id: 'boba_tea',
    name: '全糖奶茶',
    desc: '大杯加波霸，甜度满分',
    tag: '续命',
    bgColor: '#FFFBEB',
    borderColor: '#F59E0B',
    staticImage: '/photos/boba_tea.png',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <path d="M28 26 L36 86 C36 88 40 90 50 90 C60 90 64 88 64 86 L72 26 Z" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5"/>
        <text x="50" y="58" font-size="32" text-anchor="middle">🧋</text>
      </svg>
    `
  },
  {
    id: 'hug_kiss',
    name: '抱抱亲亲',
    desc: '今日份甜蜜充电仪式',
    tag: '亲昵',
    bgColor: '#FDF2F8',
    borderColor: '#EC4899',
    staticImage: '/photos/hug_kiss.png',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <circle cx="50" cy="50" r="30" fill="#FCE7F3"/>
        <text x="50" y="60" font-size="32" text-anchor="middle">🫂</text>
      </svg>
    `
  },
  {
    id: 'gold_card',
    name: '免死金牌',
    desc: '拥有一次任性免批评特权',
    tag: '神券',
    bgColor: '#FEFCE8',
    borderColor: '#EAB308',
    staticImage: '/photos/gold_card.png',
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <text x="50" y="60" font-size="32" text-anchor="middle">🛡️</text>
      </svg>
    `
  }
]

// Storage key for user customized photos via UI
const STORAGE_KEY = 'couple_game_custom_tiles_v1'

export function loadCardDefinitions(): CardDefinition[] {
  const admin = loadAdminConfig()
  const activeBf = getActiveBfProfile(admin)

  let baseDefs = DEFAULT_CARD_DEFINITIONS
  if (admin.customCards && Array.isArray(admin.customCards) && admin.customCards.length >= 3) {
    baseDefs = admin.customCards
  }
  if (!baseDefs.some(def => def.id === 'boyfriend_photo')) {
    baseDefs = [...baseDefs, DEFAULT_CARD_DEFINITIONS.find(def => def.id === 'boyfriend_photo')!]
  }

  let savedUserPhotos: Record<string, string> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      savedUserPhotos = JSON.parse(raw)
    }
  } catch (e) {
    console.error('Failed to load customized tiles', e)
  }

  return baseDefs.map(def => {
    if (def.id === 'boyfriend_photo') {
      return { ...def, name: activeBf.name, staticImage: activeBf.image, customImage: undefined }
    }
    let staticImg = def.staticImage

    // Photo overrides for the other card types.
    if (admin.activeCardPhotos && admin.activeCardPhotos[def.id]) {
      staticImg = admin.activeCardPhotos[def.id]
    }

    return {
      ...def,
      staticImage: staticImg,
      customImage: def.customImage || savedUserPhotos[def.id] || undefined
    }
  })
}

export function saveCustomImage(cardId: string, base64Image: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? JSON.parse(raw) : {}
    saved[cardId] = base64Image
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch (e) {
    console.error('Failed to save customized tile', e)
  }
}

export function removeCustomImage(cardId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      delete saved[cardId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    }
  } catch (e) {
    console.error('Failed to remove customized tile', e)
  }
}
