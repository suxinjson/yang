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
            <p class="text-[11px] text-rose-500">通关与救场惩罚记录，随时向对方兑现！</p>
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
            :class="activeTab === 'girlfriend_pays' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-amber-700 border border-amber-200'"
            @click="activeTab = 'girlfriend_pays'"
          >
            <span>🧦 女友受罚/付出</span>
            <span class="text-[10px] font-black">({{ gfCount }})</span>
          </button>
          <button
            class="px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1"
            :class="activeTab === 'boyfriend_pays' ? 'bg-sky-500 text-white shadow-xs' : 'bg-white text-sky-700 border border-sky-200'"
            @click="activeTab = 'boyfriend_pays'"
          >
            <span>🧋 男友买单</span>
            <span class="text-[10px] font-black">({{ bfCount }})</span>
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
                : coupon.target === 'girlfriend_pays'
                  ? 'bg-amber-50/50 border-amber-300 shadow-2xs hover:border-amber-400'
                  : 'bg-white border-rose-200 shadow-2xs hover:border-rose-400'
            ]"
          >
            <!-- Target Badge -->
            <div class="absolute top-2 right-2 flex items-center gap-1">
              <span
                class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                :class="coupon.target === 'girlfriend_pays' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-sky-100 text-sky-800 border border-sky-300'"
              >
                {{ coupon.target === 'girlfriend_pays' ? '女友付出/受罚' : '男友兑现' }}
              </span>
            </div>

            <!-- Left Icon & Info -->
            <div class="flex items-start gap-2.5 pr-16">
              <div
                class="text-2xl p-1 rounded-xl border flex-shrink-0"
                :class="coupon.target === 'girlfriend_pays' ? 'bg-amber-100 border-amber-200' : 'bg-rose-50 border-rose-100'"
              >
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
                {{ coupon.used ? '该任务已完成' : '随时出示截图/点击执行' }}
              </span>

              <button
                v-if="!coupon.used"
                class="px-3 py-1 rounded-xl font-bold text-[11px] shadow-sm active:scale-95 transition-all text-white"
                :class="coupon.target === 'girlfriend_pays' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-500 hover:bg-rose-600'"
                @click="$emit('redeem', coupon.id)"
              >
                {{ coupon.target === 'girlfriend_pays' ? '完成此惩罚 ✓' : '向男友兑现 💖' }}
              </button>
            </div>

            <!-- Redeemed Rubber Stamp Overlay -->
            <div
              v-if="coupon.used"
              class="stamp absolute right-3 top-3 border-2 border-red-500 text-red-500 font-black text-xs px-2 py-0.5 rounded rotate-12 uppercase pointer-events-none"
            >
              ✓ 已执行兑现
            </div>
          </div>

          <div v-if="filteredCoupons.length === 0" class="text-center py-8 text-gray-400 text-xs">
            暂无该类任务券，快去闯关抽取吧~
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

const activeTab = ref<'all' | 'girlfriend_pays' | 'boyfriend_pays'>('all')

const gfCount = computed(() => {
  return props.coupons.filter(c => c.target === 'girlfriend_pays').length
})

const bfCount = computed(() => {
  return props.coupons.filter(c => c.target === 'boyfriend_pays').length
})

const filteredCoupons = computed(() => {
  if (activeTab.value === 'all') return props.coupons
  return props.coupons.filter(c => c.target === activeTab.value)
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
