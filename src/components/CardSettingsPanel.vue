<template>
  <section class="space-y-5" data-testid="card-settings">
    <div class="admin-panel space-y-4">
      <label class="admin-field">卡片文字
        <select :value="textMode" aria-label="卡片文字" :disabled="busy" @change="$emit('text-mode', ($event.target as HTMLSelectElement).value as CardTextMode)">
          <option value="none">仅图片</option><option value="name">名称</option><option value="description">名称与描述</option>
        </select>
      </label>
      <div class="card-preview" aria-label="卡片预览">
        <CardComponent :card="previewCard" :def="previewDefinition" :text-mode="textMode" />
      </div>
    </div>
    <header class="panel-heading"><h2>卡片</h2><div class="flex gap-3"><button class="admin-text" :disabled="busy" @click="showAdd = !showAdd">{{ showAdd ? '取消添加' : '添加卡牌' }}</button><button class="admin-text" :disabled="busy" @click="restore">恢复默认</button></div></header>
    <form v-if="showAdd" class="admin-panel space-y-3" @submit.prevent="add">
      <label class="admin-field">名称<input v-model.trim="draft.name" aria-label="新卡片名称" maxlength="30" required /></label>
      <label class="admin-field">描述<input v-model.trim="draft.desc" aria-label="新卡片描述" maxlength="80" /></label>
      <div class="flex flex-wrap gap-2">
        <button v-for="emoji in emojis" :key="emoji" type="button" class="emoji-option" :aria-pressed="draft.emoji === emoji" @click="draft.emoji = emoji; draft.image = ''">{{ emoji }}</button>
      </div>
      <div class="flex items-center justify-between gap-3">
        <label class="admin-upload">{{ draft.image ? '已选图片' : '上传图片' }}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="新卡片图片" :disabled="busy" @change="upload($event)" /></label>
        <button class="admin-primary" :disabled="busy">添加</button>
      </div>
    </form>
    <p v-if="error" role="alert" class="text-xs text-red-600">{{ error }}</p>
    <div class="card-editor-grid">
      <article v-for="card in ordinaryCards" :key="card.id" class="card-editor">
        <div class="card-thumbnail"><img v-if="(card.customImage || card.staticImage) && !failedImages[card.id]" :src="resolveAssetUrl(card.customImage || card.staticImage)" :alt="card.name" @error="failedImages[card.id] = true" /><span v-else v-html="card.defaultIconSvg"></span></div>
        <div class="min-w-0 flex-1 space-y-2">
          <input :value="card.name" :aria-label="`${card.name}名称`" :disabled="busy" maxlength="30" class="card-name-input" @change="edit(card.id, 'name', $event)" />
          <input :value="card.desc" :aria-label="`${card.name}描述`" :disabled="busy" placeholder="描述" maxlength="80" class="card-desc-input" @change="edit(card.id, 'desc', $event)" />
          <div class="flex gap-3"><label class="admin-upload">换图<input type="file" accept="image/jpeg,image/png,image/webp" :aria-label="`更换${card.name}图片`" :disabled="busy" @change="upload($event, card.id)" /></label><button class="admin-text text-red-600" :disabled="busy" :aria-label="`删除${card.name}`" @click="remove(card.id)">删除</button></div>
        </div>
      </article>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import CardComponent from './Card.vue'
import type { CardDefinition, CardItem, CardTextMode } from '../types/game'
import { DEFAULT_CARD_DEFINITIONS } from '../../shared/cardDefinitions.js'
import { resolveAssetUrl } from '../utils/api'
import { compressImage } from '../utils/images'
const props = defineProps<{ cards: CardDefinition[]; textMode: CardTextMode; busy: boolean }>()
const emit = defineEmits<{ (e: 'update', cards: CardDefinition[]): void; (e: 'text-mode', mode: CardTextMode): void; (e: 'busy', busy: boolean): void }>()
const ordinaryCards = computed(() => props.cards.filter(card => card.id !== 'boyfriend_photo'))
const previewDefinition = computed(() => ordinaryCards.value[0])
const previewCard: CardItem = { id: -1, type: '', x: 0, y: 0, layer: 0, status: 'slot', isCovered: false }
const showAdd = ref(false), error = ref(''), failedImages = reactive<Record<string, boolean>>({})
const draft = reactive({ name: '', desc: '', emoji: '💖', image: '' })
const emojis = ['💖', '🌹', '🧋', '🎁', '🍫', '🎬', '✈️', '🐱', '🐶', '💍']
function edit(id: string, field: 'name' | 'desc', event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  if (field === 'name' && !value) {
    (event.target as HTMLInputElement).value = props.cards.find(card => card.id === id)?.name || ''
    error.value = '请输入卡片名称'; return
  }
  error.value = ''; emit('update', props.cards.map(card => card.id === id ? { ...card, [field]: value } : { ...card }))
}
function add() {
  if (!draft.name || props.busy) return
  const card: CardDefinition = { id: `card_${crypto.randomUUID()}`, name: draft.name, desc: draft.desc, bgColor: '#fff7f9', borderColor: '#e2c5cf', customImage: draft.image || undefined,
    defaultIconSvg: `<svg viewBox="0 0 100 100"><text x="50" y="68" font-size="56" text-anchor="middle">${draft.emoji}</text></svg>` }
  emit('update', [...props.cards, card]); Object.assign(draft, { name: '', desc: '', emoji: '💖', image: '' }); showAdd.value = false
}
function remove(id: string) {
  if (ordinaryCards.value.length <= 3) { error.value = '至少保留 3 种卡片'; return }
  if (confirm('删除这张卡片？')) emit('update', props.cards.filter(card => card.id !== id))
}
function restore() { if (confirm('恢复默认卡片？')) emit('update', structuredClone(DEFAULT_CARD_DEFINITIONS)) }
async function upload(event: Event, id?: string) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = ''
  if (!file || props.busy) return
  emit('busy', true); error.value = ''
  try {
    const image = await compressImage(file, 320)
    if (id) { failedImages[id] = false; emit('update', props.cards.map(card => card.id === id ? { ...card, customImage: image } : { ...card })) }
    else draft.image = image
  } catch (err) { error.value = (err as Error).message }
  finally { emit('busy', false) }
}
</script>
<style scoped>
.card-preview { display: grid; place-items: center; padding: 18px; background: #f6eef0; border-radius: 14px; }
.card-preview :deep(.game-card) { width: 68px !important; max-width: 68px !important; height: 82px !important; }
.card-editor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr)); gap: 12px; }
.card-editor { display: flex; gap: 14px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 16px; }
.card-thumbnail { display: grid; place-items: center; width: 62px; height: 76px; flex-shrink: 0; overflow: hidden; border-radius: 10px; background: #f5f0f2; }
.card-thumbnail img, .card-thumbnail span { width: 100%; height: 100%; object-fit: cover; }
.card-thumbnail :deep(svg) { width: 100%; height: 100%; }
.card-name-input, .card-desc-input { display: block; width: 100%; padding: 3px 0; background: transparent; border-bottom: 1px solid #f1f1f1; font-size: 13px; }
.card-name-input { font-weight: 600; }
.card-desc-input { font-size: 11px; color: #64748b; }
.emoji-option { padding: 6px; border-radius: 8px; border: 1px solid transparent; }
.emoji-option[aria-pressed="true"] { border-color: #d7a8ba; background: #fff2f6; }
</style>
