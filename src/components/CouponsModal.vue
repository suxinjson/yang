<template>
  <GameDialog title="我的背包" dismissible @close="$emit('close')">
    <div class="mb-5 space-y-3" aria-label="背包道具">
      <h3 class="text-sm font-semibold">游戏道具</h3>
      <div v-for="item in items" :key="item.itemId" class="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-sm"><span>{{ item.icon }} {{ item.name }}</span><strong>× {{ item.quantity }}</strong></div>
      <p v-if="!items?.length" class="text-xs text-stone-500">暂无游戏道具，通关有机会获得。</p>
      <p class="text-xs text-stone-500">各游戏共用此背包，道具不会随关卡重置。</p>
      <h3 class="pt-2 text-sm font-semibold">{{ couponName || '心愿券' }}</h3>
    </div>
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
          <p class="mt-2 text-[10px] text-stone-400">{{ coupon.obtainedAt }} · {{ coupon.ownerId ? '个人心愿券' : '旧版共享券' }}</p>
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
import type { BackpackItem } from '../utils/backpack'
import type { LoveCoupon } from '../types/game'
type Tab = 'all' | 'unredeemed' | 'redeemed'
const props = defineProps<{ items?: BackpackItem[]; coupons: LoveCoupon[]; couponName?: string; activeTab?: Tab; error?: string; busy?: boolean }>()
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
