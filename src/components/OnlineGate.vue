<template>
  <div data-online-gate class="min-h-svh w-full flex items-center justify-center bg-rose-50 px-6 text-center">
    <div class="max-w-sm rounded-3xl bg-white p-7 shadow-lg border border-rose-200">
      <div class="text-4xl mb-4">{{ onlineState === 'connecting' ? '🔄' : '📡' }}</div>
      <h1 class="text-xl font-black text-rose-800">{{ onlineState === 'connecting' ? '正在连接' : '需要保持在线' }}</h1>
      <p role="status" class="my-4 text-sm text-gray-600">{{ onlineMessage }}</p>
      <p class="text-xs text-gray-500 mb-5">本应用需全程联网。使用过程与应用内操作会记录到服务器，供管理员查看。</p>
      <button v-if="onlineState !== 'connecting'" class="w-full rounded-xl bg-rose-500 py-3 font-bold text-white" @click="$emit('retry')">重新连接</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onlineState, onlineMessage } from '../utils/clientSession'
defineEmits<{ (event: 'retry'): void }>()
</script>
