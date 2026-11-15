<template>
  <div class="home-hub-wrapper">
    <!-- Top Status Bar -->
    <header class="home-header">
      <div class="flex items-center justify-between gap-2">
        <!-- Profile & Level Badge -->
        <div class="flex items-center gap-2.5">
          <div class="header-avatar" title="点击打开衣帽间" @click="activeModal = 'wardrobe'">
            <PaperDoll
              :width="36"
              :height="50"
              :skin="avatarSkin"
              :equipped-slots="equippedSlots"
            />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-extrabold text-sm text-stone-800 leading-tight">温馨小家</span>
              <span class="level-pill">Lv.3 伴侣</span>
            </div>
            <div class="text-[10px] text-stone-500 font-medium mt-0.5">甜蜜纪念 · 虚拟元宇宙平台</div>
          </div>
        </div>

        <!-- Currencies (Clickable to open Store & Companion) -->
        <div class="flex items-center gap-2">
          <div class="currency-badge gold" title="金币商城" @click="activeModal = 'store'">
            <span>🪙</span>
            <span class="coin-value">{{ coins.gold }}</span>
            <span class="plus-btn">+</span>
          </div>
          <div class="currency-badge heart" title="伴侣爱心币" @click="activeModal = 'companion'">
            <span>💖</span>
            <span class="coin-value">{{ coins.heart }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Navigation Chips Bar -->
      <div class="quick-nav-bar mt-2.5">
        <button class="nav-chip" @click="activeModal = 'backpack'">
          <span class="chip-icon">🎒</span> 背包
        </button>
        <button class="nav-chip" @click="activeModal = 'store'">
          <span class="chip-icon">🏪</span> 商城
        </button>
        <button class="nav-chip" @click="activeModal = 'job'">
          <span class="chip-icon">💻</span> 打工
          <span v-if="isJobComplete" class="notify-dot">!</span>
        </button>
        <button class="nav-chip" @click="activeModal = 'companion'">
          <span class="chip-icon">🐾</span> 宠物
          <span v-if="isPetRewardReady" class="notify-dot">!</span>
        </button>
        <button class="nav-chip wrench" @click="isDecorating = true">
          <span class="chip-icon">🛠️</span> 装修
        </button>
      </div>
    </header>

    <!-- Main 2.5D Isometric Room Stage -->
    <main class="room-stage-section">
      <div class="room-isometric-box">
        <!-- Room Back Wall (Cream Wall with Arched Window & Sun Rays) -->
        <div class="room-wall">
          <!-- Arched French Window with Sunbeam -->
          <div class="arched-window">
            <div class="window-pane"></div>
            <div class="sunbeam-light"></div>
          </div>

          <!-- Wall Decor Hotspots -->
          <div class="wall-hotspots">
            <!-- Couple Photo Frame on Wall -->
            <div
              class="hotspot wall-frame wall-hotspot-item frame"
              title="双人相框与心愿册"
              @click="activeModal = 'backpack'"
            >
              <IsometricFurniture catalog-id="furniture.frame.couple" :width="48" :height="58" />
              <div class="hotspot-pill">💌 甜蜜心愿</div>
            </div>

            <!-- Arched Dresser Mirror on Wall -->
            <div
              class="hotspot wall-mirror wall-hotspot-item mirror"
              title="穿衣魔镜"
              @click="activeModal = 'wardrobe'"
            >
              <IsometricFurniture catalog-id="furniture.mirror.dresser" :width="56" :height="76" />
              <div class="hotspot-pill">🪞 衣帽间</div>
            </div>
          </div>

          <!-- Wall Baseboard Molding -->
          <div class="wall-baseboard"></div>
        </div>

        <!-- Room Parquet Floor -->
        <div class="room-floor">
          <!-- Ambient Shadows Layer -->
          <div class="floor-ambient-glow"></div>

          <!-- Placed Furnitures (Rendered via IsometricFurniture Vector Engine) -->
          <div
            v-for="furn in placedFurnitures"
            :key="furn.instanceId"
            class="furniture-instance"
            :style="getFurniturePositionStyle(furn)"
            @click="handleFurnitureClick(furn)"
          >
            <!-- Hotspot Pill Badge for Interactive Items -->
            <div v-if="furn.catalogId.includes('tv.retro')" class="hotspot-pill arcade">
              🕹️ 游戏机
            </div>
            <div v-else-if="furn.catalogId.includes('desk.work')" class="hotspot-pill job">
              💻 日程工作
            </div>
            <div v-else-if="furn.catalogId.includes('pet.bed')" class="hotspot-pill pet">
              🐾 暖暖猫窝
            </div>

            <IsometricFurniture
              :catalog-id="furn.catalogId"
              :width="getFurnWidth(furn)"
              :height="getFurnHeight(furn)"
            />
          </div>

          <!-- ================= CHARACTERS IN ROOM ================= -->
          <!-- 1. Partner NPC (Seated comfortably on sofa) -->
          <div class="room-character partner" @click="handlePartnerClick">
            <!-- Floating Love Quote Bubble -->
            <Transition name="fade">
              <div v-if="partnerBubble" class="love-speech-bubble">
                {{ partnerBubble }}
              </div>
            </Transition>

            <div class="partner-doll-box">
              <PaperDoll
                :width="64"
                :height="92"
                :skin="'#ffdbac'"
                :hair-color="'#2b2320'"
                :lip-color="'#b08968'"
                :pose="'sitting'"
                :equipped-slots="{
                  hair: 'wardrobe.hair.black_short',
                  top: 'wardrobe.top.couple_suit',
                  bottom: 'wardrobe.bottom.denim_jeans',
                  shoes: 'wardrobe.shoes.leather'
                }"
              />
              <span class="heart-indicator">💕</span>
            </div>
            <div class="char-name-tag">{{ companion?.partnerName || '亲爱的' }}</div>
          </div>

          <!-- 2. Player Avatar (Standing gracefully beside table) -->
          <div class="room-character player" @click="activeModal = 'wardrobe'">
            <div class="player-doll-box">
              <PaperDoll
                :width="68"
                :height="100"
                :skin="avatarSkin"
                :equipped-slots="equippedSlots"
                :pose="'standing'"
              />
            </div>
            <div class="char-name-tag player-tag">我 ✦</div>
          </div>

          <!-- 3. Cute Pet (Roaming around plush rug) -->
          <div class="room-pet" @click="activeModal = 'companion'">
            <div v-if="isPetRewardReady" class="pet-gift-bubble">
              🎁 寻宝归来！
            </div>
            <div class="pet-sprite">🐱</div>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Arcade Action Bar -->
    <footer class="home-footer">
      <button class="btn-launch-game" @click="$emit('start-game')">
        <span class="game-btn-icon">🎮</span>
        <div class="text-left flex-1">
          <div class="font-extrabold text-sm leading-tight text-white">开启“钢了钢”消除对局</div>
          <div class="text-[11px] text-pink-200 font-medium">12 阶复杂造型 · 局内道具消耗 · 赢专属心愿券</div>
        </div>
        <span class="arrow-btn">▶</span>
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
import IsometricFurniture from './IsometricFurniture.vue'
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
const placedFurnitures = computed(() => {
  const list = platformOverview.value?.homeSpace?.placedFurnitures || []
  // Filter out wall items (mirror & frame) since they are rendered on the wall
  return list.filter((f: any) => !f.catalogId.includes('mirror') && !f.catalogId.includes('frame'))
})
const companion = computed(() => platformOverview.value?.companion)

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

function getFurnWidth(furn: PlacedFurniture) {
  if (furn.catalogId.includes('sofa')) return 110
  if (furn.catalogId.includes('rug')) return 105
  if (furn.catalogId.includes('desk')) return 95
  if (furn.catalogId.includes('retro')) return 78
  if (furn.catalogId.includes('pet')) return 88
  return 75
}

function getFurnHeight(furn: PlacedFurniture) {
  if (furn.catalogId.includes('sofa')) return 75
  if (furn.catalogId.includes('rug')) return 85
  if (furn.catalogId.includes('desk')) return 80
  if (furn.catalogId.includes('retro')) return 85
  if (furn.catalogId.includes('pet')) return 75
  return 65
}

function getFurniturePositionStyle(furn: PlacedFurniture) {
  const zIndex = (furn.layer === 'rug' ? 10 : 30) + furn.y * 5 + furn.x
  return {
    left: `${furn.x * 9.5}%`,
    top: `${furn.y * 9.5}%`,
    zIndex
  }
}

function handleFurnitureClick(furn: PlacedFurniture) {
  if (isDecorating.value) return
  if (furn.catalogId.includes('tv.retro')) activeModal.value = 'arcade'
  else if (furn.catalogId.includes('desk.work')) activeModal.value = 'job'
  else if (furn.catalogId.includes('pet.bed')) activeModal.value = 'companion'
  else if (furn.catalogId.includes('sofa.modern')) activeModal.value = 'backpack'
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
  background: linear-gradient(180deg, #fff8fa, #fbf2f6);
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
  background: #ffffff;
  border-radius: 50%;
  padding: 2px;
  box-shadow: 0 4px 10px rgba(131, 57, 80, 0.12);
  border: 1.5px solid #ffccd5;
  transition: transform 0.15s;
}
.header-avatar:hover {
  transform: scale(1.06);
}
.level-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  background: #fce4ec;
  color: #c2185b;
}

.currency-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(100, 30, 50, 0.06);
  transition: transform 0.15s;
}
.currency-badge:hover {
  transform: scale(1.05);
}
.currency-badge.gold {
  background: #fffde7;
  color: #f57f17;
  border: 1px solid #ffe082;
}
.currency-badge.heart {
  background: #fce4ec;
  color: #ad1457;
  border: 1px solid #f8bbd0;
}
.coin-value {
  font-variant-numeric: tabular-nums;
}
.plus-btn {
  font-size: 10px;
  background: #ffd54f;
  color: #5d4037;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-left: 1px;
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
  padding: 6px 12px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #eedde1;
  color: #6d4251;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(100, 30, 50, 0.05);
  white-space: nowrap;
  transition: all 0.15s;
}
.nav-chip:hover {
  border-color: #c2185b;
}
.nav-chip.wrench {
  background: #fff0f5;
  color: #9c4d68;
}
.chip-icon {
  font-size: 13px;
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
  font-weight: 900;
  border-radius: 50%;
  display: grid;
  place-items: center;
  animation: pulse-dot 1.5s infinite;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

/* ================= ROOM ISOMETRIC STAGE ================= */
.room-stage-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.room-isometric-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1.08;
  border-radius: 26px;
  overflow: hidden;
  box-shadow: 0 16px 45px rgba(90, 35, 55, 0.14), inset 0 2px 8px rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  border: 2px solid #f7e2e8;
}

/* Room Wall */
.room-wall {
  height: 38%;
  background: linear-gradient(180deg, #fef8f4, #faede3);
  position: relative;
  padding: 10px 16px;
}
.arched-window {
  position: absolute;
  left: 12px;
  top: 10px;
  width: 48px;
  height: 64px;
  border: 2.5px solid #ffffff;
  border-radius: 24px 24px 4px 4px;
  background: linear-gradient(180deg, #b3e5fc, #e1f5fe);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.window-pane {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 30px, #ffffff 30px, #ffffff 32px),
              repeating-linear-gradient(90deg, transparent, transparent 22px, #ffffff 22px, #ffffff 24px);
}
.sunbeam-light {
  position: absolute;
  left: -20px;
  top: 0;
  width: 90px;
  height: 120px;
  background: linear-gradient(135deg, rgba(255, 253, 231, 0.45) 0%, rgba(255, 253, 231, 0) 70%);
  transform: rotate(25deg);
  pointer-events: none;
}

.wall-hotspots {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  height: 100%;
  padding-right: 10px;
}
.wall-hotspot-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.15s;
}
.wall-hotspot-item:hover {
  transform: translateY(-3px);
}
.hotspot-pill {
  font-size: 9px;
  font-weight: 700;
  color: #7b4c59;
  background: rgba(255, 255, 255, 0.94);
  padding: 2px 7px;
  border-radius: 8px;
  margin-top: 2px;
  box-shadow: 0 2px 6px rgba(100, 30, 50, 0.08);
  white-space: nowrap;
}

.wall-baseboard {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: #e3cbb9;
  border-top: 1px solid #f0dece;
}

/* Room Parquet Floor */
.room-floor {
  flex: 1;
  background: #f7ede3;
  background-image:
    linear-gradient(45deg, #eedbc9 25%, transparent 25%),
    linear-gradient(-45deg, #eedbc9 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eedbc9 75%),
    linear-gradient(-45deg, transparent 75%, #eedbc9 75%);
  background-size: 32px 32px;
  background-position: 0 0, 0 16px, 16px -16px, -16px 0px;
  position: relative;
  overflow: hidden;
}

.floor-ambient-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center 40%, rgba(255, 255, 255, 0.45) 0%, rgba(210, 180, 160, 0.15) 100%);
  pointer-events: none;
}

/* Placed Furnitures */
.furniture-instance {
  position: absolute;
  cursor: pointer;
  transition: transform 0.15s;
}
.furniture-instance:hover {
  transform: scale(1.05);
}
.hotspot-pill.arcade {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #e91e63;
  color: white;
  z-index: 99;
}
.hotspot-pill.job {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #3949ab;
  color: white;
  z-index: 99;
}
.hotspot-pill.pet {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff9800;
  color: white;
  z-index: 99;
}

/* Characters */
.room-character.partner {
  position: absolute;
  left: 38%;
  top: 36%;
  z-index: 45;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.partner-doll-box {
  position: relative;
  animation: breathing 4s infinite ease-in-out;
}
.heart-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 16px;
  animation: heart-float 1.8s infinite ease-in-out;
}
@keyframes heart-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.15); }
}

.love-speech-bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border: 1.5px solid #f48fb1;
  color: #ad1457;
  padding: 6px 12px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(173, 20, 87, 0.16);
  z-index: 100;
  margin-bottom: 6px;
}

.room-character.player {
  position: absolute;
  left: 60%;
  top: 48%;
  z-index: 60;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.player-doll-box {
  animation: breathing 3.6s infinite ease-in-out;
}
@keyframes breathing {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.char-name-tag {
  font-size: 9px;
  font-weight: 700;
  color: #5c3a44;
  background: rgba(255, 255, 255, 0.94);
  padding: 1px 7px;
  border-radius: 8px;
  margin-top: 1px;
  box-shadow: 0 2px 5px rgba(70, 20, 35, 0.08);
}
.char-name-tag.player-tag {
  background: #fce4ec;
  color: #880e4f;
}

.room-pet {
  position: absolute;
  left: 18%;
  top: 72%;
  z-index: 70;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pet-sprite {
  font-size: 30px;
  filter: drop-shadow(0 4px 6px rgba(70, 20, 35, 0.16));
  animation: pet-bounce 2s infinite ease-in-out;
}
@keyframes pet-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08) translateY(-2px); }
}
.pet-gift-bubble {
  position: absolute;
  top: -18px;
  background: #ffe082;
  color: #e65100;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 8px;
  white-space: nowrap;
  animation: pulse-dot 1.2s infinite;
}

/* Footer Button */
.home-footer {
  width: 100%;
  padding-top: 8px;
}
.btn-launch-game {
  width: 100%;
  padding: 12px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #a8516d, #833950);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 6px 20px rgba(131, 57, 80, 0.28);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-launch-game:active {
  transform: scale(0.98);
}
.game-btn-icon {
  font-size: 26px;
}
.arrow-btn {
  font-size: 14px;
  color: #ffffff;
  opacity: 0.8;
}
</style>
