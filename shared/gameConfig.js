import { LAYOUTS, shapeColumns } from './layoutCatalog.js'
// One set of defaults and bounds for the browser and the Node server.
export const CARD_GEOMETRY = Object.freeze({ padding: 12, cardWidth: 54, cardHeight: 64, stepX: 58, stepY: 68 })

export function normalizeCardTextMode(value) {
  return ['none', 'name', 'description'].includes(value) ? value : 'name'
}

export function defaultGameSettings() {
  return {
    boardWidth: 420,
    boardHeight: 540,
    cardWidth: 54,
    cardHeight: 64,
    initialSlots: 7,
    maxSlots: 8,
    slotUnlockCondition: 'match_count',
    slotUnlockMatchCount: 3,
    totalLevels: 3,
    levels: [
      { minCards: 18, maxCards: 24, types: 3, layers: 2, spreadX: 100, spreadY: 100, randomness: 65, layout: 'scatter', solvability: 'guaranteed' },
      { minCards: 90, maxCards: 108, types: 7, layers: 4, spreadX: 100, spreadY: 100, randomness: 80, layout: 'scatter', solvability: 'hard' },
      { minCards: 120, maxCards: 144, types: 8, layers: 6, spreadX: 100, spreadY: 100, randomness: 80, layout: 'heart', solvability: 'hard' }
    ]
  }
}

function integer(value, fallback, min, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

// A layer's capacity determines how many layers a deal needs, not its card limit.
export function layoutGrid(settings, level) {
  const cardWidth = (settings && typeof settings.cardWidth === 'number' && Number.isFinite(settings.cardWidth)) ? settings.cardWidth : CARD_GEOMETRY.cardWidth
  const cardHeight = (settings && typeof settings.cardHeight === 'number' && Number.isFinite(settings.cardHeight)) ? settings.cardHeight : CARD_GEOMETRY.cardHeight
  const stepX = (settings && typeof settings.cardWidth === 'number' && Number.isFinite(settings.cardWidth)) ? (settings.cardWidth + 4) : CARD_GEOMETRY.stepX
  const stepY = (settings && typeof settings.cardHeight === 'number' && Number.isFinite(settings.cardHeight)) ? (settings.cardHeight + 4) : CARD_GEOMETRY.stepY
  const padding = CARD_GEOMETRY.padding
  const maxX = (settings.boardWidth - padding * 2 - cardWidth) / stepX
  const maxY = (settings.boardHeight - padding * 2 - cardHeight) / stepY
  const spanX = maxX * level.spreadX / 100
  const spanY = maxY * level.spreadY / 100
  const columns = Math.max(1, Math.floor((spanX - 0.32) / 1.06) + 1)
  const rows = Math.max(1, Math.floor((spanY - 0.24) / 1.06) + 1)
  const rowCounts = Array.from({ length: rows }, (_, row) => {
    if (level.layout !== 'heart') return shapeColumns(level.layout, columns, rows, row).length
    if (row === 0) return Math.min(columns, Math.max(2, Math.floor((columns - 2) / 2) * 2))
    if (row <= Math.ceil(rows * 0.3)) return columns
    return Math.max(1, Math.round(columns * (rows - 1 - row) / Math.max(1, rows * 0.65)))
  })
  return { maxX, maxY, spanX, spanY, columns, rows, rowCounts, capacity: rowCounts.reduce((sum, count) => sum + count, 0), cardWidth, cardHeight, stepX, stepY }
}

export function normalizeGameSettings(input) {
  const defaults = defaultGameSettings()
  const raw = record(input)
  const initialSlots = integer(raw.initialSlots, defaults.initialSlots, 4, 8)
  const maxSlots = Math.max(initialSlots, integer(raw.maxSlots, defaults.maxSlots, initialSlots, 8))
  const allowedConditions = ['match_count', 'love_coupon', 'boyfriend_rescue', 'urgent_click', 'free_click']
  const slotUnlockCondition = (typeof raw.slotUnlockCondition === 'string' && allowedConditions.includes(raw.slotUnlockCondition))
    ? raw.slotUnlockCondition
    : defaults.slotUnlockCondition
  const slotUnlockMatchCount = integer(raw.slotUnlockMatchCount, defaults.slotUnlockMatchCount, 1, 10)

  const settings = {
    boardWidth: integer(raw.boardWidth, defaults.boardWidth, 360, 480),
    boardHeight: integer(raw.boardHeight, defaults.boardHeight, 420, 640),
    cardWidth: integer(raw.cardWidth, defaults.cardWidth, 48, 80),
    cardHeight: integer(raw.cardHeight, defaults.cardHeight, 56, 96),
    initialSlots,
    maxSlots,
    slotUnlockCondition,
    slotUnlockMatchCount,
    totalLevels: 3,
    levels: []
  }

  const validLevelArray = Array.isArray(raw.levels) ? raw.levels : null
  const explicitCount = (typeof raw.totalLevels === 'number' && Number.isFinite(raw.totalLevels))
    ? integer(raw.totalLevels, 3, 1)
    : (validLevelArray && validLevelArray.length > 3 ? validLevelArray.length : 3)
  settings.totalLevels = explicitCount

  const allowedSolvabilities = ['guaranteed', 'normal', 'hard', 'impossible']

  settings.levels = Array.from({ length: explicitCount }, (_, index) => {
    const fallback = defaults.levels[index] || defaults.levels[defaults.levels.length - 1]
    const entry = record(validLevelArray ? validLevelArray[index] : null)
    const solvability = (typeof entry.solvability === 'string' && allowedSolvabilities.includes(entry.solvability))
      ? entry.solvability
      : (fallback.solvability || 'guaranteed')
    const level = {
      minCards: 6, maxCards: 6,
      types: integer(entry.types, fallback.types, 1, 12),
      layers: integer(entry.layers, fallback.layers, 1, 8),
      spreadX: integer(entry.spreadX, fallback.spreadX, 60, 100),
      spreadY: integer(entry.spreadY, fallback.spreadY, 60, 100),
      randomness: integer(entry.randomness, fallback.randomness, 0, 100),
      layout: LAYOUTS.some(layout => layout.id === entry.layout) ? entry.layout : fallback.layout,
      ...(Array.isArray(entry.cardGroupIds) ? { cardGroupIds: [...new Set(entry.cardGroupIds.filter(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id)))] } : {}),
      solvability
    }
    const first = integer(entry.minCards, fallback.minCards, 6)
    const last = integer(entry.maxCards, fallback.maxCards, 6)
    level.minCards = Math.min(first, last)
    level.maxCards = Math.max(first, last)
    return level
  })
  return settings
}

export function cardCountWarning(level) {
  const { minCards, maxCards } = level
  if (!Number.isSafeInteger(minCards) || !Number.isSafeInteger(maxCards) || minCards < 6 || maxCards < 6) return '卡片张数需填写至少 6 张的整数。'
  if (minCards > maxCards) return '最少张数不能大于最多张数。'
  if (minCards === maxCards && minCards % 3) {
    return `${minCards} 张不是 3 的倍数，严格三消无法全部消除。建议设置为 ${Math.max(6, Math.floor(minCards / 3) * 3)} 或 ${Math.ceil(minCards / 3) * 3} 张。`
  }
  if (Math.ceil(minCards / 3) > Math.floor(maxCards / 3)) return `${minCards}–${maxCards} 张范围内没有 3 的倍数，无法全部消除。请将范围扩大到 ${Math.max(6, Math.floor(minCards / 3) * 3)} 或 ${Math.ceil(maxCards / 3) * 3} 张。`
  return ''
}
