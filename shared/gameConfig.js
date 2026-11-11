// One set of defaults and bounds for the browser and the Node server.
export const CARD_GEOMETRY = Object.freeze({ padding: 12, cardWidth: 54, cardHeight: 64, stepX: 58, stepY: 68 })

export function defaultGameSettings() {
  return {
    boardWidth: 420,
    boardHeight: 540,
    levels: [
      { minCards: 18, maxCards: 24, types: 3, layers: 2, spreadX: 100, spreadY: 100, randomness: 65, layout: 'scatter' },
      { minCards: 90, maxCards: 108, types: 7, layers: 4, spreadX: 100, spreadY: 100, randomness: 80, layout: 'scatter' },
      { minCards: 120, maxCards: 144, types: 8, layers: 6, spreadX: 100, spreadY: 100, randomness: 80, layout: 'heart' }
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
  const maxX = (settings.boardWidth - 24 - 54) / 58
  const maxY = (settings.boardHeight - 24 - 64) / 68
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
  return { maxX, maxY, spanX, spanY, columns, rows, rowCounts, capacity: rowCounts.reduce((sum, count) => sum + count, 0) }
}

export function normalizeGameSettings(input) {
  const defaults = defaultGameSettings()
  const raw = record(input)
  const settings = {
    boardWidth: integer(raw.boardWidth, defaults.boardWidth, 360, 480),
    boardHeight: integer(raw.boardHeight, defaults.boardHeight, 420, 640),
    levels: []
  }
  settings.levels = defaults.levels.map((fallback, index) => {
    const entry = record(Array.isArray(raw.levels) ? raw.levels[index] : null)
    const level = {
      minCards: 6, maxCards: 6,
      types: integer(entry.types, fallback.types, 1, 12),
      layers: integer(entry.layers, fallback.layers, 1, 8),
      spreadX: integer(entry.spreadX, fallback.spreadX, 60, 100),
      spreadY: integer(entry.spreadY, fallback.spreadY, 60, 100),
      randomness: integer(entry.randomness, fallback.randomness, 0, 100),
      layout: entry.layout === 'scatter' || entry.layout === 'heart' ? entry.layout : fallback.layout
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
