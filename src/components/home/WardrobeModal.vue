<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="wardrobe-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-xl">🪞</span>
          <h2 class="text-lg font-bold text-stone-800">捏脸与换装衣帽间</h2>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Content Grid: Left Avatar Preview, Right Slots & Items -->
      <div class="wardrobe-content">
        <!-- Left: Big Avatar Preview -->
        <div class="preview-area">
          <PaperDoll
            :width="160"
            :height="224"
            :skin="currentSkin"
            :equipped-slots="currentSlots"
          />
          <div class="skin-selector mt-4">
            <span class="text-xs text-stone-500 font-medium">肤色选择：</span>
            <div class="flex gap-2 mt-1 justify-center">
              <button
                v-for="color in skinColors"
                :key="color"
                class="skin-chip"
                :style="{ backgroundColor: color }"
                :class="{ active: currentSkin === color }"
                @click="selectSkin(color)"
              ></button>
            </div>
          </div>
        </div>

        <!-- Right: Category Slots & Items List -->
        <div class="selector-area">
          <!-- Slot Tabs -->
          <div class="slot-tabs">
            <button
              v-for="tab in slotTabs"
              :key="tab.slot"
              class="tab-btn"
              :class="{ active: activeSlot === tab.slot }"
              @click="activeSlot = tab.slot"
            >
              <span>{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <!-- Items Grid for active slot -->
          <div class="items-grid">
            <div
              v-for="item in availableItems"
              :key="item.catalogId"
              class="item-card"
              :class="{ equipped: isEquipped(item.catalogId) }"
              @click="toggleEquip(item)"
            >
              <div class="item-icon">{{ item.metadata?.icon || '👗' }}</div>
              <div class="item-name">{{ item.metadata?.name || item.catalogId }}</div>
              <div class="item-status">
                <span v-if="isEquipped(item.catalogId)" class="status-tag equipped">已穿戴</span>
                <span v-else class="status-tag wear">换上</span>
              </div>
            </div>

            <div v-if="!availableItems.length" class="empty-hint">
              <p>衣柜里还没有该部位的服饰哦~</p>
              <p class="text-xs text-stone-400 mt-1">可在商城购买或打工通关掉落解锁！</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="panel-footer">
        <button class="btn-save" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存穿搭与形象' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PaperDoll from './PaperDoll.vue'
import {
  platformOverview,
  updateAvatarFeatures,
  equipAvatarItem
} from '../../utils/platformState'

const emit = defineEmits(['close'])

const skinColors = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#ffd1dc']

const slotTabs = [
  { slot: 'hair', label: '发型', icon: '💇' },
  { slot: 'top', label: '上装', icon: '👕' },
  { slot: 'bottom', label: '下装', icon: '👖' },
  { slot: 'shoes', label: '鞋履', icon: '👟' },
  { slot: 'accessory', label: '饰品', icon: '👓' }
]

const activeSlot = ref('top')
const saving = ref(false)

const currentSkin = ref(platformOverview.value?.avatar?.features?.skin || '#ffdbac')
const currentSlots = ref<Record<string, string | null>>({
  ...(platformOverview.value?.avatar?.equippedSlots || {})
})

function selectSkin(color: string) {
  currentSkin.value = color
}

const availableItems = computed(() => {
  const items = platformOverview.value?.items || []
  return items.filter(
    item =>
      item.category === 'wardrobe' &&
      (item.slot === activeSlot.value || item.metadata?.slot === activeSlot.value)
  )
})

function isEquipped(catalogId: string) {
  return currentSlots.value[activeSlot.value] === catalogId
}

function toggleEquip(item: any) {
  if (isEquipped(item.catalogId)) {
    // Unequip (except hair, top, bottom, shoes which require basics)
    if (activeSlot.value === 'accessory') {
      currentSlots.value[activeSlot.value] = null
    }
  } else {
    currentSlots.value[activeSlot.value] = item.catalogId
  }
}

async function handleSave() {
  try {
    saving.value = true
    await updateAvatarFeatures({ skin: currentSkin.value })
    for (const [slot, catalogId] of Object.entries(currentSlots.value)) {
      if (catalogId) {
        await equipAvatarItem(catalogId, slot)
      }
    }
    emit('close')
  } catch (err: any) {
    alert(err.message || '保存形象失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(30, 15, 22, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.wardrobe-panel {
  width: 100%;
  max-width: 520px;
  background: #fffbfa;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(80, 30, 45, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
}
.panel-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0e2e5;
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f5e8eb;
  color: #7b4c59;
  font-size: 14px;
}
.wardrobe-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}
@media (max-width: 480px) {
  .wardrobe-content {
    flex-direction: column;
    overflow-y: auto;
  }
}
.preview-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #fbf0f3;
  border-radius: 16px;
}
.skin-chip {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: transform 0.15s;
}
.skin-chip.active {
  border-color: #ba68c8;
  transform: scale(1.15);
}
.selector-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.slot-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #f3e5e8;
  color: #6d4251;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.tab-btn.active {
  background: #9c4d68;
  color: #ffffff;
}
.items-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  padding: 4px;
}
.item-card {
  background: #ffffff;
  border: 1.5px solid #eedde1;
  border-radius: 12px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.item-card:hover {
  border-color: #d18ba1;
}
.item-card.equipped {
  border-color: #9c4d68;
  background: #fff0f5;
}
.item-icon {
  font-size: 28px;
}
.item-name {
  font-size: 11px;
  font-weight: 600;
  color: #5c3a44;
  text-align: center;
}
.status-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
}
.status-tag.equipped {
  background: #9c4d68;
  color: white;
}
.status-tag.wear {
  background: #ede0e4;
  color: #7b4c59;
}
.empty-hint {
  grid-column: 1 / -1;
  text-align: center;
  padding: 32px 16px;
  color: #8b6772;
  font-size: 12px;
}
.panel-footer {
  padding: 14px 20px;
  border-top: 1px solid #f0e2e5;
  display: flex;
  justify-content: flex-end;
}
.btn-save {
  background: linear-gradient(135deg, #a8516d, #833950);
  color: white;
  font-weight: 700;
  font-size: 13px;
  padding: 10px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(131, 57, 80, 0.28);
}
</style>
