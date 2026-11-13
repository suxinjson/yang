<template>
  <div class="grid-editor-overlay">
    <!-- Top Bar Controls -->
    <div class="editor-header">
      <div class="flex items-center gap-2">
        <span class="text-lg">🛠️</span>
        <span class="font-bold text-stone-800 text-sm">小家网格装修模式 (10×10)</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-tool cancel" @click="$emit('cancel')">取消</button>
        <button class="btn-tool save" :disabled="hasConflict || saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存布局' }}
        </button>
      </div>
    </div>

    <!-- Active Furniture Control Pill (if selected) -->
    <div v-if="selectedItem" class="selected-control-pill">
      <span class="text-xs font-bold text-stone-700">已选中：{{ selectedDef?.name || selectedItem.catalogId }}</span>
      <div class="flex items-center gap-1.5">
        <button class="pill-btn rotate" @click="rotateSelected">↻ 旋转 90°</button>
        <button class="pill-btn pack" @click="packSelected">📦 收回背包</button>
      </div>
    </div>

    <!-- 10x10 Grid Board Container -->
    <div class="grid-board-viewport">
      <div class="grid-board">
        <!-- 100 Grid Cells -->
        <div
          v-for="idx in 100"
          :key="idx"
          class="grid-cell"
          :class="{
            'cell-hover': hoveredCell?.x === (idx - 1) % 10 && hoveredCell?.y === Math.floor((idx - 1) / 10)
          }"
          @click="handleCellClick((idx - 1) % 10, Math.floor((idx - 1) / 10))"
        ></div>

        <!-- Render Placed Furnitures -->
        <div
          v-for="furn in furnitures"
          :key="furn.instanceId"
          class="placed-furniture-item"
          :class="{
            selected: selectedItem?.instanceId === furn.instanceId,
            conflict: checkSingleConflict(furn)
          }"
          :style="getFurnitureStyle(furn)"
          @click.stop="selectFurniture(furn)"
        >
          <div class="furn-icon">{{ getFurnDef(furn.catalogId)?.icon || '🛋️' }}</div>
          <div class="furn-label">{{ getFurnDef(furn.catalogId)?.name || furn.catalogId }}</div>
        </div>
      </div>
    </div>

    <!-- Bottom Furniture Drawer: Available from Inventory -->
    <div class="inventory-drawer">
      <div class="drawer-title">背包中的闲置家具（点击放入房间）</div>
      <div class="drawer-items">
        <div
          v-for="item in availableFurnitureItems"
          :key="item.catalogId"
          class="drawer-card"
          @click="addFurnitureToGrid(item)"
        >
          <span class="d-icon">{{ item.metadata?.icon || '🛋️' }}</span>
          <span class="d-name">{{ item.metadata?.name || item.catalogId }}</span>
          <span class="d-count">×{{ item.quantity }}</span>
        </div>
        <div v-if="!availableFurnitureItems.length" class="empty-drawer">
          背包中暂无闲置家具，前往商城用金币添置一些吧！
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { platformOverview, saveHomeSpace, type PlacedFurniture } from '../../utils/platformState'
import { ITEM_REGISTRY } from '../../../shared/domain/items/index'

const emit = defineEmits(['close', 'cancel'])

const saving = ref(false)
const selectedItem = ref<PlacedFurniture | null>(null)
const hoveredCell = ref<{ x: number; y: number } | null>(null)

// Local draft of furnitures
const furnitures = ref<PlacedFurniture[]>([
  ...(platformOverview.value?.homeSpace.placedFurnitures || []).map(f => ({ ...f }))
])

const availableFurnitureItems = computed(() => {
  const items = platformOverview.value?.items || []
  return items.filter(item => item.category === 'furniture')
})

function getFurnDef(catalogId: string) {
  return (ITEM_REGISTRY as any)[catalogId] || null
}

const selectedDef = computed(() => {
  if (!selectedItem.value) return null
  return getFurnDef(selectedItem.value.catalogId)
})

function getFurnitureDimensions(furn: PlacedFurniture) {
  const def = getFurnDef(furn.catalogId)
  const baseW = furn.w || def?.footprint?.[0] || 1
  const baseH = furn.h || def?.footprint?.[1] || 1
  const rot = furn.rot || 0
  return {
    w: rot % 180 === 90 ? baseH : baseW,
    h: rot % 180 === 90 ? baseW : baseH
  }
}

function getFurnitureStyle(furn: PlacedFurniture) {
  const { w, h } = getFurnitureDimensions(furn)
  const cellPercent = 10
  const zIndex = (furn.layer === 'rug' ? 10 : 50) + furn.y * 10 + furn.x
  return {
    left: `${furn.x * cellPercent}%`,
    top: `${furn.y * cellPercent}%`,
    width: `${w * cellPercent}%`,
    height: `${h * cellPercent}%`,
    zIndex
  }
}

function checkSingleConflict(furn: PlacedFurniture): boolean {
  const { w, h } = getFurnitureDimensions(furn)
  if (furn.x < 0 || furn.y < 0 || furn.x + w > 10 || furn.y + h > 10) return true
  if (furn.layer === 'rug') return false

  for (const other of furnitures.value) {
    if (other.instanceId === furn.instanceId || other.layer === 'rug') continue
    const { w: oW, h: oH } = getFurnitureDimensions(other)
    const overlapX = Math.max(furn.x, other.x) < Math.min(furn.x + w, other.x + oW)
    const overlapY = Math.max(furn.y, other.y) < Math.min(furn.y + h, other.y + oH)
    if (overlapX && overlapY) return true
  }
  return false
}

const hasConflict = computed(() => {
  return furnitures.value.some(f => checkSingleConflict(f))
})

function selectFurniture(furn: PlacedFurniture) {
  selectedItem.value = furn
}

function handleCellClick(x: number, y: number) {
  if (selectedItem.value) {
    const { w, h } = getFurnitureDimensions(selectedItem.value)
    selectedItem.value.x = Math.max(0, Math.min(10 - w, x))
    selectedItem.value.y = Math.max(0, Math.min(10 - h, y))
  }
}

function rotateSelected() {
  if (!selectedItem.value) return
  selectedItem.value.rot = ((selectedItem.value.rot || 0) + 90) % 360
  const { w, h } = getFurnitureDimensions(selectedItem.value)
  if (selectedItem.value.x + w > 10) selectedItem.value.x = 10 - w
  if (selectedItem.value.y + h > 10) selectedItem.value.y = 10 - h
}

function packSelected() {
  if (!selectedItem.value) return
  furnitures.value = furnitures.value.filter(f => f.instanceId !== selectedItem.value?.instanceId)
  selectedItem.value = null
}

function addFurnitureToGrid(item: any) {
  const def = getFurnDef(item.catalogId)
  const footprint = def?.footprint || [1, 1]
  const newFurn: PlacedFurniture = {
    instanceId: `furn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    catalogId: item.catalogId,
    x: 4,
    y: 4,
    w: footprint[0],
    h: footprint[1],
    rot: 0,
    layer: def?.layer || 'ground'
  }
  furnitures.value.push(newFurn)
  selectedItem.value = newFurn
}

async function handleSave() {
  if (hasConflict.value) {
    alert('存在位置重叠冲突或超出房间网格的家具，请调整后再保存！')
    return
  }
  try {
    saving.value = true
    await saveHomeSpace(furnitures.value)
    emit('close')
  } catch (err: any) {
    alert(err.message || '保存小家布局失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.grid-editor-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: rgba(255, 250, 248, 0.94);
  display: flex;
  flex-direction: column;
}
.editor-header {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebd8dc;
  background: #ffffff;
}
.btn-tool {
  font-size: 11px;
  font-weight: 700;
  padding: 5px 14px;
  border-radius: 8px;
}
.btn-tool.cancel {
  background: #f0e2e5;
  color: #7b4c59;
}
.btn-tool.save {
  background: #9c4d68;
  color: white;
}
.btn-tool.save:disabled {
  background: #dfc8ce;
  cursor: not-allowed;
}
.selected-control-pill {
  margin: 6px auto;
  padding: 6px 14px;
  background: #fff0f5;
  border: 1px solid #f8bbd0;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 10px rgba(100, 30, 50, 0.08);
}
.pill-btn {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
}
.pill-btn.rotate {
  background: #e1bee7;
  color: #4a148c;
}
.pill-btn.pack {
  background: #ffe0b2;
  color: #e65100;
}
.grid-board-viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}
.grid-board {
  position: relative;
  width: min(340px, 86vw);
  height: min(340px, 86vw);
  background: #f7ebed;
  border: 2px solid #dfc2c8;
  border-radius: 12px;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  box-shadow: inset 0 2px 8px rgba(100, 30, 50, 0.06);
}
.grid-cell {
  border-right: 1px dashed rgba(200, 160, 175, 0.4);
  border-bottom: 1px dashed rgba(200, 160, 175, 0.4);
  cursor: crosshair;
}
.placed-furniture-item {
  position: absolute;
  border: 2px solid #8b4255;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(80, 20, 40, 0.12);
  transition: border-color 0.15s;
}
.placed-furniture-item.selected {
  border-color: #e91e63;
  outline: 2px dashed #e91e63;
  outline-offset: 2px;
}
.placed-furniture-item.conflict {
  background: rgba(255, 82, 82, 0.45) !important;
  border-color: #d32f2f !important;
}
.furn-icon {
  font-size: 20px;
}
.furn-label {
  font-size: 9px;
  font-weight: 700;
  color: #5c3a44;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90%;
}
.inventory-drawer {
  padding: 10px 14px;
  background: #ffffff;
  border-top: 1px solid #ebd8dc;
}
.drawer-title {
  font-size: 11px;
  font-weight: 700;
  color: #7b4c59;
  margin-bottom: 6px;
}
.drawer-items {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.drawer-card {
  flex-shrink: 0;
  width: 72px;
  padding: 6px;
  border: 1px solid #ebd8dc;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  background: #fffbfa;
}
.d-icon {
  font-size: 22px;
}
.d-name {
  font-size: 9px;
  font-weight: 600;
  color: #5c3a44;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.d-count {
  font-size: 8px;
  color: #8b6772;
}
.empty-drawer {
  font-size: 11px;
  color: #9e7b85;
  padding: 8px;
}
</style>
