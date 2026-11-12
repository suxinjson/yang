<template>
  <Teleport to="body">
    <div class="dialog-backdrop">
      <section ref="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" class="game-dialog" @keydown="handleKey">
        <header class="dialog-header">
          <h2 :id="titleId">{{ title }}</h2>
          <button v-if="dismissible" class="dialog-close" aria-label="关闭" @click="$emit('close')">×</button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue'
const props = defineProps<{ title: string; dismissible?: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const titleId = useId(), dialog = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null
onMounted(() => { previousFocus = document.activeElement as HTMLElement; dialog.value?.focus() })
onUnmounted(() => { if (previousFocus?.isConnected) previousFocus.focus() })
function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.dismissible) { event.preventDefault(); emit('close') }
  if (event.key !== 'Tab') return
  const items = [...(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') || [])].filter(item => item.getClientRects().length)
  const first = items[0], last = items.at(-1)
  if (!first) { event.preventDefault(); return }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) { event.preventDefault(); first.focus() }
}
</script>
