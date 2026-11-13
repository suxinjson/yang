<template>
  <section class="space-y-4" data-testid="client-logs">
    <div class="panel-heading"><h2>客户端日志</h2><span>近 {{ retentionDays }} 天 · 时间按本机时区显示</span></div>
    <form class="grid grid-cols-2 lg:grid-cols-4 gap-3" @submit.prevent="refresh">
      <label>开始日期<input v-model="filters.from" aria-label="开始日期" type="date" class="w-full rounded-lg border p-2" /></label>
      <label>结束日期<input v-model="filters.to" aria-label="结束日期" type="date" class="w-full rounded-lg border p-2" /></label>
      <label>记录类型<select v-model="filters.category" aria-label="记录类型" class="w-full rounded-lg border p-2"><option value="">全部类型</option><option v-for="(label, key) in LOG_CATEGORIES" :key="key" :value="key">{{ label }}</option></select></label>
      <label>搜索<input v-model.trim="filters.search" aria-label="搜索" placeholder="IP、手机型号、心愿名称" class="w-full rounded-lg border p-2" /></label>
      <label>来源<select v-model="filters.source" aria-label="来源" class="w-full rounded-lg border p-2"><option value="">全部来源</option><option v-for="(label, key) in sources" :key="key" :value="key">{{ label }}</option></select></label>
      <label>发生了什么<select v-model="filters.event" aria-label="发生了什么" class="w-full rounded-lg border p-2"><option value="">全部事件</option><option v-for="[key, label] in visibleEvents" :key="key" :value="key">{{ label }}</option></select></label>
      <button class="rounded-xl bg-slate-900 p-2 font-bold text-white" :disabled="busy">{{ busy ? '读取中…' : '查询日志' }}</button>
      <label class="flex items-center gap-2"><input v-model="autoRefresh" type="checkbox" />自动刷新</label>
      <details class="col-span-2 lg:col-span-4 text-xs text-slate-500"><summary class="cursor-pointer">按设备或本次打开筛选</summary><div class="mt-3 grid grid-cols-2 gap-3"><label>设备编号<input v-model.trim="filters.deviceId" placeholder="完整设备编号" class="w-full rounded-lg border p-2" /></label><label>本次打开编号<input v-model.trim="filters.sessionId" placeholder="完整会话编号" class="w-full rounded-lg border p-2" /></label></div></details>
    </form>
    <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500"><button type="button" @click="dateRange(1)">今天</button><button type="button" @click="dateRange(7)">最近 7 天</button><button type="button" @click="clearFilters">清除筛选</button><span class="ml-auto">已加载 {{ rows.length }} 条 · {{ deviceCount }} 台设备</span></div>
    <p v-if="filters.category === 'lifecycle'" class="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">切到后台表示离开前台，可能是按 Home、锁屏或切换应用。退出记录只表示收到了退出通知；系统强制结束进程时可能没有通知。</p>
    <p v-if="error" role="alert" class="text-red-600 font-bold">{{ error }}</p>
    <p v-if="!busy && !rows.length && !error" class="p-6 text-center text-gray-400">暂无符合条件的日志</p>
    <article v-for="row in rows" :key="row.id" class="log-row">
      <div class="log-heading"><strong>{{ labels[row.event] || '其他记录' }}</strong><time :datetime="row.at">{{ new Date(row.at).toLocaleString('zh-CN', { hour12: false }) }}</time></div>
      <p v-if="summarizeRecord(row.details, row.event)" class="log-summary">{{ summarizeRecord(row.details, row.event) }}</p>
      <p class="log-device">{{ sources[row.source] || sources[row.platform === 'android' ? 'android_app' : row.platform === 'ios' ? 'ios_app' : 'web'] }}<span v-if="row.version"> · 版本 {{ row.version }}</span> · {{ deviceSummary(row.device || '', row.platform) }}</p>
      <div class="log-meta"><span>IP：{{ row.ip || '未记录' }}</span><button v-if="row.deviceId" type="button" :aria-label="`设备：${row.deviceId}`" @click="filterDevice(row.deviceId)">查看此设备</button><button v-if="row.sessionId" type="button" :aria-label="`会话：${row.sessionId}`" @click="filterSession(row.sessionId)">查看本次打开</button></div>
      <details class="log-details"><summary>查看详情</summary><dl><template v-for="item in recordDetails(row.details)" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></template><dt>设备编号</dt><dd>{{ row.deviceId || '未记录' }}</dd><template v-if="row.sessionId"><dt>本次打开编号</dt><dd>{{ row.sessionId }}</dd></template><template v-if="row.device"><dt>原始设备信息</dt><dd>{{ row.device }}</dd></template><template v-if="row.receivedAt && Date.parse(row.receivedAt) - Date.parse(row.at) > 10000"><dt>补报接收时间</dt><dd>{{ new Date(row.receivedAt).toLocaleString() }}</dd></template></dl></details>
    </article>
    <button v-if="cursor" class="w-full rounded-xl bg-gray-100 p-3 font-bold" :disabled="busy" @click="load(true)">加载更早记录</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { getAdminToken, getBaseUrl, setAdminToken } from '../utils/api'
import { sources, events as labels, summarizeRecord, recordDetails, deviceSummary } from '../utils/recordLabels'
import { LOG_CATEGORIES, logCategory } from '../../shared/logRules.js'

type Row = { id: string; at: string; receivedAt?: string; event: string; deviceId: string; sessionId: string; platform: string; version: string; source: string; ip: string; device: string; details?: Record<string, unknown> }
const rows = ref<Row[]>([])
const filters = reactive({ from: '', to: '', deviceId: '', sessionId: '', source: '', event: '', category: '', search: '' })
const retentionDays = ref(30)
const deviceCount = computed(() => new Set(rows.value.map(row => row.deviceId).filter(Boolean)).size)
const visibleEvents = computed(() => Object.entries(labels).filter(([key]) => !filters.category || logCategory(key) === filters.category))
watch(() => filters.category, () => { if (filters.event && logCategory(filters.event) !== filters.category) filters.event = '' })
const busy = ref(false)
const error = ref('')
const cursor = ref<string | null>(null)
const autoRefresh = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let active = true
let requestVersion = 0, controller: AbortController | undefined
async function load(more = false) {
  if (more && busy.value) return
  if (filters.from && filters.to && filters.from > filters.to) { error.value = '开始日期不能晚于结束日期'; return }
  controller?.abort(); controller = new AbortController()
  const version = ++requestVersion
  busy.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ ...filters, timezoneOffset: String(new Date().getTimezoneOffset()), limit: '50', ...(more && cursor.value ? { cursor: cursor.value } : {}) })
    const response = await fetch(`${getBaseUrl()}/api/admin/client-logs?${query}`, { headers: { Authorization: `Bearer ${getAdminToken() || ''}` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]), cache: 'no-store' })
    if (response.status === 401) {
      setAdminToken(null)
      throw new Error('登录已过期，请退出登录后重新登录')
    }
    if (!response.ok) throw new Error('日志读取失败，请检查后台服务')
    const data = await response.json()
    if (!Array.isArray(data.items)) throw new Error('日志接口不可用，请更新后台服务')
    if (!active || version !== requestVersion) return
    rows.value = more ? [...new Map([...rows.value, ...data.items].map(row => [row.id, row])).values()] : data.items
    cursor.value = data.nextCursor || null
    retentionDays.value = data.retentionDays || 30
  } catch (err) { if (active && version === requestVersion) error.value = err instanceof Error ? err.message : '日志读取失败' }
  finally { if (version === requestVersion) busy.value = false }
}
function refresh() { cursor.value = null; return load() }
function filterDevice(id: string) { filters.deviceId = id; void refresh() }
function filterSession(id: string) { filters.sessionId = id; void refresh() }
function clearFilters() { Object.keys(filters).forEach(key => { filters[key as keyof typeof filters] = '' }); void refresh() }
function dateRange(days: number) {
  const today = new Date(), from = new Date(today); from.setDate(from.getDate() - days + 1)
  const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  filters.from = date(from); filters.to = date(today); void refresh()
}
onMounted(() => {
  void refresh()
  timer = setInterval(() => { if (autoRefresh.value && !document.hidden && !busy.value) void refresh() }, 10000)
})
onUnmounted(() => { active = false; controller?.abort(); if (timer) clearInterval(timer) })
</script>

<style scoped>
.log-row { padding: 18px; border: 1px solid #e5e9ef; border-radius: 14px; display: grid; gap: 9px; }
.log-heading { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; color: #334155; }
.log-heading time { font-size: 11px; color: #94a3b8; font-variant-numeric: tabular-nums; }
.log-summary { line-height: 1.7; color: #475569; }
.log-device { font-size: 11px; color: #64748b; }
.log-meta { display: flex; flex-wrap: wrap; gap: 12px; color: #94a3b8; font-size: 11px; }
.log-meta button { color: #426587; }
.log-details { font-size: 11px; color: #64748b; }
.log-details summary { cursor: pointer; }
.log-details dl { margin-top: 12px; display: grid; grid-template-columns: 95px minmax(0, 1fr); gap: 8px; line-height: 1.6; }
.log-details dt { color: #94a3b8; }
.log-details dd { overflow-wrap: anywhere; }
</style>
