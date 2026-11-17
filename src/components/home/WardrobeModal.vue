<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="wardrobe-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="header-icon"><DesignIcon name="mirror" /></span>
          <div>
            <h2 class="text-base font-bold text-stone-800 leading-tight">形象捏脸与高级换装间</h2>
            <p class="text-[11px] text-stone-500">定制独一无二的高级感专属形象，随心搭配衣帽间</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Main Body: Left Preview, Right Customization -->
      <div class="wardrobe-body">
        <!-- Left: Large Live Character Preview -->
        <div class="avatar-preview-stage">
          <div class="preview-backdrop-circle"></div>
          <PaperDoll
            :width="150"
            :height="225"
            :gender="currentGender"
            :skin="currentSkin"
            :eye-color="currentEyeColor"
            :hair-color="currentHairColor"
            :lip-color="currentLipColor"
            :equipped-slots="currentSlots"
          />

          <!-- Quick Aesthetic Badge -->
          <div class="aesthetic-pill mt-3">
            <span class="sparkle"><DesignIcon name="spark" /></span>
            <span class="text-[11px] font-semibold text-stone-600">实时高级渲染</span>
          </div>
        </div>

        <!-- Right: Tabbed Customization Panel -->
        <div class="customizer-panel">
          <!-- Primary Navigation Tabs -->
          <div class="nav-tabs">
            <button
              class="nav-tab-btn"
              :class="{ active: activeSection === 'face' }"
              @click="activeSection = 'face'"
            >
              <span><DesignIcon name="spark" /></span> 捏脸五官
            </button>
            <button
              class="nav-tab-btn"
              :class="{ active: activeSection === 'clothes' }"
              @click="activeSection = 'clothes'"
            >
              <span><DesignIcon name="shirt" /></span> 衣橱穿搭
            </button>
          </div>

          <!-- Section A: 捏脸五官 (Face, Skin, Eyes, Lips, Hair Color) -->
          <div v-if="activeSection === 'face'" class="section-content">
            <!-- 0. Gender / Figure -->
            <div class="option-group">
              <label class="group-label">身形气质</label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition"
                  :class="currentGender === 'male' ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm' : 'bg-stone-50 border-stone-200 text-stone-600'"
                  @click="currentGender = 'male'"
                >
                  <span><DesignIcon name="user" /></span> 阳光帅气
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition"
                  :class="currentGender === 'female' ? 'bg-pink-100 border-pink-400 text-pink-900 shadow-sm' : 'bg-stone-50 border-stone-200 text-stone-600'"
                  @click="currentGender = 'female'"
                >
                  <span><DesignIcon name="user" /></span> 甜美灵动
                </button>
              </div>
            </div>

            <!-- 1. Skin Tone -->
            <div class="option-group">
              <label class="group-label">肤色基调</label>
              <div class="color-chips-row">
                <button
                  v-for="s in skinOptions"
                  :key="s.color"
                  class="color-chip"
                  :style="{ backgroundColor: s.color }"
                  :class="{ selected: currentSkin === s.color }"
                  :title="s.label"
                  @click="currentSkin = s.color"
                >
                  <span v-if="currentSkin === s.color" class="chip-check">✓</span>
                </button>
              </div>
            </div>

            <!-- 2. Eye Color -->
            <div class="option-group">
              <label class="group-label">星眸瞳色</label>
              <div class="color-chips-row">
                <button
                  v-for="e in eyeColorOptions"
                  :key="e.color"
                  class="color-chip"
                  :style="{ backgroundColor: e.color }"
                  :class="{ selected: currentEyeColor === e.color }"
                  :title="e.label"
                  @click="currentEyeColor = e.color"
                >
                  <span v-if="currentEyeColor === e.color" class="chip-check">✓</span>
                </button>
              </div>
            </div>

            <!-- 3. Lip Tint Color -->
            <div class="option-group">
              <label class="group-label">唇釉色号</label>
              <div class="color-chips-row">
                <button
                  v-for="l in lipColorOptions"
                  :key="l.color"
                  class="color-chip"
                  :style="{ backgroundColor: l.color }"
                  :class="{ selected: currentLipColor === l.color }"
                  :title="l.label"
                  @click="currentLipColor = l.color"
                >
                  <span v-if="currentLipColor === l.color" class="chip-check">✓</span>
                </button>
              </div>
            </div>

            <!-- 4. Hair Dye Color -->
            <div class="option-group">
              <label class="group-label">发丝染采</label>
              <div class="color-chips-row">
                <button
                  v-for="h in hairColorOptions"
                  :key="h.color"
                  class="color-chip"
                  :style="{ backgroundColor: h.color }"
                  :class="{ selected: currentHairColor === h.color }"
                  :title="h.label"
                  @click="currentHairColor = h.color"
                >
                  <span v-if="currentHairColor === h.color" class="chip-check">✓</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Section B: 衣橱穿搭 (Hair, Top, Bottom, Shoes, Acc) -->
          <div v-else class="section-content">
            <!-- Slot Sub-tabs -->
            <div class="slot-subtabs">
              <button
                v-for="slot in slotTabs"
                :key="slot.key"
                class="subtab-btn"
                :class="{ active: activeSlot === slot.key }"
                @click="activeSlot = slot.key"
              >
                <span>{{ slot.icon }}</span>
                <span>{{ slot.label }}</span>
              </button>
            </div>

            <!-- Items List -->
            <div class="clothes-grid">
              <div
                v-for="item in availableSlotItems"
                :key="item.catalogId"
                class="clothing-card"
                :class="{ equipped: isEquipped(item.catalogId) }"
                @click="toggleEquip(item.catalogId)"
              >
                <div class="card-icon"><ModelPreview :catalog-id="item.catalogId" :width="76" :height="88" :options="{gender:currentGender,skin:currentSkin,hairColor:currentHairColor}" /></div>
                <div class="card-name">{{ item.metadata?.name || item.catalogId }}</div>
                <div class="card-badge">
                  <span v-if="isEquipped(item.catalogId)" class="badge-equipped">穿戴中</span>
                  <span v-else class="badge-wear">试穿</span>
                </div>
              </div>

              <div v-if="!availableSlotItems.length" class="empty-wardrobe">
                <p>衣橱里暂无该分类的服饰</p>
                <p class="text-xs text-stone-400 mt-1">前往商城或打工挂机解锁新潮单品！</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="panel-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-save" :disabled="saving" @click="handleSave">
          {{ saving ? '正在保存形象...' : '保存全新穿搭与形象 ✦' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DesignIcon from '../DesignIcon.vue'
import ModelPreview from './ModelPreview.vue'
import { ref, computed } from 'vue'
import PaperDoll from './PaperDoll.vue'
import {
  platformOverview,
  saveAvatarAll
} from '../../utils/platformState'
import { getStoredAuthUser } from '../../utils/backpack'

const emit = defineEmits(['close'])

const activeSection = ref<'face' | 'clothes'>('face')
const activeSlot = ref('hair')
const saving = ref(false)

// Customization Options
const skinOptions = [
  { label: '象牙瓷白', color: '#ffdbac' },
  { label: '蜜桃粉嫩', color: '#ffd1dc' },
  { label: '温润暖杏', color: '#f1c27d' },
  { label: '焦糖暖金', color: '#e0ac69' },
  { label: '健康小麦', color: '#c68642' }
]

const eyeColorOptions = [
  { label: '琥珀深褐', color: '#4e342e' },
  { label: '星河夜蓝', color: '#3a506b' },
  { label: '森林翠羽', color: '#4a7c59' },
  { label: '梦境幻紫', color: '#7b2cbf' },
  { label: '焦糖琥珀', color: '#e07a5f' }
]

const lipColorOptions = [
  { label: '豆沙玫瑰', color: '#e57373' },
  { label: '柔雾蜜桃', color: '#f4a261' },
  { label: '车厘浆果', color: '#d62828' },
  { label: '裸感奶茶', color: '#b08968' },
  { label: '甜心粉樱', color: '#ff80ab' }
]

const hairColorOptions = [
  { label: '曜石墨黑', color: '#2b2320' },
  { label: '焦糖栗棕', color: '#5d4037' },
  { label: '亚麻暖金', color: '#e9c46a' },
  { label: '雾霾冷灰', color: '#9e8279' },
  { label: '樱花薄粉', color: '#d8839b' }
]

const slotTabs = [
  { key: 'hair', label: '发型', icon: '💇' },
  { key: 'top', label: '上装', icon: '👕' },
  { key: 'bottom', label: '下装', icon: '👖' },
  { key: 'shoes', label: '鞋履', icon: '👟' },
  { key: 'accessory', label: '饰品', icon: '👓' }
]

// Current state (Hydrated from saved features)
const authUser = getStoredAuthUser()
const existingFeatures: any = platformOverview.value?.avatar?.features || {}

const currentGender = ref<'male' | 'female'>(
  existingFeatures.gender === 'male' || authUser?.gender === 'male' ? 'male' : 'female'
)
const currentSkin = ref(existingFeatures.skin || (currentGender.value === 'female' ? '#ffd1dc' : '#ffdbac'))
const currentEyeColor = ref(existingFeatures.eyeColor || (currentGender.value === 'male' ? '#3a506b' : '#4e342e'))
const currentHairColor = ref(existingFeatures.hairColor || '#2b2320')
const currentLipColor = ref(existingFeatures.lipColor || (currentGender.value === 'male' ? '#c08081' : '#e57373'))

const currentSlots = ref<Record<string, string | null>>({
  ...(platformOverview.value?.avatar?.equippedSlots || {})
})

const availableSlotItems = computed(() => {
  const items = platformOverview.value?.items || []
  return items.filter(
    (i: any) =>
      i.category === 'wardrobe' &&
      (i.slot === activeSlot.value || i.metadata?.slot === activeSlot.value)
  )
})

function isEquipped(catalogId: string) {
  return currentSlots.value[activeSlot.value] === catalogId
}

function toggleEquip(catalogId: string) {
  if (isEquipped(catalogId)) {
    if (activeSlot.value === 'accessory') {
      currentSlots.value[activeSlot.value] = null
    }
  } else {
    currentSlots.value[activeSlot.value] = catalogId
  }
}

async function handleSave() {
  try {
    saving.value = true
    await saveAvatarAll({
      gender: currentGender.value,
      skin: currentSkin.value,
      hairColor: currentHairColor.value,
      eyeColor: currentEyeColor.value,
      lipColor: currentLipColor.value
    }, currentSlots.value)
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
  background: rgba(30, 15, 22, 0.48);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.wardrobe-panel {
  width: 100%;
  max-width: 520px;
  background: #fffcfb;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(70, 20, 35, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 92vh;
}
.panel-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f3e6e8;
  background: #ffffff;
}
.header-icon {
  font-size: 24px;
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f7edf0;
  color: #7b4c59;
  font-size: 14px;
}

.wardrobe-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}
@media (max-width: 480px) {
  .wardrobe-body {
    flex-direction: column;
    overflow-y: auto;
  }
}

.avatar-preview-stage {
  flex-shrink: 0;
  width: 170px;
  background: linear-gradient(180deg, #fdf4f7, #f7e6eb);
  border-radius: 20px;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 8px rgba(131, 57, 80, 0.06);
}
@media (max-width: 480px) {
  .avatar-preview-stage {
    width: 100%;
    height: 250px;
  }
}

.preview-backdrop-circle {
  position: absolute;
  top: 15%;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 220, 230, 0.2) 70%);
  pointer-events: none;
}
.aesthetic-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.9);
  padding: 3px 10px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(100, 30, 50, 0.08);
}

.customizer-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.nav-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f5eaed;
  color: #6d4251;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.15s;
}
.nav-tab-btn.active {
  background: #9c4d68;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(156, 77, 104, 0.25);
}

.section-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.option-group {
  margin-bottom: 14px;
}
.group-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #5c3a44;
  margin-bottom: 6px;
}
.color-chips-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.color-chip {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 6px rgba(80, 30, 45, 0.15);
  transition: transform 0.15s, border-color 0.15s;
}
.color-chip:hover {
  transform: scale(1.1);
}
.color-chip.selected {
  border-color: #9c4d68;
  transform: scale(1.18);
}
.chip-check {
  font-size: 13px;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  font-weight: 900;
}

.slot-subtabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.subtab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border-radius: 10px;
  background: #f7edf0;
  color: #6d4251;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.subtab-btn.active {
  background: #8b4255;
  color: white;
}

.clothes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
  padding: 4px;
}
.clothing-card {
  background: #ffffff;
  border: 1.5px solid #ebd8dc;
  border-radius: 12px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.clothing-card:hover {
  border-color: #c2185b;
}
.clothing-card.equipped {
  border-color: #9c4d68;
  background: #fff5f8;
}
.card-icon {
  font-size: 26px;
}
.card-name {
  font-size: 10px;
  font-weight: 700;
  color: #5c3a44;
  text-align: center;
}
.card-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
}
.badge-equipped {
  background: #9c4d68;
  color: white;
}
.badge-wear {
  background: #f0e2e5;
  color: #7b4c59;
}
.empty-wardrobe {
  grid-column: 1 / -1;
  text-align: center;
  padding: 30px;
  color: #9e7b85;
  font-size: 11px;
}

.panel-footer {
  padding: 14px 20px;
  border-top: 1px solid #f3e6e8;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  background: #ffffff;
}
.btn-cancel {
  padding: 9px 18px;
  border-radius: 12px;
  background: #f5eaed;
  color: #7b4c59;
  font-size: 12px;
  font-weight: 700;
}
.btn-save {
  padding: 9px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #a8516d, #833950);
  color: white;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(131, 57, 80, 0.28);
}
</style>
