<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-950/75 backdrop-blur-sm animate-fade-in font-sans">
      <div class="w-full max-w-[340px] bg-gradient-to-b from-rose-50 via-white to-pink-50 rounded-3xl p-5 shadow-2xl border-4 border-rose-300 relative text-center transform scale-100 transition-all">
        <!-- Top Floating Badge -->
        <div class="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs px-4 py-1.5 rounded-full shadow-md flex items-center gap-1 border-2 border-white">
          <span>🦸‍♂️</span>
          <span>超帅男友来救场啦！</span>
        </div>

        <!-- Boyfriend Avatar / Photo -->
        <div class="w-24 h-24 mx-auto mt-3 mb-2.5 rounded-full border-4 border-rose-400 p-1 bg-white shadow-lg overflow-hidden relative group">
          <template v-if="customPhoto">
            <img :src="customPhoto" alt="男友帅照" class="w-full h-full object-cover rounded-full" />
          </template>
          <template v-else>
            <div class="w-full h-full rounded-full bg-rose-100 flex items-center justify-center text-4xl">
              🕶️
            </div>
          </template>
          <div class="absolute bottom-0 right-0 bg-yellow-400 rounded-full p-1 text-xs">
            💖
          </div>
        </div>

        <!-- Sweet Dialog -->
        <h3 class="text-base font-black text-gray-800 mb-0.5">
          “别慌，有超帅男友在！”
        </h3>
        
        <p class="text-[11px] text-rose-500 font-bold mb-2.5">
          —— 铁了心爱你 · 钢了心宠你 ——
        </p>

        <!-- Rescue Effect -->
        <div class="bg-white/90 rounded-2xl p-2.5 text-left mb-2.5 border border-rose-200 text-xs text-gray-700 shadow-2xs">
          <p class="flex items-center gap-1.5 font-bold text-gray-800 text-[11px]">
            <span class="text-rose-500">✨</span>
            <span>已施展魔力，移走 3 张难缠卡牌！</span>
          </p>
        </div>

        <!-- Penalty / Cost Condition -->
        <div v-if="penaltyCoupon" class="bg-amber-50 rounded-2xl p-3 text-left mb-4 border-2 border-dashed border-amber-300">
          <div class="flex items-center gap-1.5 mb-1 text-[11px] font-black text-amber-900">
            <span>{{ penaltyCoupon.icon }}</span>
            <span>救场代价契约：{{ penaltyCoupon.title }}</span>
          </div>
          <p class="text-[11px] text-amber-800 leading-snug">
            {{ penaltyCoupon.desc }}
          </p>
          <div class="text-[9px] text-amber-600 mt-1 font-medium">
            💡 已自动写入你的心愿存折，待会儿记得向男友兑现哦~
          </div>
        </div>

        <!-- Accept Button -->
        <button
          class="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-sm shadow-lg shadow-rose-300 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          @click="$emit('close')"
        >
          <span>接受契约！谢谢超帅男友~</span>
          <span>🚀</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { LoveCoupon } from '../types/game'

defineProps<{
  customPhoto?: string
  penaltyCoupon?: LoveCoupon
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
