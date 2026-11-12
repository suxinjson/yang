<template>
  <section class="space-y-5">
    <header class="panel-heading"><h2>{{ title }}</h2><span>{{ items.length }} 项 · {{ ratio }}%</span></header>
    <form class="admin-panel space-y-3" @submit.prevent="add">
      <div class="grid grid-cols-[1fr_64px] gap-3">
        <label class="admin-field">名称<input v-model.trim="draft.title" aria-label="券名称" maxlength="80" required /></label>
        <label class="admin-field">图标<input v-model.trim="draft.icon" aria-label="券图标" maxlength="8" /></label>
      </div>
      <label class="admin-field">说明<textarea v-model.trim="draft.desc" aria-label="券说明" maxlength="500" rows="2"></textarea></label>
      <button class="admin-primary" :disabled="busy">添加</button>
    </form>
    <div class="divide-y divide-slate-100">
      <article v-for="item in items" :key="item.id" class="flex items-center gap-3 py-4">
        <span class="text-2xl" aria-hidden="true">{{ item.icon }}</span>
        <div class="min-w-0 flex-1 space-y-1">
          <input :value="item.title" :aria-label="`${item.title}名称`" :disabled="busy" maxlength="80" class="pool-title" @change="edit(item.id, 'title', $event)" />
          <textarea :value="item.desc" :aria-label="`${item.title}说明`" :disabled="busy" maxlength="500" rows="2" class="pool-description" @change="edit(item.id, 'desc', $event)"></textarea>
        </div>
        <button class="admin-text text-red-600" :disabled="busy" :aria-label="`删除${item.title}`" @click="remove(item.id)">删除</button>
      </article>
    </div>
  </section>
</template>
<script setup lang="ts">
import { reactive } from 'vue'
import type { CouponTarget, TaskItem } from '../types/game'
const props = defineProps<{ title: string; items: TaskItem[]; ratio: number; target: CouponTarget; busy: boolean }>()
const emit = defineEmits<{ (e: 'update', items: TaskItem[]): void }>()
const draft = reactive({ title: '', desc: '', icon: '🎁' })
function add() {
  if (!draft.title.trim() || props.busy) return
  emit('update', [{ id: crypto.randomUUID(), title: draft.title.trim(), desc: draft.desc.trim(), icon: draft.icon || '🎁', target: props.target }, ...props.items])
  draft.title = ''; draft.desc = ''; draft.icon = '🎁'
}
function remove(id: string) { emit('update', props.items.filter(item => item.id !== id)) }
function edit(id: string, field: 'title' | 'desc', event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  if (field === 'title' && !value) { (event.target as HTMLInputElement).value = props.items.find(item => item.id === id)?.title || ''; return }
  emit('update', props.items.map(item => item.id === id ? { ...item, [field]: value } : { ...item }))
}
</script>
<style scoped>
.pool-title, .pool-description { width: 100%; background: transparent; border-bottom: 1px solid #f1f3f5; padding: 4px 0; font-size: 13px; }
.pool-title { font-weight: 600; }
.pool-description { font-size: 12px; color: #64748b; }
.pool-description { display: block; resize: vertical; line-height: 1.6; }
</style>
