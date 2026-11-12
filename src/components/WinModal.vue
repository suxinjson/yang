<template>
  <GameDialog :title="`第 ${level} 关顺利通关！`">
    <div class="win-mark" aria-hidden="true">✦</div>
    <article v-if="rewardCoupon" class="reward-card">
      <span class="text-3xl" aria-hidden="true">{{ rewardCoupon.icon }}</span>
      <div class="min-w-0"><h3 class="text-sm font-semibold">{{ rewardCoupon.title }}</h3><p v-if="rewardCoupon.desc" class="mt-1 text-xs leading-relaxed text-stone-500">{{ rewardCoupon.desc }}</p></div>
    </article>
    <p v-if="rewardUnconfirmed" class="dialog-notice" role="status">{{ rewardPending ? '正在确认奖励…' : rewardError || '奖励未确认，请重试' }}</p>
    <div class="dialog-actions">
      <button v-if="rewardUnconfirmed && !rewardPending" class="game-button secondary" @click="$emit('retry-reward')">重试通关奖励</button>
      <button class="game-button" :disabled="rewardUnconfirmed" @click="hasNextLevel ? $emit('next-level') : $emit('replay-egg')">{{ hasNextLevel ? '进入下一关！' : '再玩一次' }}</button>
      <button class="game-button secondary" @click="$emit('open-coupons')">查看{{ couponName || '心愿券' }}存折</button>
    </div>
  </GameDialog>
</template>
<script setup lang="ts">
import GameDialog from './GameDialog.vue'
import type { LoveCoupon } from '../types/game'
defineProps<{ level: number; rewardCoupon?: LoveCoupon; hasNextLevel: boolean; couponName?: string; rewardUnconfirmed?: boolean; rewardPending?: boolean; rewardError?: string }>()
defineEmits<{ (e: 'next-level'): void; (e: 'replay-egg'): void; (e: 'open-coupons'): void; (e: 'retry-reward'): void }>()
</script>
<style scoped>
.win-mark { margin: 6px auto 18px; color: #c69a45; font-size: 48px; text-align: center; }
.reward-card { display: flex; align-items: center; gap: 14px; padding: 18px 14px; border-block: 1px solid #eee2d5; margin-bottom: 20px; background: #fffbf4; }
</style>
