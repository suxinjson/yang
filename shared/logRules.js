export const LIFECYCLE_EVENTS = new Set(['app_open', 'app_background', 'app_foreground', 'app_exit', 'page_open', 'page_hidden', 'page_visible', 'page_close'])
export const LOG_CATEGORIES = { lifecycle: '打开与前后台', game: '关卡与房间', tools: '道具', coupons: '心愿券', admin: '后台管理', errors: '异常' }
export function logCategory(event) {
  if (LIFECYCLE_EVENTS.has(event) || event === 'session_start') return 'lifecycle'
  if (/^(round_|room_)/.test(event) || event === 'win' || event === 'lose') return 'game'
  if (event.startsWith('prop_')) return 'tools'
  if (event.startsWith('coupon_')) return 'coupons'
  if (event === 'admin_control') return 'admin'
  return 'errors'
}
export function logMatches(row, params) {
  if (!Number.isFinite(Date.parse(row.at))) return false
  for (const key of ['deviceId', 'source', 'sessionId', 'event']) if (params[key] && row[key] !== params[key]) return false
  if (params.category && logCategory(row.event) !== params.category) return false
  const offset = Math.max(-840, Math.min(840, Number(params.timezoneOffset) || 0))
  const day = new Date(Date.parse(row.at) - offset * 60000).toISOString().slice(0, 10)
  if (params.from && day < params.from) return false
  if (params.to && day > params.to) return false
  if (params.search) {
    const query = String(params.search).trim().toLowerCase().slice(0, 120)
    if (![row.ip, row.device, row.deviceId, row.sessionId, row.details?.couponTitle, row.details?.title].some(value => typeof value === 'string' && value.toLowerCase().includes(query))) return false
  }
  return true
}
