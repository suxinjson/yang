<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="backpack-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-xl">🎒</span>
          <div>
            <h2 class="text-base font-bold text-stone-800 leading-tight">通用多态背包</h2>
            <div class="flex items-center gap-3 text-xs font-semibold mt-0.5">
              <span class="text-amber-700">🪙 金币: {{ coins.gold }}</span>
              <span class="text-rose-700">💖 爱心币: {{ coins.heart }}</span>
            </div>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="backpack-tabs">
        <button
          v-for="cat in categoryTabs"
          :key="cat.key"
          class="tab-btn"
          :class="{ active: activeCategory === cat.key }"
          @click="activeCategory = cat.key"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <!-- Sorting Bar -->
      <div class="sort-bar">
        <span class="text-xs text-stone-500 font-medium">共 {{ displayedItems.length }} 种物品</span>
        <div class="flex items-center gap-1.5">
          <button
            class="sort-chip"
            :class="{ active: sortKey === 'rarity' }"
            @click="sortKey = 'rarity'"
          >
            按稀有度
          </button>
          <button
            class="sort-chip"
            :class="{ active: sortKey === 'quantity' }"
            @click="sortKey = 'quantity'"
          >
            按数量
          </button>
        </div>
      </div>

      <!-- Items Grid -->
      <div class="items-viewport">
        <div class="items-grid">
          <div
            v-for="item in displayedItems"
            :key="item.id || item.catalogId"
            class="backpack-item-card"
            :class="{ selected: selectedItem?.id === item.id }"
            @click="selectedItem = item"
          >
            <div class="item-icon-wrap">{{ item.icon || item.metadata?.icon || '📦' }}</div>
            <div class="item-name">{{ item.name || item.title || item.metadata?.name || item.catalogId }}</div>
            <div class="item-quantity">×{{ item.quantity || 1 }}</div>
            <div v-if="item.isEquipped" class="equipped-badge">穿戴中</div>
            <div v-if="item.category === 'wish_coupon' && item.used" class="used-badge">已兑现</div>
          </div>

          <div v-if="!displayedItems.length" class="empty-backpack">
            该分类下暂无物品~
          </div>
        </div>

        <!-- Selected Item Detail Action Drawer (if an item is clicked) -->
        <div v-if="selectedItem" class="item-detail-drawer">
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ selectedItem.icon || selectedItem.metadata?.icon || '📦' }}</span>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-bold text-stone-800 text-sm">
                  {{ selectedItem.name || selectedItem.title || selectedItem.metadata?.name || selectedItem.catalogId }}
                </span>
                <span class="category-tag">{{ categoryLabel(selectedItem.category) }}</span>
              </div>
              <p class="text-xs text-stone-600 mt-0.5">
                {{ selectedItem.desc || selectedItem.description || selectedItem.metadata?.description || '暂无详细描述' }}
              </p>
            </div>
          </div>

          <div class="mt-3 flex justify-end gap-2">
            <!-- Coupon Action -->
            <button
              v-if="selectedItem.category === 'wish_coupon' && !selectedItem.used"
              class="btn-action redeem"
              @click="handleRedeemCoupon(selectedItem)"
            >
              💖 兑现情侣心愿
            </button>

            <!-- Wardrobe Action -->
            <button
              v-if="selectedItem.category === 'wardrobe'"
              class="btn-action equip"
              @click="$emit('open-wardrobe')"
            >
              🪞 前往衣帽间试穿
            </button>

            <!-- Furniture Action -->
            <button
              v-if="selectedItem.category === 'furniture'"
              class="btn-action place"
              @click="$emit('open-furniture-grid')"
            >
              🛋️ 摆放进温馨小家
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { platformOverview } from '../../utils/platformState'

const emit = defineEmits(['close', 'redeem', 'open-wardrobe', 'open-furniture-grid'])

const activeCategory = ref('all')
const sortKey = ref<'rarity' | 'quantity'>('rarity')
const selectedItem = ref<any | null>(null)

const categoryTabs = [
  { key: 'all', label: '全部', icon: '🎒' },
  { key: 'game_tool', label: '道具', icon: '👁️' },
  { key: 'wardrobe', label: '服饰', icon: '👗' },
  { key: 'furniture', label: '家具', icon: '🛋️' },
  { key: 'wish_coupon', label: '心愿券', icon: '💌' },
  { key: 'supplies', label: '材料', icon: '🥫' }
]

const coins = computed(() => platformOverview.value?.coins || { gold: 100, heart: 0 })

const allItems = computed(() => {
  const normalItems = platformOverview.value?.items || []
  const coupons = (platformOverview.value?.coupons || []).map((c: any) => ({
    ...c,
    category: 'wish_coupon',
    name: c.title,
    icon: c.icon || '💖'
  }))
  return [...normalItems, ...coupons]
})

const displayedItems = computed(() => {
  let list = allItems.value
  if (activeCategory.value !== 'all') {
    if (activeCategory.value === 'supplies') {
      list = list.filter((i: any) => i.category === 'pet_supply' || i.category === 'work_token')
    } else {
      list = list.filter((i: any) => i.category === activeCategory.value)
    }
  }

  return [...list].sort((a: any, b: any) => {
    if (sortKey.value === 'quantity') {
      return (b.quantity || 1) - (a.quantity || 1)
    }
    const rank: any = { legendary: 4, epic: 3, rare: 2, common: 1 }
    const rA = rank[a.metadata?.rarity || a.rarity] || 1
    const rB = rank[b.metadata?.rarity || b.rarity] || 1
    return rB - rA || (b.quantity || 1) - (a.quantity || 1)
  })
})

function categoryLabel(cat?: string) {
  const map: Record<string, string> = {
    game_tool: '对局道具',
    wardrobe: '个性服饰',
    furniture: '小家家具',
    wish_coupon: '情侣心愿券',
    pet_supply: '宠物口粮',
    work_token: '打工加成'
  }
  return map[cat || ''] || '通用物品'
}

function handleRedeemCoupon(coupon: any) {
  emit('redeem', coupon.id || coupon.catalogId)
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
.backpack-panel {
  width: 100%;
  max-width: 520px;
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
.backpack-tabs {
  display: flex;
  gap: 6px;
  padding: 12px 18px 4px;
  overflow-x: auto;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #f3e5e8;
  color: #6d4251;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.tab-btn.active {
  background: #8b4255;
  color: #ffffff;
}
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 18px 2px;
}
.sort-chip {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f5eaed;
  color: #7b4c59;
}
.sort-chip.active {
  background: #8b4255;
  color: white;
}
.items-viewport {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.items-grid {
  flex: 1;
  overflow-y: auto;
  padding: 12px 18px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 10px;
}
.backpack-item-card {
  position: relative;
  background: #ffffff;
  border: 1.5px solid #ebd8dc;
  border-radius: 12px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.backpack-item-card.selected {
  border-color: #8b4255;
  background: #fff5f8;
}
.item-icon-wrap {
  font-size: 26px;
}
.item-name {
  font-size: 10px;
  font-weight: 700;
  color: #5c3a44;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.item-quantity {
  font-size: 9px;
  color: #8b6772;
  font-weight: 600;
}
.equipped-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: #4caf50;
  color: white;
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
}
.used-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #9e9e9e;
  color: white;
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
}
.empty-backpack {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #9e7b85;
  font-size: 12px;
}
.item-detail-drawer {
  padding: 12px 18px;
  border-top: 1px solid #ebd8dc;
  background: #fff8fa;
}
.category-tag {
  font-size: 9px;
  font-weight: 600;
  background: #ebd8dc;
  color: #7b4c59;
  padding: 1px 6px;
  border-radius: 4px;
}
.btn-action {
  font-size: 11px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 8px;
}
.btn-action.redeem {
  background: linear-gradient(135deg, #e91e63, #c2185b);
  color: white;
}
.btn-action.equip {
  background: #8b4255;
  color: white;
}
.btn-action.place {
  background: #6a1b9a;
  color: white;
}
</style>
