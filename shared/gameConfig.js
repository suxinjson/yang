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
      { minCards: 90, maxCards: 108, types: 7, layers: 4, spreadX: 100, spreadY: 100, randomness: 80, layout: 'scatter', solvability: 'guaranteed' },
      { minCards: 120, maxCards: 144, types: 8, layers: 6, spreadX: 100, spreadY: 100, randomness: 80, layout: 'heart', solvability: 'guaranteed' }
    ]
  }
}

function integer(value, fallback, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

// This grid is also used by generation, so capacity checks cannot drift.
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
  const columns = Math.max(2, Math.floor((spanX - 0.32) / 1.06) + 1)
  const rows = Math.max(3, Math.floor((spanY - 0.24) / 1.06) + 1)
  const rowCounts = Array.from({ length: rows }, (_, row) => {
    if (level.layout !== 'heart') return columns
    if (row === 0) return Math.max(2, Math.floor((columns - 2) / 2) * 2)
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
    ? integer(raw.totalLevels, 3, 1, 5)
    : (validLevelArray && validLevelArray.length > 3 ? Math.min(5, validLevelArray.length) : 3)
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
      layout: entry.layout === 'scatter' || entry.layout === 'heart' ? entry.layout : fallback.layout,
      solvability
    }
    const capacity = Math.min(240, Math.floor(layoutGrid(settings, level).capacity * level.layers / 3) * 3)
    const first = Math.floor(integer(entry.minCards, fallback.minCards, 6, capacity) / 3) * 3
    const last = Math.floor(integer(entry.maxCards, fallback.maxCards, 6, capacity) / 3) * 3
    level.minCards = Math.min(first, last, capacity)
    level.maxCards = Math.min(Math.max(first, last), capacity)
    return level
  })
  return settings
}
