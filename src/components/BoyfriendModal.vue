<template>
  <GameDialog title="救场成功">
    <div class="rescue-profile">
      <img v-if="customPhoto && !imageFailed" :src="resolveAssetUrl(customPhoto)" :alt="photoName || '男友帅照'" @error="imageFailed = true" />
      <span v-else class="text-5xl" aria-hidden="true">🕶️</span>
    </div>
    <p class="text-center text-base font-semibold" data-testid="rescue-photo-name">{{ photoName || '男友帅照' }}</p>
    <p class="mt-2 mb-6 text-center text-xs text-stone-500">{{ stagedCount }} 张牌已暂存</p>
    <button class="game-button w-full" @click="$emit('close')">{{ couple ? '继续一起闯关' : '继续闯关' }}</button>
  </GameDialog>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import GameDialog from './GameDialog.vue'
import { resolveAssetUrl } from '../utils/api'
defineProps<{ customPhoto?: string; photoName?: string; stagedCount: number; couple: boolean }>()
defineEmits<{ (e: 'close'): void }>()
const imageFailed = ref(false)
</script>
<style scoped>
.rescue-profile { width: 104px; height: 104px; display: grid; place-items: center; border-radius: 28px; overflow: hidden; margin: 8px auto 16px; background: #f5e7ec; }
.rescue-profile img { width: 100%; height: 100%; object-fit: cover; }
</style>
