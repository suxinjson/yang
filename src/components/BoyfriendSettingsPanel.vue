<template>
  <section class="bg-sky-50/70 p-3 rounded-2xl border border-sky-200 space-y-3" data-testid="boyfriend-settings">
    <h4 class="font-black text-sky-950 text-sm">👦 男友帅照配置</h4>
    <label class="flex gap-2 items-center font-bold text-sky-950">
      <input type="checkbox" :checked="config.bfCardEnabled" :disabled="uploading" aria-label="男友帅照加入叠叠卡牌" @change="toggleDeck" />
      加入叠叠卡牌
    </label>
    <p class="text-[10px] text-gray-600 leading-relaxed">开启后，选中的帅照作为一种牌型参与随机抽牌；关闭后仍可用于救场。牌库变化在重开或下一关应用，当前牌局保持原样。</p>
    <label class="block font-bold text-sky-950 space-y-1">
      使用哪张帅照
      <select :value="config.bfPhotoIndex" aria-label="使用哪张帅照" :disabled="uploading" class="w-full rounded-lg border border-sky-200 bg-white p-2" @change="selectPhoto">
        <option :value="0">🎲 随机选择（每局 / 每次救场重新抽取）</option>
        <option v-for="(photo, index) in config.bfPhotos" :key="index" :value="index + 1">{{ index + 1 }} · {{ photo.name }}</option>
      </select>
    </label>
    <div class="grid grid-cols-2 gap-2">
      <div v-for="(photo, index) in config.bfPhotos" :key="index" class="rounded-xl border border-sky-200 bg-white p-2 space-y-2 min-w-0">
        <div class="relative rounded-lg bg-sky-100 overflow-hidden aspect-square">
          <img v-if="!failedImages[index]" :key="photo.image" :src="resolveAssetUrl(photo.image)" :alt="photo.name" class="w-full h-full object-cover" @error="failedImages[index] = true" />
          <span v-else class="w-full h-full flex items-center justify-center text-4xl">🕶️</span>
          <span class="absolute top-1 left-1 rounded bg-white/90 px-1.5 text-[10px] font-bold">帅照 {{ index + 1 }}</span>
        </div>
        <label class="block text-[10px] font-bold space-y-1">展示名字
          <input type="text" :value="photo.name" :aria-label="`帅照${index + 1}名字`" maxlength="20" :disabled="uploading" class="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-xs" @input="renamePhoto(index, $event)" />
        </label>
        <div class="flex gap-1 flex-wrap items-center">
          <label class="rounded-lg bg-sky-700 text-white px-2 py-1 text-[10px] font-bold cursor-pointer">
            更换照片
            <input type="file" accept="image/jpeg,image/png,image/webp" :aria-label="`更换帅照${index + 1}`" :disabled="uploading" class="sr-only" @change="uploadPhoto(index, $event)" />
          </label>
          <button type="button" :aria-label="`恢复帅照${index + 1}默认照片`" :disabled="uploading" class="text-[10px] text-sky-700 font-bold px-1 py-1" @click="restorePhoto(index)">恢复默认</button>
        </div>
      </div>
    </div>
    <p v-if="uploading" role="status" class="text-[11px] text-sky-700">正在处理照片…</p>
    <p v-if="error" role="alert" class="text-[11px] text-red-600">{{ error }}</p>
    <p class="text-[10px] text-gray-500">支持 JPG / PNG / WebP，单张不超过 10MB，自动压缩后随后台配置保存。名字同时用于卡牌和救场弹窗。</p>
    <button type="button" :disabled="uploading" class="w-full rounded-xl bg-sky-800 text-white font-bold py-2 disabled:opacity-50" @click="emit('save')">保存帅照配置</button>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AdminConfig, BoyfriendPhoto } from '../types/game'
import { resolveAssetUrl } from '../utils/api'
import { defaultBoyfriendPhotos } from '../../shared/boyfriendConfig.js'

const props = defineProps<{ config: AdminConfig }>()
const emit = defineEmits<{
  (e: 'update', patch: Partial<Pick<AdminConfig, 'bfPhotos' | 'bfPhotoIndex' | 'bfCardEnabled'>>): void
  (e: 'save'): void
  (e: 'busy', busy: boolean): void
}>()
const uploading = ref(false)
const error = ref('')
const failedImages = ref<boolean[]>([])
watch(() => props.config.bfPhotos.map(photo => photo.image), () => { failedImages.value = [] })

function updatePhoto(index: number, patch: Partial<BoyfriendPhoto>) {
  emit('update', { bfPhotos: props.config.bfPhotos.map((photo, i) => i === index ? { ...photo, ...patch } : { ...photo }) })
}

function renamePhoto(index: number, event: Event) {
  updatePhoto(index, { name: (event.target as HTMLInputElement).value })
}

function toggleDeck(event: Event) {
  emit('update', { bfCardEnabled: (event.target as HTMLInputElement).checked })
  emit('save')
}

function selectPhoto(event: Event) {
  emit('update', { bfPhotoIndex: Number((event.target as HTMLSelectElement).value) })
  emit('save')
}

function restorePhoto(index: number) {
  updatePhoto(index, { image: defaultBoyfriendPhotos()[index].image })
  error.value = ''
  emit('save')
}

async function uploadPhoto(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || uploading.value) return
  error.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    error.value = '请选择 10MB 以内的 JPG、PNG 或 WebP 图片。'
    return
  }
  uploading.value = true
  emit('busy', true)
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const ratio = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    updatePhoto(index, { image: canvas.toDataURL('image/jpeg', 0.82) })
    emit('save')
  } catch {
    error.value = '照片读取失败，请选择有效图片后重试。'
  } finally {
    bitmap?.close()
    uploading.value = false
    emit('busy', false)
  }
}
</script>
