<template>
  <div class="props-bar w-full max-w-[420px] mx-auto px-3 mt-3 flex items-center justify-between gap-2 select-none">
    <!-- 1. 移出 (铁了心救你) -->
    <button
      class="prop-btn flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/95 border-2 border-pink-200 shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
      :disabled="moveOutCount <= 0 || slotCount === 0"
      @click="$emit('use-move-out')"
    >
      <div class="text-xl mb-0.5">🔩</div>
      <div class="text-[11px] font-bold text-gray-800">移出3张</div>
      <div class="text-[9px] font-medium text-pink-500">剩余 {{ moveOutCount }} 次</div>
    </button>

    <!-- 2. 撤回 (钢了心后悔) -->
    <button
      class="prop-btn flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/95 border-2 border-sky-200 shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
      :disabled="undoCount <= 0 || slotCount === 0"
      @click="$emit('use-undo')"
    >
      <div class="text-xl mb-0.5">🛡️</div>
      <div class="text-[11px] font-bold text-gray-800">后悔撤回</div>
      <div class="text-[9px] font-medium text-sky-500">剩余 {{ undoCount }} 次</div>
    </button>

    <!-- 3. 洗牌 (魔力打乱) -->
    <button
      class="prop-btn flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
      :disabled="shuffleCount <= 0"
      @click="$emit('use-shuffle')"
    >
      <div class="text-xl mb-0.5">🔀</div>
      <div class="text-[11px] font-bold text-gray-800">洗牌重组</div>
      <div class="text-[9px] font-medium text-amber-500">剩余 {{ shuffleCount }} 次</div>
    </button>

    <!-- 4. 终极外援：召唤男朋友 (超醒目超级大招) -->
    <button
      class="prop-btn rescue-btn flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-pink-200 border-2 border-rose-300 active:scale-95 transition-all relative overflow-hidden"
      :class="{ 'animate-bounce shadow-rose-400 shadow-lg': isUrgent }"
      @click="$emit('summon-boyfriend')"
    >
      <div class="absolute -top-1 -right-1 bg-yellow-400 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">
        必杀
      </div>
      <div class="text-xl mb-0.5 animate-pulse">🦸‍♂️❤️</div>
      <div class="text-[11px] font-black text-white tracking-tight">召唤男友</div>
      <div class="text-[9px] font-bold text-yellow-200">一键解围</div>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  moveOutCount: number
  undoCount: number
  shuffleCount: number
  slotCount: number
  isUrgent: boolean
}>()

defineEmits<{
  (e: 'use-move-out'): void
  (e: 'use-undo'): void
  (e: 'use-shuffle'): void
  (e: 'summon-boyfriend'): void
}>()
</script>

<style scoped>
.prop-btn {
  touch-action: manipulation;
}

.rescue-btn {
  background: linear-gradient(135deg, #FF416C, #FF4B2B);
}
</style>
