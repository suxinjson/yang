<template>
  <div class="space-y-4" data-testid="game-settings">
    <h2 class="panel-title">关卡与布局</h2>

    <!-- 1. 棋盘与卡片尺寸 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 shadow-xs">
      <h3 class="text-sm font-semibold text-slate-800">棋盘与卡片</h3>
      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1 font-bold">棋盘宽度
          <input v-model.number="draft.boardWidth" aria-label="棋盘宽度" type="number" min="360" max="480" step="10" class="config-input" />
        </label>
        <label class="space-y-1 font-bold">棋盘高度
          <input v-model.number="draft.boardHeight" aria-label="棋盘高度" type="number" min="420" max="640" step="10" class="config-input" />
        </label>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1 font-bold">卡片宽度
          <input v-model.number="draft.cardWidth" aria-label="卡片宽度" type="number" min="48" max="80" step="2" class="config-input" />
        </label>
        <label class="space-y-1 font-bold">卡片高度
          <input v-model.number="draft.cardHeight" aria-label="卡片高度" type="number" min="56" max="96" step="2" class="config-input" />
        </label>
      </div>
    </div>

    <!-- 2. 卡槽数量与解锁机制 -->
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3 shadow-xs">
      <h5 class="text-xs font-black text-slate-800 flex items-center justify-between">
        <span>卡槽</span>
      </h5>
      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1 font-bold text-xs">初始卡槽数
          <input v-model.number="draft.initialSlots" aria-label="初始卡槽数" type="number" min="4" max="8" step="1" class="config-input" />
        </label>
        <label class="space-y-1 font-bold text-xs">最大可解锁槽数
          <input v-model.number="draft.maxSlots" aria-label="最大卡槽数" type="number" :min="draft.initialSlots || 4" max="8" step="1" class="config-input" />
        </label>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1 font-bold text-xs">卡槽解锁条件
          <select v-model="draft.slotUnlockCondition" aria-label="卡槽解锁条件" class="config-input">
            <option value="match_count">消除指定组数</option>
            <option value="love_coupon">消耗一张心愿券</option>
            <option value="boyfriend_rescue">使用救场</option>
            <option value="urgent_click">仅剩一格时点击</option>
            <option value="free_click">随时点击</option>
          </select>
        </label>
        <label v-if="draft.slotUnlockCondition === 'match_count'" class="space-y-1 font-bold text-xs">消除目标组数
          <input v-model.number="draft.slotUnlockMatchCount" aria-label="消除解锁目标" type="number" min="1" max="10" step="1" class="config-input" />
        </label>
      </div>
    </div>

    <!-- 3. 关卡总数与增减 -->
    <div class="flex items-center justify-between px-1">
      <span class="text-sm font-semibold">关卡 · {{ draft.levels.length }}</span>
      <div class="flex gap-2">
        <button
          type="button"
          v-if="draft.levels.length < 5"
          class="text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-100 text-pink-800 border border-pink-300 hover:bg-pink-200"
          @click="addLevel"
        >
          增加关卡
        </button>
        <button
          type="button"
          v-if="draft.levels.length > 1"
          class="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
          @click="removeLevel"
        >
          减少关卡
        </button>
      </div>
    </div>

    <!-- 4. 各关卡详细设置 -->
    <fieldset v-for="(level, index) in draft.levels" :key="index" class="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
      <legend class="px-1 font-black text-slate-800">第 {{ index + 1 }} 关</legend>

      <!-- 通关完成可能性配置 -->
      <div class="rounded-xl border border-slate-200 bg-white p-2.5">
        <label class="flex items-center justify-between font-bold text-xs gap-2">
          <span>难度</span>
          <select v-model="level.solvability" :aria-label="`第${index + 1}关通关可能性`" class="config-input max-w-44 text-xs font-bold">
            <option value="guaranteed">保底可解</option>
            <option value="normal">自然随机</option>
            <option value="hard">高压挑战</option>
            <option value="impossible">不可通关</option>
          </select>
        </label>
        <p class="text-[10px] text-gray-500 mt-1 leading-tight">
          <span v-if="level.solvability === 'impossible'" class="text-red-600 font-bold">
            至少两种牌型时生成无法消除的牌。
          </span>
          <span v-else-if="level.solvability === 'hard'" class="text-orange-600 font-bold">
            增加卡槽占用，保留可解路径。
          </span>
          <span v-else-if="level.solvability === 'normal'">
            不保证存在无需道具的通关路径。
          </span>
          <span v-else>
            初始 {{ draft.initialSlots || 7 }} 格内存在无需道具的通关路径。
          </span>
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label v-for="field in numericFields" :key="field.key" class="space-y-1 font-bold">
          {{ field.label }}
          <input v-model.number="level[field.key]" :aria-label="`第${index + 1}关${field.label}`" type="number" :min="field.min" :max="field.max" :step="field.step" class="config-input" />
        </label>
      </div>
      <label class="flex items-center justify-between font-bold gap-2">摆放造型
        <select v-model="level.layout" :aria-label="`第${index + 1}关摆放造型`" class="config-input max-w-40">
          <option value="scatter">随机铺开</option>
          <option value="heart">爱心层叠</option>
        </select>
      </label>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        布局容量 {{ capacities[index] }} 张
      </p>
    </fieldset>

    <p v-if="adjusted" role="status" class="text-[11px] text-amber-700">已按允许范围和布局容量修正参数，请核对当前数值。</p>
    <div class="flex gap-2">
      <button class="flex-1 rounded-xl bg-slate-900 text-white py-2.5 font-black disabled:opacity-50" :disabled="busy" @click="save">保存关卡配置</button>
      <button class="rounded-xl bg-gray-100 px-3 py-2.5 font-bold" :disabled="busy" @click="draft = defaultGameSettings(); adjusted = false">恢复默认参数</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { GameSettings, LevelSettings } from '../types/game'
import { defaultGameSettings, normalizeGameSettings, layoutGrid } from '../../shared/gameConfig.js'

const props = defineProps<{ settings: GameSettings; busy: boolean }>()
const emit = defineEmits<{ (e: 'save', settings: GameSettings): void }>()
const draft = ref<GameSettings>(normalizeGameSettings(props.settings))
const adjusted = ref(false)
const numericFields: { key: Exclude<keyof LevelSettings, 'layout' | 'solvability'>; label: string; min: number; max: number; step: number }[] = [
  { key: 'minCards', label: '最少张数', min: 6, max: 240, step: 3 },
  { key: 'maxCards', label: '最多张数', min: 6, max: 240, step: 3 },
  { key: 'types', label: '牌型数量', min: 1, max: 12, step: 1 },
  { key: 'layers', label: '层叠数量', min: 1, max: 8, step: 1 },
  { key: 'spreadX', label: '横向范围(%)', min: 60, max: 100, step: 5 },
  { key: 'spreadY', label: '纵向范围(%)', min: 60, max: 100, step: 5 },
  { key: 'randomness', label: '随机扰动(%)', min: 0, max: 100, step: 5 }
]
const capacities = computed(() => {
  const safe = normalizeGameSettings(draft.value)
  return safe.levels.map(level => Math.min(240, Math.floor(layoutGrid(safe, level).capacity * level.layers / 3) * 3))
})
watch(() => props.settings, value => { draft.value = normalizeGameSettings(value) })

function addLevel() {
  if (draft.value.levels.length >= 5) return
  const last = draft.value.levels[draft.value.levels.length - 1]
  draft.value.levels.push({
    minCards: Math.min(240, (last?.minCards || 90) + 12),
    maxCards: Math.min(240, (last?.maxCards || 108) + 18),
    types: Math.min(12, (last?.types || 7) + 1),
    layers: Math.min(8, (last?.layers || 4) + 1),
    spreadX: last?.spreadX || 100,
    spreadY: last?.spreadY || 100,
    randomness: last?.randomness || 80,
    layout: 'scatter',
    solvability: 'guaranteed'
  })
  draft.value.totalLevels = draft.value.levels.length
}

function removeLevel() {
  if (draft.value.levels.length <= 1) return
  draft.value.levels.pop()
  draft.value.totalLevels = draft.value.levels.length
}

function prepareSettings() {
  const normalized = normalizeGameSettings(draft.value)
  adjusted.value = JSON.stringify(draft.value) !== JSON.stringify(normalized)
  draft.value = normalized
  return normalized
}

function save() { emit('save', prepareSettings()) }
defineExpose({ prepareSettings, hasChanges: () => JSON.stringify(normalizeGameSettings(draft.value)) !== JSON.stringify(normalizeGameSettings(props.settings)) })
</script>

<style scoped>
.config-input {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 7px 9px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  background: white;
  font-weight: 500;
}
</style>
