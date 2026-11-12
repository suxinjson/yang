<template>
  <GameDialog :title="`${couponName || '心愿券'}存折`" dismissible @close="$emit('close')">
    <div class="coupon-tabs" role="tablist" aria-label="心愿券筛选">
      <button v-for="tab in tabs" :key="tab.value" role="tab" :aria-selected="(activeTab || 'all') === tab.value" @click="$emit('filter', tab.value)">{{ tab.label }} <span>{{ tab.count }}</span></button>
    </div>
    <div v-if="error" role="alert" class="dialog-notice">
      {{ error }}
      <button :disabled="busy" class="mt-2 block font-semibold text-rose-800" @click="$emit('retry')">重试未确认操作</button>
    </div>
    <div class="coupon-list">
      <article v-for="coupon in filteredCoupons" :key="coupon.id" class="coupon-item" :class="{ 'coupon-used': coupon.used }">
        <span class="coupon-icon" aria-hidden="true">{{ coupon.icon }}</span>
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-semibold">{{ coupon.title }}</h3>
          <p v-if="coupon.desc" class="mt-1 text-xs leading-relaxed text-stone-500">{{ coupon.desc }}</p>
          <p class="mt-2 text-[10px] text-stone-400">{{ coupon.obtainedAt }}</p>
        </div>
        <span v-if="coupon.used" class="text-[11px] whitespace-nowrap text-stone-400">已兑现</span>
        <button v-else class="redeem-button" :disabled="busy" @click="$emit('redeem', coupon.id)">兑现</button>
      </article>
      <p v-if="!filteredCoupons.length" class="py-12 text-center text-sm text-stone-400">{{ activeTab === 'redeemed' ? '暂无已兑现心愿券' : activeTab === 'unredeemed' ? '暂无待兑现心愿券' : '暂无心愿券' }}</p>
    </div>
  </GameDialog>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import GameDialog from './GameDialog.vue'
import type { LoveCoupon } from '../types/game'
type Tab = 'all' | 'unredeemed' | 'redeemed'
const props = defineProps<{ coupons: LoveCoupon[]; couponName?: string; activeTab?: Tab; error?: string; busy?: boolean }>()
defineEmits<{ (e: 'close'): void; (e: 'redeem', couponId: string): void; (e: 'filter', tab: Tab): void; (e: 'retry'): void }>()
const tabs = computed(() => [
  { value: 'all' as const, label: '全部', count: props.coupons.length },
  { value: 'unredeemed' as const, label: '待兑现', count: props.coupons.filter(c => !c.used).length },
  { value: 'redeemed' as const, label: '已兑现', count: props.coupons.filter(c => c.used).length }
])
const filteredCoupons = computed(() => props.coupons.filter(coupon => props.activeTab === 'unredeemed' ? !coupon.used : props.activeTab === 'redeemed' ? coupon.used : true))
</script>
<style scoped>
.coupon-tabs { display: flex; gap: 4px; margin-bottom: 16px; padding: 4px; background: #f4eeee; border-radius: 12px; }
.coupon-tabs button { flex: 1; padding: 8px 3px; border-radius: 9px; font-size: 11px; color: #8e7c81; }
.coupon-tabs button[aria-selected="true"] { color: #87475b; background: white; box-shadow: 0 2px 5px #4d25330a; }
.coupon-tabs span { margin-left: 2px; font-size: 10px; font-variant-numeric: tabular-nums; }
.coupon-list { min-height: 80px; }
.coupon-item { display: flex; gap: 10px; align-items: center; padding: 18px 0; border-bottom: 1px solid #eee4e5; }
.coupon-item:last-child { border-bottom: 0; }
.coupon-icon { display: grid; place-items: center; width: 36px; height: 42px; flex-shrink: 0; font-size: 24px; }
.coupon-used { opacity: .65; }
.redeem-button { flex-shrink: 0; border: 1px solid #e1bdca; border-radius: 9px; padding: 8px 10px; font-size: 11px; color: #8b4a60; }
</style>
