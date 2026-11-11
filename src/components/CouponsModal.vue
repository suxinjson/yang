<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-gray-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div class="w-full max-w-[390px] max-h-[88vh] bg-gradient-to-b from-rose-50 to-white rounded-3xl p-5 shadow-2xl border-4 border-rose-300 flex flex-col relative text-gray-800">
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-rose-200">
          <div>
            <h3 class="text-base font-black text-rose-800 flex items-center gap-1.5">
              <span>🎁</span>
              <span>情侣心愿存折</span>
            </h3>
            <p class="text-[11px] text-rose-500">通关与救场记录的心愿互动，随时向对方出示兑现！</p>
          </div>
          <button
            class="w-7 h-7 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold flex items-center justify-center text-xs"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-1 pt-2 pb-1 text-xs">
          <button
            class="px-2.5 py-1 rounded-xl font-bold transition-all"
            :class="activeTab === 'all' ? 'bg-rose-500 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200'"
            @click="activeTab = 'all'"
          >
            全部 ({{ coupons.length }})
          </button>
          <button
            class="px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1"
            :class="activeTab === 'unredeemed' ? 'bg-rose-500 text-white shadow-xs' : 'bg-white text-rose-700 border border-rose-200'"
            @click="activeTab = 'unredeemed'"
          >
            <span>待兑现</span>
            <span class="text-[10px] font-black">({{ unredeemedCount }})</span>
          </button>
          <button
            class="px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1"
            :class="activeTab === 'redeemed' ? 'bg-gray-500 text-white shadow-xs' : 'bg-white text-gray-600 border border-gray-200'"
            @click="activeTab = 'redeemed'"
          >
            <span>已兑现</span>
            <span class="text-[10px] font-black">({{ redeemedCount }})</span>
          </button>
        </div>

        <!-- Coupons List -->
        <div class="flex-1 overflow-y-auto py-2 space-y-2.5 pr-1">
          <div
            v-for="coupon in filteredCoupons"
            :key="coupon.id"
            class="relative p-3 rounded-2xl border-2 transition-all overflow-hidden"
            :class="[
              coupon.used
                ? 'bg-gray-100/80 border-gray-300 opacity-60'
                : 'bg-white border-rose-200 shadow-2xs hover:border-rose-400'
            ]"
          >
            <!-- Unified Badge -->
            <div class="absolute top-2 right-2 flex items-center gap-1">
              <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                🎁 专属心愿券
              </span>
            </div>

            <!-- Left Icon & Info -->
            <div class="flex items-start gap-2.5 pr-16">
              <div class="text-2xl p-1 rounded-xl border flex-shrink-0 bg-rose-50 border-rose-100">
                {{ coupon.icon }}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-black text-gray-800">{{ coupon.title }}</span>
                </div>
                <p class="text-[11px] text-gray-600 mt-1 leading-snug">
                  {{ coupon.desc }}
                </p>
                <div class="text-[9px] text-gray-400 mt-1">
                  来源：{{ coupon.obtainedAt }}
                </div>
              </div>
            </div>

            <!-- Bottom Action -->
            <div class="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
              <span class="text-[10px] text-gray-400">
                {{ coupon.used ? '该心愿已兑现' : '随时出示向对方兑现' }}
              </span>

              <button
                v-if="!coupon.used"
                class="px-3 py-1 rounded-xl font-bold text-[11px] shadow-sm active:scale-95 transition-all text-white bg-rose-500 hover:bg-rose-600"
                @click="$emit('redeem', coupon.id)"
              >
                点击兑现 ✨
              </button>
            </div>

            <!-- Redeemed Rubber Stamp Overlay -->
            <div
              v-if="coupon.used"
              class="stamp absolute right-3 top-3 border-2 border-red-500 text-red-500 font-black text-xs px-2 py-0.5 rounded rotate-12 uppercase pointer-events-none"
            >
              ✓ 已兑现
            </div>
          </div>

          <div v-if="filteredCoupons.length === 0" class="text-center py-8 text-gray-400 text-xs">
            暂无心愿券，快去闯关抽取吧~
          </div>
        </div>

        <!-- Close Button -->
        <div class="pt-2.5 border-t border-rose-200">
          <button
            class="w-full py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs shadow-md active:scale-95"
            @click="$emit('close')"
          >
            返回游戏继续积累 ✨
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoveCoupon } from '../types/game'

const props = defineProps<{
  coupons: LoveCoupon[]
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'redeem', couponId: string): void
}>()

const activeTab = ref<'all' | 'unredeemed' | 'redeemed'>('all')

const unredeemedCount = computed(() => {
  return props.coupons.filter(c => !c.used).length
})

const redeemedCount = computed(() => {
  return props.coupons.filter(c => c.used).length
})

const filteredCoupons = computed(() => {
  if (activeTab.value === 'unredeemed') return props.coupons.filter(c => !c.used)
  if (activeTab.value === 'redeemed') return props.coupons.filter(c => c.used)
  return props.coupons
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

.stamp {
  box-shadow: 0 0 0 2px #ef4444;
  letter-spacing: 1px;
}
</style>
