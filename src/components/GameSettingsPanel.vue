<template>
  <div class="space-y-4" data-testid="game-settings">
    <div class="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-950">
      <h4 class="font-black text-sm">棋盘与关卡配置</h4>
      <p class="mt-1 text-[11px] leading-relaxed">保存后在下一关或重新开始时应用，当前牌局保持原布局。所有牌数按 3 的倍数生成，开局保留可通关路径。</p>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <label class="space-y-1 font-bold">棋盘宽度
        <input v-model.number="draft.boardWidth" aria-label="棋盘宽度" type="number" min="360" max="480" step="10" class="config-input" />
        <span class="block text-[10px] text-gray-500 font-normal">360–480，按屏幕宽度缩放</span>
      </label>
      <label class="space-y-1 font-bold">棋盘高度
        <input v-model.number="draft.boardHeight" aria-label="棋盘高度" type="number" min="420" max="640" step="10" class="config-input" />
        <span class="block text-[10px] text-gray-500 font-normal">420–640，随宽度等比缩放</span>
      </label>
    </div>
    <fieldset v-for="(level, index) in draft.levels" :key="index" class="rounded-2xl border border-pink-200 bg-pink-50/40 p-3 space-y-3">
      <legend class="px-1 font-black text-rose-900">第 {{ index + 1 }} 关</legend>
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
        当前范围最多容纳 {{ capacities[index] }} 张；牌型不超过现有种类。随机扰动控制位置偏移，0 为整齐排列，100 为最大偏移。每局的牌面、空隙与数量仍会随机。
      </p>
    </fieldset>
    <p class="text-[11px] text-gray-500 leading-relaxed">最少 / 最多张数：6–240；牌型：1–12；层数：1–8；横向 / 纵向范围：60–100%。保存时自动修正非三倍数、颠倒区间和超过布局容量的牌数。</p>
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
const numericFields: { key: Exclude<keyof LevelSettings, 'layout'>; label: string; min: number; max: number; step: number }[] = [
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

function prepareSettings() {
  const normalized = normalizeGameSettings(draft.value)
  adjusted.value = JSON.stringify(draft.value) !== JSON.stringify(normalized)
  draft.value = normalized
  return normalized
}

function save() { emit('save', prepareSettings()) }
defineExpose({ prepareSettings })
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
