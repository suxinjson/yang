<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="store-panel">
      <!-- Header with Currency balance -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-xl">🏪</span>
          <div>
            <h2 class="text-base font-bold text-stone-800 leading-tight">元宇宙金币商城</h2>
            <div class="flex items-center gap-3 mt-0.5 text-xs font-semibold">
              <span class="text-amber-700">🪙 金币: {{ coins.gold }}</span>
              <span class="text-rose-700">💖 爱心币: {{ coins.heart }}</span>
            </div>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="store-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: currentTab === tab.key }"
          @click="currentTab = tab.key"
        >
          <span>{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Items Grid -->
      <div class="items-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="store-item-card"
          :class="`rarity-${item.rarity || 'common'}`"
        >
          <div class="item-badge">{{ rarityLabel(item.rarity) }}</div>
          <div class="item-icon-box">{{ item.icon || '📦' }}</div>
          <div class="item-title">{{ item.name }}</div>
          <p class="item-desc">{{ item.description }}</p>

          <div class="card-bottom">
            <span class="price-tag">🪙 {{ item.price }}</span>
            <button
              class="buy-btn"
              :disabled="coins.gold < (item.price || 0) || buyingId === item.id"
              @click="handleBuy(item)"
            >
              {{ buyingId === item.id ? '购买中...' : '购买' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { platformOverview, buyStoreItem } from '../../utils/platformState'
import { ITEM_REGISTRY, type CatalogDefinition } from '../../../shared/domain/items/index'

defineEmits(['close'])

const currentTab = ref('all')
const buyingId = ref<string | null>(null)

const tabs = [
  { key: 'all', label: '全部', icon: '🛍️' },
  { key: 'furniture', label: '温馨家具', icon: '🛋️' },
  { key: 'wardrobe', label: '时尚服饰', icon: '👗' },
  { key: 'supplies', label: '道具补给', icon: '☕' }
]

const coins = computed(() => platformOverview.value?.coins || { gold: 100, heart: 0 })

const storeItems = computed<CatalogDefinition[]>(() => {
  return Object.values(ITEM_REGISTRY).filter((item: CatalogDefinition) => Boolean(item.price && item.price > 0))
})

const filteredItems = computed<CatalogDefinition[]>(() => {
  if (currentTab.value === 'all') return storeItems.value
  if (currentTab.value === 'furniture') return storeItems.value.filter(i => i.category === 'furniture')
  if (currentTab.value === 'wardrobe') return storeItems.value.filter(i => i.category === 'wardrobe')
  if (currentTab.value === 'supplies') return storeItems.value.filter(i => i.category === 'pet_supply' || i.category === 'work_token' || i.category === 'game_tool')
  return storeItems.value
})

function rarityLabel(rarity?: string) {
  if (rarity === 'legendary') return '传说'
  if (rarity === 'epic') return '史诗'
  if (rarity === 'rare') return '稀有'
  return '普通'
}

async function handleBuy(item: any) {
  if (coins.value.gold < item.price) {
    alert('金币不足！快去打工或玩消除通关赚取金币吧！')
    return
  }
  try {
    buyingId.value = item.id
    await buyStoreItem(item.id, 1)
    alert(`🎉 成功购买 ${item.name}！已存入通用背包`)
  } catch (err: any) {
    alert(err.message || '购买失败')
  } finally {
    buyingId.value = null
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
.store-panel {
  width: 100%;
  max-width: 540px;
  background: #fffcfb;
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
.store-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 20px 4px;
  overflow-x: auto;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 12px;
  background: #f3e5e8;
  color: #6d4251;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.tab-btn.active {
  background: #c2185b;
  color: #ffffff;
}
.items-grid {
  padding: 16px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.store-item-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #ebd8dc;
  border-radius: 14px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 6px rgba(100, 30, 50, 0.04);
}
.item-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f0e2e5;
  color: #7b4c59;
}
.rarity-epic .item-badge {
  background: #f3e5f5;
  color: #7b1fa2;
}
.rarity-rare .item-badge {
  background: #e1f5fe;
  color: #0288d1;
}
.item-icon-box {
  font-size: 32px;
  margin: 6px 0;
}
.item-title {
  font-size: 12px;
  font-weight: 700;
  color: #4a2833;
}
.item-desc {
  font-size: 10px;
  color: #8b6772;
  margin: 4px 0 10px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-bottom {
  margin-top: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.price-tag {
  font-size: 11px;
  font-weight: 700;
  color: #b78103;
}
.buy-btn {
  padding: 5px 12px;
  border-radius: 8px;
  background: #8b4255;
  color: white;
  font-size: 11px;
  font-weight: 700;
}
.buy-btn:disabled {
  background: #d8c2c7;
  cursor: not-allowed;
}
</style>
