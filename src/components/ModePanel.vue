<template>
  <section class="mode-panel" data-testid="mode-panel">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-semibold text-stone-600">{{ couple ? '情侣同玩' : '单人闯关' }}</span>
      <button class="mode-toggle" :disabled="busy" :aria-expanded="expanded" @click="expanded = !expanded">{{ expanded ? '收起' : couple ? '房间' : '情侣同玩' }}<span aria-hidden="true" class="ml-1">{{ expanded ? '−' : '+' }}</span></button>
    </div>
    <div v-if="couple && room" class="room-status">
      <strong class="room-code" data-testid="room-code" aria-label="房间密码">{{ room.code }}</strong>
      <span role="status" class="text-[11px]" :class="connection === 'ready' ? 'text-emerald-700' : 'text-amber-700'">{{ connection === 'ready' ? `已连接 ${room.connected}/2 人` : connection === 'connecting' ? '正在连接…' : '连接已断开' }}</span>
    </div>
    <div v-if="expanded" class="mt-3 space-y-2 border-t border-stone-200 pt-3">
      <template v-if="!couple">
        <button class="game-button w-full" :disabled="busy" @click="$emit('create')">创建情侣房间</button>
        <form class="flex gap-2" @submit.prevent="!busy && /^\d{4}$/.test(code) && $emit('join', code)">
          <input v-model="code" aria-label="四位房间密码" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="四位房间密码" class="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-center text-sm tracking-widest" required />
          <button class="game-button secondary" :disabled="busy || !/^\d{4}$/.test(code)">加入房间</button>
        </form>
        <button v-if="hasSavedRoom" class="w-full py-2 text-xs text-rose-800" :disabled="busy" @click="$emit('resume')">回到上次的情侣房间</button>
      </template>
      <template v-else>
        <button v-if="connection !== 'ready'" class="game-button w-full" @click="$emit('reconnect')">立即重连</button>
        <button class="game-button secondary w-full" :disabled="busy" @click="$emit('solo')">回到单人模式</button>
      </template>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RoomInfo } from '../utils/playSession'
const props = defineProps<{ couple: boolean; room: RoomInfo | null; connection: string; busy: boolean; hasSavedRoom: boolean }>()
defineEmits<{ (e: 'create'): void; (e: 'join', code: string): void; (e: 'solo'): void; (e: 'resume'): void; (e: 'reconnect'): void }>()
const expanded = ref(false), code = ref('')
watch(() => props.couple, () => { expanded.value = false })
</script>
<style scoped>
.mode-panel { padding: 8px 2px 12px; }
.mode-toggle { padding: 7px 11px; border: 1px solid #e8dade; border-radius: 10px; color: #8b4e62; background: #fffaf8; font-size: 11px; }
.room-status { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 8px 12px; background: #fffaf8; border: 1px solid #eedee3; border-radius: 12px; }
.room-code { font-size: 20px; letter-spacing: .28em; font-variant-numeric: tabular-nums; color: #7e4559; }
</style>
