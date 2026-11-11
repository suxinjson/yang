<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm animate-fade-in">
      <div class="w-full max-w-[340px] bg-gradient-to-b from-amber-50 via-white to-pink-50 rounded-3xl p-5 shadow-2xl border-4 border-amber-300 relative text-center">
        <!-- Crown Icon -->
        <div class="text-5xl -mt-8 mb-2 animate-bounce">
          👑
        </div>

        <div class="inline-block bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-sm mb-2">
          第 {{ level }} 关顺利通关！
        </div>

        <h3 class="text-xl font-black text-gray-800 mb-1">
          {{ winTitle }}
        </h3>

        <p class="text-xs text-rose-500 font-bold mb-4">
          {{ winSubtitle }}
        </p>

        <!-- Prize Card -->
        <div
          v-if="rewardCoupon"
          class="rounded-2xl p-3 border-2 border-dashed text-left mb-4 shadow-sm bg-gradient-to-r from-rose-50 to-pink-50 border-rose-300"
        >
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
              <span class="text-2xl">{{ rewardCoupon.icon }}</span>
              <div>
                <div class="text-xs font-black text-rose-950">
                  {{ rewardCoupon.title }}
                </div>
                <div class="text-[9px] text-gray-500">已存入心愿存折</div>
              </div>
            </div>
            <span class="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-900">
              🎁 {{ couponName || '专属心愿券' }}
            </span>
          </div>
          <p class="text-[11px] leading-tight text-rose-800 font-medium">
            {{ rewardCoupon.desc }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2">
          <button
            v-if="hasNextLevel"
            class="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm shadow-md shadow-pink-200 active:scale-95 transition-all"
            @click="$emit('next-level')"
          >
            进入下一关！ 🚀
          </button>

          <button
            v-else
            class="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-sm shadow-md active:scale-95 transition-all"
            @click="$emit('replay-egg')"
          >
            再玩一次 ♥
          </button>

          <button
            class="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
            @click="$emit('open-coupons')"
          >
            查看{{ couponName || '心愿' }}存折 🎁
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoveCoupon } from '../types/game'

const props = defineProps<{
  level: number
  rewardCoupon?: LoveCoupon
  hasNextLevel: boolean
  couponName?: string
}>()

defineEmits<{
  (e: 'next-level'): void
  (e: 'replay-egg'): void
  (e: 'open-coupons'): void
}>()

const winTitle = computed(() => {
  if (props.level === 1) return '第一关顺利通过！'
  if (props.level === 2) return '第二关通关！太厉害了！'
  return '大圆满通关！🎉'
})

const winSubtitle = computed(() => {
  if (props.level === 1) return '我就知道这点难不倒你~'
  if (props.level === 2) return '超强大脑！手速和策略拉满！'
  return '所有爱意都已送达，未来的每一天都有我陪你~'
})
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
