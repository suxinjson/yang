<template>
  <div class="home-hub-wrapper">
    <!-- Top Status Bar -->
    <header class="home-header">
      <div class="flex items-center justify-between gap-2">
        <!-- Profile & Level -->
        <div class="flex items-center gap-2">
          <div class="header-avatar" @click="activeModal = 'wardrobe'">
            <PaperDoll :width="34" :height="48" :skin="avatarSkin" :equipped-slots="equippedSlots" />
          </div>
          <div>
            <div class="font-extrabold text-sm text-stone-800 leading-tight">温馨小家 ✦</div>
            <div class="text-[10px] text-stone-500">伴侣羁绊 Lv.3 · 甜蜜日常</div>
          </div>
        </div>

        <!-- Currencies (Clickable to open Store) -->
        <div class="flex items-center gap-2">
          <div class="currency-badge gold" title="点击打开商城" @click="activeModal = 'store'">
            <span>🪙</span>
            <span>{{ coins.gold }}</span>
            <span class="plus-btn">+</span>
          </div>
          <div class="currency-badge heart" title="伴侣爱心币" @click="activeModal = 'companion'">
            <span>💖</span>
            <span>{{ coins.heart }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="quick-nav-bar mt-2">
        <button class="nav-chip" @click="activeModal = 'backpack'">
          <span>🎒</span> 背包
        </button>
        <button class="nav-chip" @click="activeModal = 'store'">
          <span>🏪</span> 商城
        </button>
        <button class="nav-chip" @click="activeModal = 'job'">
          <span>💻</span> 打工
          <span v-if="isJobComplete" class="notify-dot">!</span>
        </button>
        <button class="nav-chip" @click="activeModal = 'companion'">
          <span>🐾</span> 宠物
          <span v-if="isPetRewardReady" class="notify-dot">!</span>
        </button>
        <button class="nav-chip wrench" @click="isDecorating = true">
          <span>🛠️</span> 装修
        </button>
      </div>
    </header>

    <!-- Main Virtual Room 2.5D Stage -->
    <main class="room-stage-section">
      <div class="room-stage" :class="[wallpaperClass, flooringClass]">
        <!-- Wall area -->
        <div class="room-wall">
          <div class="wall-decorations">
            <!-- Wall Photo Frame Hotspot -->
            <div
              class="hotspot wall-frame"
              title="双人相框与心愿册"
              @click="activeModal = 'backpack'"
            >
              <div class="frame-content">🖼️</div>
              <span class="hotspot-tag">甜蜜心愿</span>
            </div>

            <!-- Wall Mirror Hotspot -->
            <div
              class="hotspot wall-mirror"
              title="穿衣魔镜"
              @click="activeModal = 'wardrobe'"
            >
              <div class="mirror-glass">🪞</div>
              <span class="hotspot-tag">换装衣帽间</span>
            </div>
          </div>
        </div>

        <!-- Floor Area with 2.5D Isometric Grid & Furniture -->
        <div class="room-floor">
          <!-- Placed Furnitures Hotspots -->
          <div
            v-for="furn in placedFurnitures"
            :key="furn.instanceId"
            class="furniture-actor"
            :style="getFurniturePositionStyle(furn)"
            @click="handleFurnitureClick(furn)"
          >
            <!-- Special Hotspot Badges -->
            <div v-if="furn.catalogId.includes('tv.retro')" class="hotspot-bubble arcade">
              <span class="bubble-icon">🕹️</span>
              <span class="bubble-text">游戏机</span>
            </div>
            <div v-else-if="furn.catalogId.includes('desk.work')" class="hotspot-bubble job">
              <span class="bubble-icon">💻</span>
              <span class="bubble-text">日程工作</span>
            </div>
            <div v-else-if="furn.catalogId.includes('pet.bed')" class="hotspot-bubble pet">
              <span class="bubble-icon">🐾</span>
              <span class="bubble-text">小猫窝</span>
            </div>

            <div class="furniture-visual">{{ getFurnDef(furn.catalogId)?.icon || '🛋️' }}</div>
          </div>

          <!-- Characters In Room -->
          <!-- 1. Partner NPC on Sofa -->
          <div class="partner-actor" @click="handlePartnerClick">
            <div v-if="partnerBubble" class="speech-bubble partner">
              {{ partnerBubble }}
            </div>
            <div class="partner-visual">
              <span class="partner-icon">🧑‍💼</span>
              <span class="heart-pulse">💕</span>
            </div>
            <span class="character-name">{{ companion?.partnerName || '亲爱的' }}</span>
          </div>

          <!-- 2. Player Avatar -->
          <div class="avatar-actor" @click="activeModal = 'wardrobe'">
            <div class="avatar-doll-wrap">
              <PaperDoll
                :width="64"
                :height="90"
                :skin="avatarSkin"
                :equipped-slots="equippedSlots"
              />
            </div>
            <span class="character-name player">我 ✦</span>
          </div>

          <!-- 3. Pet roaming around -->
          <div class="pet-actor" @click="activeModal = 'companion'">
            <div v-if="isPetRewardReady" class="pet-reward-bubble">
              🎁 寻宝归来！
            </div>
            <div class="pet-visual">🐱</div>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Arcade Action Bar -->
    <footer class="home-footer">
      <button class="btn-launch-game" @click="$emit('start-game')">
        <span class="game-btn-icon">🎮</span>
        <div class="text-left">
          <div class="font-extrabold text-sm leading-tight">开玩“钢了钢”消除</div>
          <div class="text-[10px] text-pink-200">12 阶复杂造型 · 赢取专属心愿券</div>
        </div>
        <span class="arrow-icon">▶</span>
      </button>
    </footer>

    <!-- Grid Decoration Mode Overlay -->
    <FurnitureGridEditor
      v-if="isDecorating"
      @close="isDecorating = false"
      @cancel="isDecorating = false"
    />

    <!-- Modals -->
    <WardrobeModal v-if="activeModal === 'wardrobe'" @close="activeModal = null" />
    <JobModal v-if="activeModal === 'job'" @close="activeModal = null" />
    <CompanionModal v-if="activeModal === 'companion'" @close="activeModal = null" />
    <StoreModal v-if="activeModal === 'store'" @close="activeModal = null" />
    <GameCenterModal
      v-if="activeModal === 'arcade'"
      @close="activeModal = null"
      @start-gang="$emit('start-game'); activeModal = null"
    />
    <UniversalBackpackModal
      v-if="activeModal === 'backpack'"
      @close="activeModal = null"
      @open-wardrobe="activeModal = 'wardrobe'"
      @open-furniture-grid="isDecorating = true; activeModal = null"
      @redeem="handleRedeem"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PaperDoll from './PaperDoll.vue'
import WardrobeModal from './WardrobeModal.vue'
import JobModal from './JobModal.vue'
import CompanionModal from './CompanionModal.vue'
import StoreModal from './StoreModal.vue'
import GameCenterModal from './GameCenterModal.vue'
import UniversalBackpackModal from './UniversalBackpackModal.vue'
import FurnitureGridEditor from './FurnitureGridEditor.vue'
import {
  platformOverview,
  fetchPlatformOverview,
  interactCompanion,
  type PlacedFurniture
} from '../../utils/platformState'
import { ITEM_REGISTRY } from '../../../shared/domain/items/index'

const emit = defineEmits(['start-game', 'redeem-coupon'])

const activeModal = ref<'wardrobe' | 'job' | 'companion' | 'store' | 'arcade' | 'backpack' | null>(null)
const isDecorating = ref(false)
const partnerBubble = ref('')

onMounted(async () => {
  await fetchPlatformOverview()
})

const coins = computed(() => platformOverview.value?.coins || { gold: 100, heart: 10 })
const avatarSkin = computed(() => platformOverview.value?.avatar?.features?.skin || '#ffdbac')
const equippedSlots = computed(() => platformOverview.value?.avatar?.equippedSlots || {})
const placedFurnitures = computed(() => platformOverview.value?.homeSpace?.placedFurnitures || [])
const companion = computed(() => platformOverview.value?.companion)

const wallpaperClass = computed(() => `wp-${platformOverview.value?.homeSpace?.wallpaperId || 'cream'}`)
const flooringClass = computed(() => `fl-${platformOverview.value?.homeSpace?.flooringId || 'wood'}`)

const isJobComplete = computed(() => {
  const job = platformOverview.value?.idleJob
  if (!job || job.claimed) return false
  const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000
  return elapsed >= job.durationSeconds
})

const isPetRewardReady = computed(() => {
  const comp = companion.value
  if (!comp || comp.petStatus !== 'foraging' || !comp.petForageEndAt) return false
  return Date.now() >= new Date(comp.petForageEndAt).getTime()
})

function getFurnDef(catalogId: string) {
  return (ITEM_REGISTRY as any)[catalogId] || null
}

function getFurniturePositionStyle(furn: PlacedFurniture) {
  const zIndex = (furn.layer === 'rug' ? 10 : 30) + furn.y * 5 + furn.x
  return {
    left: `${furn.x * 10}%`,
    top: `${furn.y * 10}%`,
    zIndex
  }
}

function handleFurnitureClick(furn: PlacedFurniture) {
  if (isDecorating.value) return
  if (furn.catalogId.includes('tv.retro')) activeModal.value = 'arcade'
  else if (furn.catalogId.includes('desk.work')) activeModal.value = 'job'
  else if (furn.catalogId.includes('mirror.dresser')) activeModal.value = 'wardrobe'
  else if (furn.catalogId.includes('pet.bed')) activeModal.value = 'companion'
  else if (furn.catalogId.includes('frame.couple') || furn.catalogId.includes('sofa.modern')) activeModal.value = 'backpack'
}

async function handlePartnerClick() {
  try {
    const res = await interactCompanion('chat')
    partnerBubble.value = res.quote
    setTimeout(() => {
      partnerBubble.value = ''
    }, 4500)
  } catch (err: any) {
    partnerBubble.value = '今天也很喜欢你呀~ 💖'
  }
}

function handleRedeem(couponId: string) {
  emit('redeem-coupon', couponId)
}
</script>

<style scoped>
.home-hub-wrapper {
  width: 100%;
  max-width: 440px;
  min-height: 100svh;
  margin: auto;
  padding: max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fff7f9, #f7edf2);
  user-select: none;
  position: relative;
  overflow: hidden;
}

/* Header */
.home-header {
  width: 100%;
  padding: 0 4px;
}
.header-avatar {
  cursor: pointer;
  background: #fff;
  border-radius: 50%;
  padding: 2px;
  box-shadow: 0 2px 6px rgba(100, 30, 50, 0.1);
}
.currency-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(100, 30, 50, 0.06);
}
.currency-badge.gold {
  background: #fff8e1;
  color: #b78103;
  border: 1px solid #ffe082;
}
.currency-badge.heart {
  background: #fce4ec;
  color: #c2185b;
  border: 1px solid #f8bbd0;
}
.plus-btn {
  font-size: 11px;
  background: #ffd54f;
  color: #5d4037;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-left: 2px;
}
.quick-nav-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.nav-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #ecd5da;
  color: #6d4251;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(100, 30, 50, 0.04);
}
.nav-chip.wrench {
  background: #fbf0f3;
  color: #9c4d68;
}
.notify-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 15px;
  height: 15px;
  background: #e91e63;
  color: white;
  font-size: 10px;
  font-weight: 800;
  border-radius: 50%;
  display: grid;
  place-items: center;
  animation: pulse-dot 1.5s infinite;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

/* Room Stage */
.room-stage-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
}
.room-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1.05;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(90, 40, 60, 0.12), inset 0 2px 10px rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
}

/* Wallpaper and Floor styling */
.room-wall {
  height: 38%;
  background: linear-gradient(180deg, #fdf6ec, #faeedb);
  border-bottom: 4px solid #ebd0bb;
  position: relative;
  padding: 10px 14px;
}
.wall-decorations {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}
.hotspot {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.15s;
}
.hotspot:hover {
  transform: translateY(-2px);
}
.frame-content {
  font-size: 34px;
  filter: drop-shadow(0 4px 6px rgba(80, 40, 20, 0.15));
}
.mirror-glass {
  font-size: 32px;
  filter: drop-shadow(0 4px 6px rgba(80, 40, 20, 0.15));
}
.hotspot-tag {
  font-size: 9px;
  font-weight: 700;
  color: #7b4c59;
  background: rgba(255, 255, 255, 0.88);
  padding: 1px 6px;
  border-radius: 6px;
  margin-top: 2px;
}

.room-floor {
  flex: 1;
  background: repeating-linear-gradient(45deg, #f4e8dc, #f4e8dc 20px, #eeddcd 20px, #eeddcd 40px);
  position: relative;
  overflow: hidden;
}

/* Placed Furnitures */
.furniture-actor {
  position: absolute;
  cursor: pointer;
  transition: transform 0.15s;
}
.furniture-actor:hover {
  transform: scale(1.06);
}
.furniture-visual {
  font-size: 36px;
  filter: drop-shadow(0 6px 8px rgba(80, 30, 45, 0.15));
}
.hotspot-bubble {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #ebd8dc;
  border-radius: 12px;
  padding: 2px 7px;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(80, 30, 45, 0.12);
  pointer-events: none;
}
.bubble-icon {
  font-size: 12px;
}
.bubble-text {
  font-size: 9px;
  font-weight: 700;
  color: #6d4251;
}

/* Characters */
.partner-actor {
  position: absolute;
  left: 36%;
  top: 38%;
  z-index: 40;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.partner-visual {
  position: relative;
  font-size: 36px;
  filter: drop-shadow(0 4px 8px rgba(70, 20, 35, 0.18));
}
.heart-pulse {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 16px;
  animation: heart-bounce 1.8s infinite ease-in-out;
}
@keyframes heart-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.15); }
}

.avatar-actor {
  position: absolute;
  left: 55%;
  top: 48%;
  z-index: 60;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avatar-doll-wrap {
  animation: idle-breath 3.5s infinite ease-in-out;
}
@keyframes idle-breath {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.character-name {
  font-size: 9px;
  font-weight: 700;
  color: #5c3a44;
  background: rgba(255, 255, 255, 0.88);
  padding: 1px 6px;
  border-radius: 8px;
  margin-top: 2px;
  box-shadow: 0 2px 4px rgba(70, 20, 35, 0.08);
}
.character-name.player {
  background: #fce4ec;
  color: #880e4f;
}

.pet-actor {
  position: absolute;
  left: 20%;
  top: 72%;
  z-index: 70;
  cursor: pointer;
  font-size: 28px;
  animation: pet-wander 6s infinite ease-in-out alternate;
}
@keyframes pet-wander {
  0% { transform: translateX(0); }
  100% { transform: translateX(25px); }
}
.pet-reward-bubble {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffe082;
  color: #e65100;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 8px;
  white-space: nowrap;
  animation: pulse-dot 1.2s infinite;
}

.speech-bubble.partner {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border: 1px solid #f48fb1;
  color: #ad1457;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(173, 20, 87, 0.16);
  z-index: 100;
  margin-bottom: 6px;
}

/* Footer Launch Button */
.home-footer {
  width: 100%;
  padding-top: 6px;
}
.btn-launch-game {
  width: 100%;
  padding: 12px 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #a8516d, #833950);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 6px 18px rgba(131, 57, 80, 0.28);
  transition: transform 0.1s;
}
.btn-launch-game:active {
  transform: scale(0.98);
}
.game-btn-icon {
  font-size: 26px;
}
.arrow-icon {
  margin-left: auto;
  font-size: 14px;
  opacity: 0.8;
}
</style>
