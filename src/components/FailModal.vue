<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm animate-fade-in">
      <div class="w-full max-w-[320px] bg-white rounded-3xl p-5 shadow-2xl border-4 border-rose-300 relative text-center">
        <div class="text-4xl -mt-6 mb-2">
          🥺💔
        </div>

        <h3 class="text-lg font-black text-gray-800 mb-1">
          差一点点就消掉啦！
        </h3>

        <p class="text-xs text-rose-500 font-bold mb-4">
          卡槽满 7 张啦，但没关系，你的男友随时待命！
        </p>

        <div class="flex flex-col gap-2.5">
          <!-- Call BF -->
          <button
            class="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm shadow-md shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            @click="$emit('summon')"
          >
            <span>🦸‍♂️ 召唤超帅男友移出3张牌</span>
          </button>

          <!-- Retry -->
          <button
            class="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
            @click="$emit('restart')"
          >
            🔄 不服气！重新开始这关
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'summon'): void
  (e: 'restart'): void
}>()
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
