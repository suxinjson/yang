<template>
  <div class="slot-container w-full max-w-[420px] mx-auto px-3">
    <!-- Staged / Holding Area (Created by "移出" power-up) -->
    <div
      v-if="stagedCards.length > 0"
      class="staged-area mb-2.5 p-2 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-sm flex items-center justify-between"
    >
      <div class="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <div
          v-for="c in stagedCards"
          :key="c.id"
          class="cursor-pointer transform hover:scale-105 active:scale-95 transition-transform"
          @click="$emit('return-staged', c)"
          title="点击移回卡槽"
        >
          <CardComponent
            :card="c"
            :def="getDef(c.type)"
          />
        </div>
      </div>
      <div class="text-[11px] font-bold text-amber-700 bg-amber-200/80 px-2 py-1 rounded-full whitespace-nowrap ml-2">
        暂存区 (点卡移回)
      </div>
    </div>

    <!-- Main 7 Slots Tray -->
    <div
      class="main-tray relative rounded-2xl p-2.5 transition-all duration-300"
      :class="[
        slotCards.length >= 6 ? 'bg-rose-100/95 border-2 border-rose-400 shadow-rose-200 shadow-lg animate-pulse' : 'bg-white/90 border-2 border-pink-200 shadow-md'
      ]"
    >
      <!-- Tray Header / Status Indicator -->
      <div class="flex justify-between items-center px-1 mb-1.5 text-[11px] font-medium">
        <span class="text-gray-500 flex items-center gap-1">
          <span class="inline-block w-2 h-2 rounded-full" :class="slotCards.length >= 6 ? 'bg-red-500 animate-ping' : 'bg-emerald-400'"></span>
          卡槽容量: <strong :class="slotCards.length >= 6 ? 'text-red-600 font-bold' : 'text-gray-700'">{{ slotCards.length }} / 7</strong>
        </span>
        <span v-if="slotCards.length >= 6" class="text-red-500 font-bold tracking-tight animate-bounce">
          ⚠️ 即将满槽！呼叫男友救场！
        </span>
        <span v-else class="text-pink-500">
          凑齐 3 个相同自动消除
        </span>
      </div>

      <!-- 7 Slot Grid Boxes -->
      <div class="relative grid grid-cols-7 gap-1.5 h-[62px] items-center">
        <!-- 7 background empty slots -->
        <div
          v-for="i in 7"
          :key="'empty-' + i"
          class="empty-slot w-full h-[58px] rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 flex items-center justify-center"
        >
          <span class="text-pink-200 text-xs font-bold">{{ i }}</span>
        </div>

        <!-- Render Actual Cards in Slots with 1:1 Grid Overlay (严格对齐虚线底槽) -->
        <div class="absolute inset-0 grid grid-cols-7 gap-1.5 items-center pointer-events-none">
          <div
            v-for="c in slotCards"
            :key="c.id"
            class="w-full h-[58px] pointer-events-auto flex items-center justify-center"
          >
            <CardComponent
              :card="c"
              :def="getDef(c.type)"
              :is-eliminating="eliminatingIds.includes(c.id)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CardComponent from './Card.vue'
import type { CardItem, CardDefinition } from '../types/game'

const props = defineProps<{
  slotCards: CardItem[]
  stagedCards: CardItem[]
  cardDefs: CardDefinition[]
  eliminatingIds: number[]
}>()

defineEmits<{
  (e: 'return-staged', card: CardItem): void
}>()

function getDef(type: string): CardDefinition | undefined {
  return props.cardDefs.find(d => d.id === type)
}
</script>

<style scoped>
.main-tray {
  backdrop-filter: blur(8px);
}
</style>
