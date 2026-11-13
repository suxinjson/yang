<template>
  <section class="space-y-5" data-testid="runtime-admin">
    <div class="panel-heading"><h2>运行与个人背包</h2><button class="admin-primary" @click="load" :disabled="busy">刷新</button></div>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <button v-if="pendingControl" class="control" :disabled="busy" @click="control(pendingControl)">重试未确认管理操作</button>
    <div class="grid gap-3 md:grid-cols-3"><div class="rounded-2xl bg-slate-50 p-4">有效房间 <strong>{{ data.rooms.length }}</strong></div><div class="rounded-2xl bg-slate-50 p-4">未使用心愿券 <strong>{{ data.coupons.filter(c => !c.used).length }}</strong></div><div class="rounded-2xl bg-slate-50 p-4">最近单人关卡 <strong>{{ data.rounds.length }}</strong></div></div>
    <h3 class="font-black">情侣房间</h3>
    <p v-if="!data.rooms.length" class="text-xs text-gray-500">暂无运行中的房间。</p>
    <article v-for="room in data.rooms" :key="room.id" class="rounded-2xl border p-4">
      <p class="text-sm font-bold">房间 {{ room.code }} · 第 {{ room.level }} 关 · {{ room.connected }}/2 在线 · 剩余 {{ room.remaining }} 张</p>
      <p class="mt-1 text-xs text-gray-500">{{ outcomes[room.phase] || room.phase }} · 双方各自消耗自己的道具</p>
      <p v-for="member in room.membersInfo" :key="member.deviceId" class="mt-1 break-all text-[11px] text-gray-500">{{ sources[member.source] || member.source }} · {{ member.ip }} · 透视卡 {{ member.tools?.hint || 0 }} · 召唤男友卡 {{ member.tools?.rescue || 0 }} · {{ member.device }}</p>
      <div class="mt-3 flex flex-wrap gap-2"><button class="control" :disabled="busy" @click="control({ roomId: room.id, action: 'grant_tool', tool: 'hint', count: 1 })">发放1次提示</button><button class="control" :disabled="busy" @click="control({ roomId: room.id, action: 'grant_tool', tool: 'rescue', count: 1 })">发放1次救场</button><input v-model.number="levels[room.id]" type="number" min="1" :placeholder="String(room.level)" aria-label="指定关卡" class="w-20 rounded-lg border px-2 text-xs" /><button class="control" :disabled="busy" @click="confirmed('重置该房间棋盘？双方会立即同步。', { roomId: room.id, action: 'restart', level: levels[room.id] || room.level })">重置到指定关</button><button class="control text-red-700" :disabled="busy" @click="confirmed('关闭该房间？双方会收到通知。', { roomId: room.id, action: 'close_room' })">关闭房间</button></div>
    </article>
    <h3 class="font-black">心愿券账本</h3>
    <form class="flex flex-wrap gap-2" @submit.prevent="grantCoupon"><input v-model.trim="title" aria-label="发放券名" placeholder="券名" class="rounded-xl border p-2 text-xs" required /><input v-model.trim="desc" aria-label="发放券说明" placeholder="说明" class="min-w-0 flex-1 rounded-xl border p-2 text-xs" /><button class="control" :disabled="busy">发放心愿券</button></form>
    <article v-for="coupon in data.coupons" :key="coupon.id" class="flex items-center justify-between gap-3 rounded-xl border p-3 text-xs"><div><strong>{{ coupon.title }}</strong><p class="mt-1 text-gray-500">{{ coupon.used ? '已使用' : '未使用' }} · {{ coupon.ownerId ? '个人：' + coupon.ownerId : '旧版共享券' }} · {{ coupon.obtainedAt }} · {{ coupon.id }}</p></div><button class="control text-red-700" :disabled="busy" @click="confirmed('作废这张全局心愿券？', { action: 'revoke_coupon', couponId: coupon.id })">作废</button></article>
    <h3 class="font-black">个人背包</h3>
    <article v-for="profile in data.profiles" :key="profile.profileId" class="rounded-xl border p-3 text-xs"><p class="break-all">{{ profile.profileId }}</p><p class="mt-2 text-slate-500">透视卡 {{ profile.tools.hint }} · 召唤男友卡 {{ profile.tools.rescue }} · 心愿券 {{ profile.coupons.length }}</p><div class="mt-2 flex gap-2"><button class="control" :disabled="busy" @click="control({ profileId: profile.profileId, action: 'grant_tool', tool: 'hint', count: 1 })">发放透视卡</button><button class="control" :disabled="busy" @click="control({ profileId: profile.profileId, action: 'grant_tool', tool: 'rescue', count: 1 })">发放召唤男友卡</button></div></article>
    <h3 class="font-black">最近单人关卡</h3>
    <article v-for="round in data.rounds" :key="round.roundId" class="rounded-xl border p-3 text-xs"><p>第 {{ round.level }} 关 · {{ sources[round.actor.source] || round.actor.source }} · {{ round.actor.ip }} · {{ outcomes[round.finished] || round.finished || '进行中' }}</p><p class="mt-1 break-all text-gray-500">{{ round.actor.device }} · {{ round.roundId }}</p><div v-if="!round.finished" class="mt-2 flex gap-2"><button class="control" :disabled="busy" @click="control({ roundId: round.roundId, action: 'grant_tool', tool: 'hint', count: 1 })">发放提示</button><button class="control" :disabled="busy" @click="control({ roundId: round.roundId, action: 'grant_tool', tool: 'rescue', count: 1 })">发放救场</button></div></article>
  </section>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import { getAdminToken, getBaseUrl } from '../utils/api'
import { acceptServerState } from '../utils/serverState'
import { sources, outcomes } from '../utils/recordLabels'
type Data = { profiles: any[]; rooms: any[]; rounds: any[]; coupons: any[]; transactions: any[] }
const data = ref<Data>({ profiles: [], rooms: [], rounds: [], coupons: [], transactions: [] }), busy = ref(false), error = ref(''), title = ref(''), desc = ref(''), levels = reactive<Record<string, number>>({})
const pendingControl = ref<Record<string, unknown> | null>(null)
try { const raw = localStorage.getItem('gang_admin_control_pending'); if (raw) pendingControl.value = JSON.parse(JSON.parse(raw).fingerprint) } catch { /* Invalid browser cache is not an operation receipt. */ }
async function request(path: string, body?: Record<string, unknown>) {
  const response = await fetch(getBaseUrl() + '/api/play/admin/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken() || ''}` }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(8000) })
  const result = await response.json()
  if (!response.ok) throw Object.assign(new Error(response.status === 401 ? '登录已过期，请重新登录' : result.error || '管理请求失败'), { status: response.status })
  if (result.state) acceptServerState(result.state)
  return result
}
async function load() { busy.value = true; error.value = ''; try { data.value = await request('overview') } catch (err) { error.value = (err as Error).message } finally { busy.value = false } }
async function control(body: Record<string, unknown>) {
  busy.value = true; error.value = ''
  try {
    const key = 'gang_admin_control_pending', fingerprint = JSON.stringify(body), raw = localStorage.getItem(key)
    const previous = raw ? JSON.parse(raw) : null
    if (previous && previous.fingerprint !== fingerprint) throw new Error('上次管理操作尚未确认，请先重试相同操作')
    const pending = previous || { fingerprint, operationId: crypto.randomUUID() }
    localStorage.setItem(key, JSON.stringify(pending))
    pendingControl.value = body
    try { await request('control', { ...body, operationId: pending.operationId }); localStorage.removeItem(key); pendingControl.value = null }
    catch (err) { if ((err as { status?: number }).status && (err as { status: number }).status < 500) { localStorage.removeItem(key); pendingControl.value = null }; throw err }
    await load()
  } catch (err) { error.value = (err as Error).message } finally { busy.value = false }
}
function confirmed(message: string, body: Record<string, unknown>) { if (confirm(message)) void control(body) }
async function grantCoupon() { await control({ action: 'grant_coupon', title: title.value, desc: desc.value }); if (!error.value) { title.value = ''; desc.value = '' } }
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { void load(); timer = setInterval(() => { if (!busy.value && !document.hidden) void load() }, 10000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
<style scoped>.control { border-radius: .75rem; background: #f1f5f9; padding: .5rem .75rem; font-size: .75rem; font-weight: 700; } .control:disabled { opacity: .4; }</style>
