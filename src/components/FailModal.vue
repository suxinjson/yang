<template>
  <GameDialog title="卡槽已满">
    <p class="mb-6 text-sm text-stone-500">{{ capacity }} / {{ capacity }}</p>
    <div class="dialog-actions">
      <button v-if="canRescue" class="game-button" @click="$emit('summon')">救场暂存</button>
      <button class="game-button" :class="{ secondary: canRescue }" @click="$emit('restart')">重新开始本关</button>
    </div>
  </GameDialog>
</template>
<script setup lang="ts">
import GameDialog from './GameDialog.vue'
defineProps<{ capacity: number; canRescue: boolean }>()
defineEmits<{ (e: 'summon'): void; (e: 'restart'): void }>()
</script>
