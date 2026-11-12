<template>
  <div class="props-bar grid w-full grid-cols-2 gap-2">
    <button class="power-button" title="标亮优先可选牌" :disabled="disabled || hintCount <= 0 || !canHint" @click="$emit('hint')">
      <span aria-hidden="true">💡</span><span>透视提示</span><small>剩 {{ hintCount }} 次</small>
    </button>
    <button class="power-button rescue-button" title="暂存最多三张卡槽牌" :disabled="disabled || rescueCount <= 0 || !canRescue" @click="$emit('rescue')">
      <span aria-hidden="true">🦸‍♂️</span><span>{{ couple ? '默契救场' : '应急救场' }}</span><small>剩 {{ rescueCount }} 次</small>
    </button>
  </div>
</template>
<script setup lang="ts">
defineProps<{ hintCount: number; rescueCount: number; canHint: boolean; canRescue: boolean; disabled: boolean; couple: boolean }>()
defineEmits<{ (e: 'hint'): void; (e: 'rescue'): void }>()
</script>
<style scoped>
.power-button { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px; padding: 10px 8px; border: 1px solid #ead8cd; border-radius: 16px; color: #6b5140; background: #fffaf1; font-size: 12px; font-weight: 650; }
.power-button small { font-size: 10px; font-weight: 400; opacity: .7; }
.rescue-button { background: #985267; color: #fff; border-color: #985267; }
.power-button:disabled { opacity: .4; }
</style>
