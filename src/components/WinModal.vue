<template>
  <GameDialog :title="`第 ${level} 关顺利通关！`">
    <div class="win-mark" aria-hidden="true">✦</div>
    <article v-if="rewardCoupon" class="reward-card">
      <span class="text-3xl" aria-hidden="true">{{ rewardCoupon.icon }}</span>
      <div class="min-w-0"><h3 class="text-sm font-semibold">{{ rewardCoupon.title }}</h3><p v-if="rewardCoupon.desc" class="mt-1 text-xs leading-relaxed text-stone-500">{{ rewardCoupon.desc }}</p></div>
    </article>
    <article v-for="reward in rewards" :key="reward.itemId" class="reward-card"><span class="text-2xl">{{ reward.itemId === 'gang.hint' ? '👁️' : '💪' }}</span><p class="text-sm">{{ reward.itemId === 'gang.hint' ? '透视卡' : '召唤男友卡' }} × {{ reward.quantity }}，已放入背包</p></article>
    <p v-if="!rewardUnconfirmed && !rewardCoupon && !rewards?.length" class="mb-4 text-center text-xs text-stone-500">本次没有抽中奖励，继续挑战吧。</p>
    <p v-if="rewardUnconfirmed" class="dialog-notice" role="status">{{ rewardPending ? '正在确认奖励…' : rewardError || '奖励未确认，请重试' }}</p>
    <div class="dialog-actions">
      <button v-if="rewardUnconfirmed && !rewardPending" class="game-button secondary" @click="$emit('retry-reward')">重试通关奖励</button>
      <button class="game-button" :disabled="rewardUnconfirmed" @click="hasNextLevel ? $emit('next-level') : $emit('replay-egg')">{{ hasNextLevel ? '进入下一关！' : '再玩一次' }}</button>
      <button class="game-button secondary" @click="$emit('return-home')">🏡 返回温馨小家</button>
      <button class="game-button secondary" @click="$emit('open-coupons')">查看我的背包</button>
    </div>
  </GameDialog>
</template>
<script setup lang="ts">
import GameDialog from './GameDialog.vue'
import type { LoveCoupon } from '../types/game'
defineProps<{ level: number; rewards?: { itemId: string; quantity: number }[]; rewardCoupon?: LoveCoupon; hasNextLevel: boolean; couponName?: string; rewardUnconfirmed?: boolean; rewardPending?: boolean; rewardError?: string }>()
defineEmits<{ (e: 'next-level'): void; (e: 'replay-egg'): void; (e: 'open-coupons'): void; (e: 'retry-reward'): void; (e: 'return-home'): void }>()
</script>
<style scoped>
.win-mark { margin: 6px auto 18px; color: #c69a45; font-size: 48px; text-align: center; }
.reward-card { display: flex; align-items: center; gap: 14px; padding: 18px 14px; border-block: 1px solid #eee2d5; margin-bottom: 20px; background: #fffbf4; }
</style>
