<template>
  <section class="space-y-3" data-testid="client-logs">
    <div class="rounded-xl bg-sky-50 p-3 text-sky-900">
      <h3 class="font-black">客户端使用日志</h3>
      <p class="mt-1 text-[11px]">记录启动、在线验证、应用内点击、游戏操作与接口调用。按设备与会话区分，保留最近 30 天，存储上限 64 MB。</p>
    </div>
    <form class="grid grid-cols-2 gap-2" @submit.prevent="refresh">
      <label>开始日期<input v-model="filters.from" type="date" class="w-full rounded-lg border p-2" /></label>
      <label>结束日期<input v-model="filters.to" type="date" class="w-full rounded-lg border p-2" /></label>
      <label>设备标识<input v-model.trim="filters.deviceId" placeholder="精确匹配设备 ID" class="w-full rounded-lg border p-2" /></label>
      <label>会话标识<input v-model.trim="filters.sessionId" placeholder="精确匹配会话 ID" class="w-full rounded-lg border p-2" /></label>
      <label class="col-span-2">事件<select v-model="filters.event" class="w-full rounded-lg border p-2"><option value="">全部事件</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></label>
      <button class="rounded-xl bg-slate-900 p-2 font-bold text-white" :disabled="busy">{{ busy ? '读取中…' : '查询 / 刷新' }}</button>
      <label class="flex items-center gap-2"><input v-model="autoRefresh" type="checkbox" />每 10 秒刷新首页</label>
    </form>
    <p v-if="error" role="alert" class="text-red-600 font-bold">{{ error }}</p>
    <p v-if="!busy && !rows.length && !error" class="p-6 text-center text-gray-400">暂无符合条件的日志</p>
    <article v-for="row in rows" :key="row.id" class="rounded-xl border border-gray-200 p-3 space-y-1 break-all">
      <div class="flex justify-between gap-2"><strong>{{ labels[row.event] || row.event }}</strong><time class="text-gray-500">{{ new Date(row.at).toLocaleString() }}</time></div>
      <p class="text-gray-500">{{ row.platform }} {{ row.version }}</p>
      <button type="button" class="block text-left text-sky-700" @click="filterDevice(row.deviceId)">设备：{{ row.deviceId }}</button>
      <button type="button" class="block text-left text-sky-700" @click="filterSession(row.sessionId)">会话：{{ row.sessionId }}</button>
      <pre v-if="row.details" class="whitespace-pre-wrap text-[11px] text-gray-600">{{ JSON.stringify(row.details, null, 2) }}</pre>
    </article>
    <button v-if="cursor" class="w-full rounded-xl bg-gray-100 p-3 font-bold" :disabled="busy" @click="load(true)">加载更早记录</button>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { getAdminToken, getBaseUrl, setAdminToken } from '../utils/api'
import { clientFetch } from '../utils/clientSession'

type Row = { id: string; at: string; event: string; deviceId: string; sessionId: string; platform: string; version: string; details?: Record<string, unknown> }
const rows = ref<Row[]>([])
const filters = reactive({ from: '', to: '', deviceId: '', sessionId: '', event: '' })
const busy = ref(false)
const error = ref('')
const cursor = ref<string | null>(null)
const autoRefresh = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let active = true
const labels: Record<string, string> = { session_start: '启动 / 重新连接', heartbeat: '在线心跳', background: '进入后台', ui_click: '界面点击', ui_change: '界面设置变化', round_start: '开始关卡', card_pick: '选择卡牌', move_out: '移出卡牌', return_staged: '放回暂存牌', undo: '撤回', shuffle: '洗牌', summon: '召唤男友', restart: '重新开始', next_level: '下一关', win: '通关', lose: '失败', redeem: '兑现心愿', coupon_draw: '服务器抽券', api_request: '接口操作', client_error: '客户端异常', sound: '切换音效' }
async function load(more = false) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ ...filters, limit: '50', ...(more && cursor.value ? { cursor: cursor.value } : {}) })
    const response = await clientFetch(`${getBaseUrl()}/api/admin/client-logs?${query}`, { headers: { Authorization: `Bearer ${getAdminToken() || ''}` }, signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (response.status === 401) {
      setAdminToken(null)
      throw new Error('登录已过期，请关闭后台并重新登录')
    }
    if (!response.ok) throw new Error('日志读取失败，请检查后台服务')
    const data = await response.json()
    if (!Array.isArray(data.items)) throw new Error('日志接口不可用，请更新后台服务')
    if (!active) return
    rows.value = more ? [...rows.value, ...data.items] : data.items
    cursor.value = data.nextCursor || null
  } catch (err) { if (active) error.value = err instanceof Error ? err.message : '日志读取失败' }
  finally { busy.value = false }
}
function refresh() { cursor.value = null; return load() }
function filterDevice(id: string) { filters.deviceId = id; void refresh() }
function filterSession(id: string) { filters.sessionId = id; void refresh() }
onMounted(() => {
  void refresh()
  timer = setInterval(() => { if (autoRefresh.value && !document.hidden) void refresh() }, 10000)
})
onUnmounted(() => { active = false; if (timer) clearInterval(timer) })
</script>
