export const sources: Record<string, string> = { android_app: 'Android App', ios_app: 'iPhone / iPad App', web: '网页', admin_web: '开发者后台', server: '服务器' }
export const outcomes: Record<string, string> = { playing: '进行中', won: '已通关', lost: '未通关', abandoned: '已结束', restart: '玩家重开', admin_restart: '后台重开', admin_close: '后台关闭' }
export const events: Record<string, string> = {
  app_open: '打开 App', app_background: 'App 切到后台', app_foreground: 'App 回到前台', app_exit: '退出 App',
  page_open: '打开游戏网页', page_hidden: '游戏网页暂时隐藏', page_visible: '回到游戏网页', page_close: '离开游戏网页',
  session_start: '旧版客户端启动', round_start: '开始关卡', round_end: '关卡结束', round_blocked: '本关无法继续', win: '旧版通关记录', lose: '旧版失败记录',
  prop_gain: '获得道具', prop_use: '消耗道具', coupon_gain: '获得心愿券', coupon_use: '使用心愿券',
  coupon_revoke: '作废心愿券', coupon_reset: '清空心愿券', room_create: '创建房间', room_join: '加入房间', admin_control: '后台操作', client_error: '客户端异常'
}
const tools: Record<string, string> = { hint: '透视卡', rescue: '召唤男友卡', 'gang.hint': '透视卡', 'gang.rescue': '召唤男友卡', unlock: '卡槽扩容' }
function itemSummary(value: unknown) {
  if (Array.isArray(value)) return value.map(item => `${tools[item.itemId] || item.itemId} ${item.quantity} 张`).join('、')
  return value && typeof value === 'object' ? Object.entries(value).map(([key, count]) => `${tools[key] || key} ${count} 张`).join('、') : ''
}
const actions: Record<string, string> = { restart: '重置关卡', close_room: '关闭情侣房间', grant_tool: '发放道具', grant_coupon: '发放心愿券', revoke_coupon: '作废心愿券' }
const reasons: Record<string, string> = { visibility: '屏幕可见状态变化', native_state: '手机系统前后台切换', back_button: '按返回键退出', pagehide: '页面关闭或离开', launch: '本次打开' }
export function duration(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return ''
  const seconds = Math.floor(value / 1000)
  if (seconds < 1) return '不足 1 秒'
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60)
  return [hours ? `${hours} 小时` : '', minutes ? `${minutes} 分` : '', seconds % 60 ? `${seconds % 60} 秒` : ''].filter(Boolean).join(' ')
}
export function summarizeRecord(details?: Record<string, unknown>, event = '') {
  if (!details) return ''
  if (/^(app_|page_)/.test(event)) {
    if (event === 'app_background') return `已切到手机后台，本次累计前台使用 ${duration(details.foregroundMs) || '未记录'}。`
    if (event === 'app_foreground') return `从后台返回，刚才在后台停留 ${duration(details.backgroundMs) || '未记录'}。`
    if (event === 'app_exit') return `已收到${details.reason === 'back_button' ? '主动退出' : '页面关闭'}通知，本次累计前台使用 ${duration(details.foregroundMs) || '未记录'}。`
    if (event === 'app_open') return '开始一次新的 App 使用。'
    if (event === 'page_hidden') return '网页暂时不可见，可能切换了标签页或最小化窗口。'
    if (event === 'page_visible') return `网页重新可见，刚才隐藏 ${duration(details.backgroundMs) || '未记录'}。`
    if (event === 'page_close') return `本次网页前台使用 ${duration(details.foregroundMs) || '未记录'}。`
    return '开始一次新的游戏网页访问。'
  }
  const items = itemSummary(details.items)
  return [
    typeof details.level === 'number' ? `第 ${details.level} 关` : '',
    details.mode === 'solo' ? '单人模式' : details.mode === 'couple' ? '情侣模式' : '',
    typeof details.total === 'number' ? `${details.total} 张卡片` : '',
    typeof details.couponTitle === 'string' ? `“${details.couponTitle}”` : '',
    details.target === 'girlfriend_pays' ? '男友心愿，女友兑现' : details.target === 'boyfriend_pays' ? '女友心愿，男友兑现' : '',
    items, typeof details.tool === 'string' ? tools[details.tool] || details.tool : '',
    typeof details.count === 'number' ? `${details.count} 次` : '',
    typeof details.remaining === 'number' ? `剩余 ${details.remaining} 次` : '',
    details.purpose === 'slot_unlock' || details.purpose === 'unlock' ? '用于解锁卡槽' : details.purpose === 'redeem' ? '兑现心愿' : '',
    typeof details.action === 'string' ? actions[details.action] || details.action : '',
    typeof details.outcome === 'string' ? outcomes[details.outcome] || details.outcome : '',
    typeof details.elapsedMs === 'number' ? `用时 ${duration(details.elapsedMs)}` : ''
  ].filter(Boolean).join(' · ')
}
export function recordDetails(details?: Record<string, unknown>) {
  if (!details) return []
  const labels: Record<string, string> = { level: '关卡', mode: '游戏模式', total: '卡片总数', tool: '道具', count: '数量', remaining: '剩余次数', outcome: '结果', action: '管理操作', source: '获得方式', purpose: '用途', cause: '无法继续的原因', elapsedMs: '本次持续时间', foregroundMs: '累计前台使用', backgroundMs: '本次后台停留', reason: '触发方式', couponTitle: '心愿名称', target: '兑现方', roundId: '牌局编号', roomId: '房间编号', couponId: '心愿券编号', items: '道具明细' }
  return Object.entries(details).filter(([key]) => labels[key]).map(([key, raw]) => {
    let value: string
    if (key.endsWith('Ms')) value = duration(raw)
    else if (key === 'items') value = itemSummary(raw)
    else {
      const values: Record<string, string> = { ...tools, ...actions, ...outcomes, ...reasons, solo: '单人', couple: '情侣', round_start: '旧版开局发放', profile_starter: '首次创建个人背包', level_reward: '通关概率奖励', admin_grant: '开发者发放', initial_grant: '初始发放', redeem: '兑现心愿', slot_unlock: '解锁卡槽', unmatchable: '剩余卡片无法三消', slots_full: '卡槽已满', girlfriend_pays: '女友', boyfriend_pays: '男友' }
      value = values[String(raw)] || String(raw)
    }
    return { label: labels[key], value }
  })
}
export function deviceSummary(device: string, platform = '') {
  const android = device.match(/Android\s+([\d.]+)(?:;\s*([^;)]+))?/i)
  const ios = device.match(/(?:CPU (?:iPhone )?OS|iPhone OS)\s+([\d_]+)/i)
  const os = android ? `Android ${android[1]}` : ios ? `iOS ${ios[1].replaceAll('_', '.')}` : /Windows/i.test(device) ? 'Windows 电脑' : /Macintosh/i.test(device) ? 'Mac 电脑' : platform === 'android' ? 'Android 设备' : platform === 'ios' ? 'iPhone / iPad' : '设备未提供'
  const model = android?.[2]?.replace(/\s+Build\/.*/, '').trim()
  const browser = /; wv\)/.test(device) ? 'App 内置浏览器' : /Edg\//.test(device) ? 'Edge' : /Chrome\//.test(device) ? 'Chrome' : /Firefox\//.test(device) ? 'Firefox' : /Safari\//.test(device) ? 'Safari' : ''
  return [os, model && !/^(Linux|U|[a-z]{2}-[a-z]{2})$/i.test(model) ? model : '', browser].filter(Boolean).join(' · ')
}
