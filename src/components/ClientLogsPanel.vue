<template>
  <section class="space-y-3" data-testid="client-logs">
    <h2 class="panel-title">客户端日志</h2>
    <form class="grid grid-cols-2 lg:grid-cols-4 gap-3" @submit.prevent="refresh">
      <label>开始日期<input v-model="filters.from" type="date" class="w-full rounded-lg border p-2" /></label>
      <label>结束日期<input v-model="filters.to" type="date" class="w-full rounded-lg border p-2" /></label>
      <label>设备标识<input v-model.trim="filters.deviceId" placeholder="精确匹配设备 ID" class="w-full rounded-lg border p-2" /></label>
      <label>会话标识<input v-model.trim="filters.sessionId" placeholder="精确匹配会话 ID" class="w-full rounded-lg border p-2" /></label>
      <label>来源<select v-model="filters.source" class="w-full rounded-lg border p-2"><option value="">全部来源</option><option v-for="(label, key) in sources" :key="key" :value="key">{{ label }}</option></select></label>
      <label>事件<select v-model="filters.event" class="w-full rounded-lg border p-2"><option value="">全部事件</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select></label>
      <button class="rounded-xl bg-slate-900 p-2 font-bold text-white" :disabled="busy">{{ busy ? '读取中…' : '查询 / 刷新' }}</button>
      <label class="flex items-center gap-2"><input v-model="autoRefresh" type="checkbox" />自动刷新</label>
    </form>
    <p v-if="error" role="alert" class="text-red-600 font-bold">{{ error }}</p>
    <p v-if="!busy && !rows.length && !error" class="p-6 text-center text-gray-400">暂无符合条件的日志</p>
    <article v-for="row in rows" :key="row.id" class="rounded-xl border border-gray-200 p-3 space-y-1 break-all">
      <div class="flex justify-between gap-2"><strong>{{ labels[row.event] || row.event }}</strong><time class="text-gray-500">{{ new Date(row.at).toLocaleString() }}</time></div>
      <p class="text-gray-500">{{ sources[row.source] || row.source || row.platform || '旧版记录' }} {{ row.version }} · {{ row.ip || '无 IP' }}</p>
      <p v-if="summarizeRecord(row.details)" class="text-xs text-slate-600">{{ summarizeRecord(row.details) }}</p>
      <p class="text-[11px] text-gray-500">{{ row.device }}</p>
      <button type="button" class="block text-left text-sky-700" @click="filterDevice(row.deviceId)">设备：{{ row.deviceId }}</button>
      <button v-if="row.sessionId" type="button" class="block text-left text-sky-700" @click="filterSession(row.sessionId)">会话：{{ row.sessionId }}</button>
      <details v-if="row.details" class="text-[11px] text-gray-400"><summary class="cursor-pointer">详细记录</summary><pre class="whitespace-pre-wrap pt-2">{{ JSON.stringify(row.details, null, 2) }}</pre></details>
    </article>
    <button v-if="cursor" class="w-full rounded-xl bg-gray-100 p-3 font-bold" :disabled="busy" @click="load(true)">加载更早记录</button>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { getAdminToken, getBaseUrl, setAdminToken } from '../utils/api'
import { sources, events as labels, summarizeRecord } from '../utils/recordLabels'

type Row = { id: string; at: string; event: string; deviceId: string; sessionId: string; platform: string; version: string; source: string; ip: string; device: string; details?: Record<string, unknown> }
const rows = ref<Row[]>([])
const filters = reactive({ from: '', to: '', deviceId: '', sessionId: '', source: '', event: '' })
const busy = ref(false)
const error = ref('')
const cursor = ref<string | null>(null)
const autoRefresh = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let active = true
async function load(more = false) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ ...filters, limit: '50', ...(more && cursor.value ? { cursor: cursor.value } : {}) })
    const response = await fetch(`${getBaseUrl()}/api/admin/client-logs?${query}`, { headers: { Authorization: `Bearer ${getAdminToken() || ''}` }, signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (response.status === 401) {
      setAdminToken(null)
      throw new Error('登录已过期，请退出登录后重新登录')
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
