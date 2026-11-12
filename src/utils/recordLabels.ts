export const sources: Record<string, string> = { android_app: 'Android App', ios_app: 'iOS App', web: '网页', admin_web: '开发者后台', server: '服务器' }
export const outcomes: Record<string, string> = { playing: '进行中', won: '已通关', lost: '卡槽已满', abandoned: '已结束', restart: '已重开', admin_restart: '后台重开', admin_close: '后台关闭' }
export const events: Record<string, string> = { session_start: '启动', round_start: '开始关卡', round_end: '关卡结束', round_blocked: '卡槽已满', prop_gain: '获得道具', prop_use: '消耗道具', coupon_gain: '获得心愿券', coupon_use: '使用心愿券', coupon_revoke: '作废心愿券', coupon_reset: '清空心愿券', room_create: '创建房间', room_join: '加入房间', admin_control: '后台操作', client_error: '客户端异常' }
const tools: Record<string, string> = { hint: '提示', rescue: '救场', unlock: '卡槽扩容' }
export function summarizeRecord(details?: Record<string, unknown>) {
  if (!details) return ''
  return [
    typeof details.level === 'number' ? `第 ${details.level} 关` : '',
    details.mode === 'solo' ? '单人' : details.mode === 'couple' ? '情侣' : '',
    typeof details.tool === 'string' ? tools[details.tool] || details.tool : '',
    typeof details.count === 'number' ? `${details.count} 次` : '',
    typeof details.remaining === 'number' ? `剩余 ${details.remaining}` : '',
    typeof details.outcome === 'string' ? outcomes[details.outcome] || details.outcome : '',
    typeof details.elapsedMs === 'number' ? `${Math.floor(details.elapsedMs / 60000)} 分 ${Math.floor(details.elapsedMs / 1000) % 60} 秒` : ''
  ].filter(Boolean).join(' · ')
}
