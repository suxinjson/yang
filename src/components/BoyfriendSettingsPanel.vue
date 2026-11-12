<template>
  <section class="admin-panel space-y-4" data-testid="boyfriend-settings">
    <h2 class="panel-title">男友帅照</h2>
    <label class="flex gap-2 items-center font-bold text-slate-800">
      <input type="checkbox" :checked="config.bfCardEnabled" :disabled="uploading" aria-label="男友帅照加入叠叠卡牌" @change="toggleDeck" />
      加入叠叠卡牌
    </label>
    <label class="admin-field">
      使用哪张帅照
      <select :value="config.bfPhotoIndex" aria-label="使用哪张帅照" :disabled="uploading" @change="selectPhoto">
        <option :value="0">每局随机</option>
        <option v-for="(photo, index) in config.bfPhotos" :key="index" :value="index + 1">{{ index + 1 }} · {{ photo.name }}</option>
      </select>
    </label>
    <div class="photo-grid">
      <div v-for="(photo, index) in config.bfPhotos" :key="index" class="photo-editor">
        <div class="photo-thumbnail">
          <img v-if="!failedImages[index]" :key="photo.image" :src="resolveAssetUrl(photo.image)" :alt="photo.name" class="w-full h-full object-cover" @error="failedImages[index] = true" />
          <span v-else class="w-full h-full flex items-center justify-center text-4xl">🕶️</span>
        </div>
        <div class="min-w-0 flex-1 space-y-2">
          <input type="text" :value="photo.name" :aria-label="`帅照${index + 1}名字`" maxlength="20" :disabled="uploading" class="photo-name" @input="renamePhoto(index, $event)" />
          <div class="flex gap-3 flex-wrap items-center">
          <label class="admin-upload">
            更换照片
            <input type="file" accept="image/jpeg,image/png,image/webp" :aria-label="`更换帅照${index + 1}`" :disabled="uploading" @change="uploadPhoto(index, $event)" />
          </label>
          <button type="button" :aria-label="`恢复帅照${index + 1}默认照片`" :disabled="uploading" class="admin-text" @click="restorePhoto(index)">恢复默认</button>
          </div>
        </div>
      </div>
    </div>
    <p v-if="uploading" role="status" class="text-xs text-slate-500">正在处理照片…</p>
    <p v-if="error" role="alert" class="text-[11px] text-red-600">{{ error }}</p>
    <button type="button" :disabled="uploading" class="admin-primary" @click="emit('save')">保存帅照配置</button>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AdminConfig, BoyfriendPhoto } from '../types/game'
import { resolveAssetUrl } from '../utils/api'
import { defaultBoyfriendPhotos } from '../../shared/boyfriendConfig.js'
import { compressImage } from '../utils/images'

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
  uploading.value = true
  emit('busy', true)
  try {
    updatePhoto(index, { image: await compressImage(file) })
    emit('save')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    uploading.value = false
    emit('busy', false)
  }
}
</script>

<style scoped>
.photo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr)); gap: 12px; }
.photo-editor { display: flex; align-items: center; gap: 14px; padding: 12px; background: white; border: 1px solid #e5e9ef; border-radius: 12px; min-width: 0; }
.photo-thumbnail { width: 76px; height: 88px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: #f1edf0; }
.photo-name { width: 100%; min-width: 0; padding: 4px 0; font-size: 13px; font-weight: 600; border-bottom: 1px solid #edf0f3; }
</style>
