<template>
  <section class="slot-container w-full" aria-label="卡槽与暂存区">
    <div v-if="stagedCards.length" class="staged-area">
      <span class="text-xs text-amber-800">暂存</span>
      <div class="flex gap-2">
        <button v-for="card in stagedCards" :key="card.id" class="staged-card" title="点击移回卡槽" :aria-label="`放回${getDef(card.type)?.name || '卡牌'}`" @click="$emit('return-staged', card)">
          <CardComponent :card="card" :def="getDef(card.type)" :text-mode="textMode" />
        </button>
      </div>
    </div>
    <div class="main-tray" :class="{ 'tray-full': slotCards.length >= effectiveUnlockedSlots - 1 }">
      <div class="tray-grid" :style="{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }">
        <button v-for="i in totalSlots" :key="i" class="empty-slot" :class="{ 'locked-slot': i > effectiveUnlockedSlots }"
          :disabled="i <= effectiveUnlockedSlots" :title="i > effectiveUnlockedSlots ? '点击查看卡槽解锁条件' : `卡槽 ${i}`" @click="$emit('unlock-slot', i)">
          <template v-if="i > effectiveUnlockedSlots"><span aria-hidden="true">🔒</span><span class="lock-label">{{ conditionBadgeText }}</span></template>
        </button>
        <div class="tray-cards" :style="{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }">
          <div v-for="card in slotCards" :key="card.id" class="flex min-w-0 items-center justify-center">
            <CardComponent :card="card" :def="getDef(card.type)" :text-mode="textMode" :is-eliminating="eliminatingIds.includes(card.id)" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CardComponent from './Card.vue'
import type { CardItem, CardDefinition, CardTextMode, SlotUnlockConditionType } from '../types/game'
const props = withDefaults(defineProps<{
  slotCards: CardItem[]; stagedCards: CardItem[]; cardDefs: CardDefinition[]; eliminatingIds: number[]
  unlockedSlots?: number; maxSlots?: number; unlockCondition?: SlotUnlockConditionType
  unlockProgress?: { current: number; required: number }; textMode?: CardTextMode
}>(), { unlockedSlots: 7, maxSlots: 8, unlockCondition: 'match_count', textMode: 'name' })
defineEmits<{ (e: 'return-staged', card: CardItem): void; (e: 'unlock-slot', slotIndex: number): void }>()
const effectiveUnlockedSlots = computed(() => Math.max(4, Math.min(8, props.unlockedSlots)))
const totalSlots = computed(() => Math.max(effectiveUnlockedSlots.value, Math.min(8, props.maxSlots)))
const definitions = computed(() => new Map(props.cardDefs.map(def => [def.id, def])))
const getDef = (type: string) => definitions.value.get(type)
const conditionBadgeText = computed(() => ({
  match_count: props.unlockProgress ? `${props.unlockProgress.current}/${props.unlockProgress.required}组` : '消除',
  love_coupon: '心愿券', boyfriend_rescue: '救场', urgent_click: '告急', free_click: '解锁'
})[props.unlockCondition])
</script>

<style scoped>
.main-tray { border: 1px solid #ecd8de; border-radius: 20px; background: #fffaf8; padding: 10px; box-shadow: 0 6px 24px #6b384a0a; }
.tray-full { border-color: #e5999c; background: #fff0ee; }
.tray-grid, .tray-cards { display: grid; gap: 5px; }
.tray-grid { position: relative; }
.empty-slot { height: 58px; min-width: 0; border: 1px solid #eedfe2; border-radius: 10px; background: #f7edef; }
.locked-slot { color: #967653; border-style: dashed; background: #fbf3e5; font-size: 12px; }
.lock-label { display: block; font-size: 8px; line-height: 1.2; padding-top: 3px; }
.tray-cards { position: absolute; inset: 0; pointer-events: none; }
.staged-area { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; padding: 10px 12px; border: 1px solid #eedbb9; border-radius: 16px; background: #fff8eb; }
.staged-card { width: 45px; padding: 0; border-radius: 10px; }
</style>
