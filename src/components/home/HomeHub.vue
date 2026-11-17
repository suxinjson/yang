<template>
  <div class="home-hub-wrapper">
    <!-- Top Status Bar -->
    <header class="home-header">
      <!-- Row 1: Profile & Currencies -->
      <div class="flex items-center justify-between gap-2">
        <!-- Profile & Level Badge -->
        <div class="flex items-center gap-2.5">
          <div class="header-avatar" title="点击打开衣帽间" @click="activeModal = 'wardrobe'">
            <PaperDoll
              :width="36"
              :height="50"
              :gender="myGender"
              :skin="avatarSkin"
              :hair-color="avatarHairColor"
              :eye-color="avatarEyeColor"
              :lip-color="avatarLipColor"
              :equipped-slots="equippedSlots"
            />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-extrabold text-sm text-stone-800 leading-tight">{{ myNickname }}</span>
              <span class="level-pill">{{ myGender === 'male' ? '自然 · 男生' : '自然 · 女生' }}</span>
            </div>
            <div class="text-[10px] text-stone-500 font-medium mt-0.5">
              生活的留白 · 我们的小家
            </div>
          </div>
        </div>

        <!-- Currencies (Clickable to open Store & Companion) -->
        <div class="flex items-center gap-2">
          <div class="currency-badge gold" title="金币商城" @click="activeModal = 'store'">
            <span><DesignIcon name="coin" /></span>
            <span class="coin-value">{{ coins.gold }}</span>
            <span class="plus-btn">+</span>
          </div>
          <div class="currency-badge heart" title="伴侣爱心币" @click="activeModal = 'companion'">
            <span><DesignIcon name="heart" /></span>
            <span class="coin-value">{{ coins.heart }}</span>
          </div>
        </div>
      </div>

      <!-- Row 2: Room Switch Bar & Quick Action Pills -->
      <div class="flex items-center justify-between gap-2 mt-2">
        <!-- Room Selector Pill -->
        <div class="room-selector-pill" title="点击切换或进入他人房间" @click="promptChangeRoom">
          <span class="room-icon"><DesignIcon name="room" /></span>
          <span class="room-text">房间 #{{ currentRoomId }}</span>
          <span class="room-badge">{{ 1 + otherMembers.length }}人同房</span>
          <span class="switch-hint">切换</span>
        </div>

        <!-- Top Shortcuts: Leaderboard & Auth -->
        <div class="flex items-center gap-1.5">
          <button class="top-shortcut-btn leader" title="查看排行榜" @click="activeModal = 'leaderboard'">
            <span><DesignIcon name="trophy" /></span> 榜单
          </button>
          <button class="top-shortcut-btn auth" title="个人账号中心" @click="activeModal = 'auth'">
            <span><DesignIcon name="user" /></span> {{ authUser ? '账号' : '登录/注册' }}
          </button>
        </div>
      </div>

      <!-- Quick Navigation Chips Bar -->
      <div class="quick-nav-bar mt-2">
        <button class="nav-chip" @click="activeModal = 'backpack'">
          <span class="chip-icon"><DesignIcon name="bag" /></span> 个人背包
        </button>
        <button class="nav-chip wish" @click="activeModal = 'wish'">
          <span class="chip-icon"><DesignIcon name="heart" /></span> 共享心愿
        </button>
        <button class="nav-chip" @click="activeModal = 'store'">
          <span class="chip-icon"><DesignIcon name="shop" /></span> 商城
        </button>
        <button class="nav-chip" @click="activeModal = 'job'">
          <span class="chip-icon"><DesignIcon name="work" /></span> 打工
          <span v-if="isJobComplete" class="notify-dot">!</span>
        </button>
        <button class="nav-chip" @click="activeModal = 'companion'">
          <span class="chip-icon"><DesignIcon name="pet" /></span> 宠物
          <span v-if="isPetRewardReady" class="notify-dot">!</span>
        </button>
        <button class="nav-chip wrench" @click="isDecorating = true">
          <span class="chip-icon"><DesignIcon name="tools" /></span> 装修
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
            <!-- Couple Photo Frame on Wall (Opens Shared Room Wishes) -->
            <div
              class="hotspot wall-frame wall-hotspot-item frame"
              title="房间共享心愿单"
              @click="activeModal = 'wish'"
            >
              <IsometricFurniture catalog-id="furniture.frame.couple" :width="48" :height="58" />
              <div class="hotspot-pill"><DesignIcon name="heart" /> 共享心愿</div>
            </div>

            <!-- Arched Dresser Mirror on Wall -->
            <div
              class="hotspot wall-mirror wall-hotspot-item mirror"
              title="穿衣魔镜"
              @click="activeModal = 'wardrobe'"
            >
              <IsometricFurniture catalog-id="furniture.mirror.dresser" :width="56" :height="76" />
              <div class="hotspot-pill"><DesignIcon name="mirror" /> 衣帽间</div>
            </div>
          </div>

          <!-- Wall Baseboard Molding -->
          <div class="wall-baseboard"></div>
        </div>

        <!-- Room Parquet Floor (Supports Click to Walk & Roam) -->
        <div ref="floorRef" class="room-floor" @click="handleFloorClick">
          <!-- Ambient Shadows Layer -->
          <div class="floor-ambient-glow"></div>

          <!-- Click Ripple Indicator -->
          <div
            v-if="clickRipple"
            class="floor-click-ripple"
            :style="{ left: `${clickRipple.x}%`, top: `${clickRipple.y}%` }"
          ></div>

          <!-- Placed Furnitures (Rendered via IsometricFurniture Vector Engine) -->
          <div
            v-for="furn in placedFurnitures"
            :key="furn.instanceId"
            class="furniture-instance"
            :style="getFurniturePositionStyle(furn)"
            @click.stop="handleFurnitureClick(furn)"
          >
            <!-- Hotspot Pill Badge for Interactive Items -->
            <div v-if="furn.catalogId.includes('tv.retro')" class="hotspot-pill arcade">
              🕹️ 游戏机
            </div>
            <div v-else-if="furn.catalogId.includes('desk.work')" class="hotspot-pill job">
              <DesignIcon name="work" /> 日程工作
            </div>
            <div v-else-if="furn.catalogId.includes('pet.bed')" class="hotspot-pill pet">
              <DesignIcon name="pet" /> 暖暖猫窝
            </div>

            <IsometricFurniture
              :catalog-id="furn.catalogId"
              :width="getFurnWidth(furn)"
              :height="getFurnHeight(furn)"
            />
          </div>

          <!-- ================= CHARACTERS IN ROOM ================= -->
          <!-- 1. Partner NPC (Seated comfortably on sofa when present) -->
          <div
            v-if="companion"
            class="room-character partner"
            @click.stop="handlePartnerClick"
          >
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
                :gender="myGender === 'male' ? 'female' : 'male'"
                :skin="myGender === 'male' ? '#ffd1dc' : '#ffdbac'"
                :hair-color="myGender === 'male' ? '#5d4037' : '#2b2320'"
                :lip-color="myGender === 'male' ? '#e57373' : '#b08968'"
                :pose="'sitting'"
                :equipped-slots="myGender === 'male' ? {
                  hair: 'wardrobe.hair.wavy',
                  top: 'wardrobe.top.pink_hoodie',
                  bottom: 'wardrobe.bottom.plaid_skirt',
                  shoes: 'wardrobe.shoes.sneakers'
                } : {
                  hair: 'wardrobe.hair.black_short',
                  top: 'wardrobe.top.couple_suit',
                  bottom: 'wardrobe.bottom.denim_jeans',
                  shoes: 'wardrobe.shoes.leather'
                }"
              />
              <span class="heart-indicator"><DesignIcon name="heart" /></span>
            </div>
            <div class="char-name-tag">{{ companion?.partnerName || '亲爱的' }}</div>
          </div>

          <!-- 2. Other Room Members (Multiplayer Co-presence in Room) -->
          <div
            v-for="member in otherMembers"
            :key="member.profileId"
            class="room-character dynamic-character peer-player"
            :style="{
              left: `${member.x * 9.5}%`,
              top: `${member.y * 9.5}%`,
              zIndex: Math.round(member.y * 9.5 + 32)
            }"
            @click.stop="handlePeerClick(member)"
          >
            <div class="player-doll-box">
              <PaperDoll
                :width="62"
                :height="94"
                :gender="member.gender || 'female'"
                :skin="member.avatar?.features?.skin || '#ffdbac'"
                :hair-color="member.avatar?.features?.hairColor || '#2b2320'"
                :eye-color="member.avatar?.features?.eyeColor || '#4e342e'"
                :lip-color="member.avatar?.features?.lipColor || '#e57373'"
                :equipped-slots="member.avatar?.equippedSlots || {}"
                :pose="'standing'"
              />
            </div>
            <div class="char-name-tag peer-tag">{{ member.nickname }}</div>
          </div>

          <!-- 3. My Player Avatar (Click Floor to Move Smoothly) -->
          <div
            class="room-character dynamic-character my-player"
            :style="{
              left: `${playerPos.x}%`,
              top: `${playerPos.y}%`,
              zIndex: Math.round(playerPos.y + 35)
            }"
            @click.stop="activeModal = 'wardrobe'"
          >
            <!-- Movement Speech Bubble -->
            <Transition name="fade">
              <div v-if="playerBubble" class="love-speech-bubble my-bubble">
                {{ playerBubble }}
              </div>
            </Transition>

            <div class="player-doll-box" :class="{ 'is-walking': isWalking }">
              <PaperDoll
                :width="68"
                :height="100"
                :gender="myGender"
                :skin="avatarSkin"
                :hair-color="avatarHairColor"
                :eye-color="avatarEyeColor"
                :lip-color="avatarLipColor"
                :equipped-slots="equippedSlots"
                :pose="isSittingOnSofa ? 'sitting' : 'standing'"
              />
            </div>
            <div class="char-name-tag player-tag">
              {{ myNickname }} ✦ (我)
            </div>
          </div>

          <!-- 4. Cute Pet (Roaming around plush rug) -->
          <div class="room-pet" @click.stop="activeModal = 'companion'">
            <div v-if="isPetRewardReady" class="pet-gift-bubble">
              <DesignIcon name="gift" /> 寻宝归来！
            </div>
            <PetCompanion :type="companion?.petType" roaming :away="companion?.petStatus === 'foraging'" />
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Arcade Action Bar -->
    <footer class="home-footer">
      <button class="btn-launch-game" @click="$emit('start-game')">
        <span class="game-btn-icon"><DesignIcon name="game" /></span>
        <div class="text-left flex-1">
          <div class="font-extrabold text-sm leading-tight text-white">开启“钢了钢”消除对局</div>
          <div class="text-[11px] text-pink-200 font-medium">12 阶复杂造型 · 赢专属心愿券 · 冲榜登顶</div>
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
    <AuthModal
      v-if="activeModal === 'auth'"
      @close="activeModal = null"
      @auth-changed="handleAuthChanged"
    />
    <LeaderboardModal
      v-if="activeModal === 'leaderboard'"
      @close="activeModal = null"
    />
    <SharedWishModal
      v-if="activeModal === 'wish'"
      :room-id="currentRoomId"
      @close="activeModal = null"
    />
  </div>
</template>

<script setup lang="ts">
import DesignIcon from '../DesignIcon.vue'
import PetCompanion from './PetCompanion.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PaperDoll from './PaperDoll.vue'
import IsometricFurniture from './IsometricFurniture.vue'
import WardrobeModal from './WardrobeModal.vue'
import JobModal from './JobModal.vue'
import CompanionModal from './CompanionModal.vue'
import StoreModal from './StoreModal.vue'
import GameCenterModal from './GameCenterModal.vue'
import UniversalBackpackModal from './UniversalBackpackModal.vue'
import FurnitureGridEditor from './FurnitureGridEditor.vue'
import AuthModal from './AuthModal.vue'
import LeaderboardModal from './LeaderboardModal.vue'
import SharedWishModal from './SharedWishModal.vue'
import {
  platformOverview,
  fetchPlatformOverview,
  interactCompanion,
  syncRoomRoaming,
  type PlacedFurniture,
  type RoomMember
} from '../../utils/platformState'
import { getStoredAuthUser, type AuthUser } from '../../utils/backpack'

const emit = defineEmits(['start-game', 'redeem-coupon'])

const activeModal = ref<
  'wardrobe' | 'job' | 'companion' | 'store' | 'arcade' | 'backpack' | 'auth' | 'leaderboard' | 'wish' | null
>(null)

const isDecorating = ref(false)
const partnerBubble = ref('')
const playerBubble = ref('')
const isWalking = ref(false)
const isSittingOnSofa = ref(false)

const floorRef = ref<HTMLElement | null>(null)
const clickRipple = ref<{ x: number; y: number } | null>(null)
const playerPos = ref({ x: 58, y: 52 })

// Room & Multiplayer state
const currentRoomId = ref('666')
const roomMembers = ref<RoomMember[]>([])
const authUser = ref<AuthUser | null>(getStoredAuthUser())

let syncTimer: any = null

onMounted(async () => {
  // 0ms cached data is already hydrated in platformOverview
  // Fetch fresh server state
  await fetchPlatformOverview()
  await syncRoomPresence()
  syncTimer = setInterval(syncRoomPresence, 8000)
})

onUnmounted(() => {
  if (syncTimer) clearInterval(syncTimer)
})

const myGender = computed(() => {
  return authUser.value?.gender || platformOverview.value?.avatar?.features?.gender || 'female'
})

const myNickname = computed(() => {
  return authUser.value?.nickname || (myGender.value === 'male' ? '阳光大男孩' : '元气小仙女')
})

const coins = computed(() => platformOverview.value?.coins || { gold: 100, heart: 10 })
const avatarSkin = computed(() => platformOverview.value?.avatar?.features?.skin || (myGender.value === 'female' ? '#ffd1dc' : '#ffdbac'))
const avatarHairColor = computed(() => platformOverview.value?.avatar?.features?.hairColor || '#2b2320')
const avatarEyeColor = computed(() => platformOverview.value?.avatar?.features?.eyeColor || (myGender.value === 'male' ? '#3a506b' : '#4e342e'))
const avatarLipColor = computed(() => platformOverview.value?.avatar?.features?.lipColor || (myGender.value === 'male' ? '#c08081' : '#e57373'))
const equippedSlots = computed(() => platformOverview.value?.avatar?.equippedSlots || {})

const placedFurnitures = computed(() => {
  const list = platformOverview.value?.homeSpace?.placedFurnitures || []
  return list.filter((f: any) => !f.catalogId.includes('mirror') && !f.catalogId.includes('frame'))
})

const companion = computed(() => platformOverview.value?.companion)

// Filter out my own profile from peer members
const otherMembers = computed(() => {
  const myProfileId = platformOverview.value?.profileId
  return roomMembers.value.filter(m => m.profileId !== myProfileId)
})

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

// Smoothly walk player to clicked coordinate on floor
function handleFloorClick(e: MouseEvent) {
  if (isDecorating.value || !floorRef.value) return
  const rect = floorRef.value.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top

  const pctX = Math.max(5, Math.min(88, (clickX / rect.width) * 100))
  const pctY = Math.max(10, Math.min(84, (clickY / rect.height) * 100))

  clickRipple.value = { x: pctX, y: pctY }
  setTimeout(() => {
    clickRipple.value = null
  }, 600)

  // Smooth walk
  isSittingOnSofa.value = false
  isWalking.value = true
  playerPos.value = { x: pctX, y: pctY }

  setTimeout(() => {
    isWalking.value = false
  }, 450)

  // Sync my grid coord to server (grid 0..9)
  const gridX = Math.round(pctX / 9.5)
  const gridY = Math.round(pctY / 9.5)
  syncRoomRoaming(currentRoomId.value, gridX, gridY).catch(() => {})
}

// Click on Furniture -> Character walks to it, then triggers interaction
function handleFurnitureClick(furn: PlacedFurniture) {
  if (isDecorating.value) return
  // Move player beside furniture
  const targetX = Math.max(8, Math.min(85, furn.x * 9.5 + 4))
  const targetY = Math.max(10, Math.min(82, furn.y * 9.5 + 6))
  isWalking.value = true
  playerPos.value = { x: targetX, y: targetY }

  setTimeout(() => {
    isWalking.value = false
    if (furn.catalogId.includes('tv.retro')) {
      activeModal.value = 'arcade'
    } else if (furn.catalogId.includes('desk.work')) {
      activeModal.value = 'job'
    } else if (furn.catalogId.includes('pet.bed')) {
      activeModal.value = 'companion'
    } else if (furn.catalogId.includes('sofa.modern')) {
      isSittingOnSofa.value = true
      playerBubble.value = '在沙发上好舒服呀~ ☕'
      setTimeout(() => {
        playerBubble.value = ''
      }, 3500)
    }
  }, 400)
}

function handlePeerClick(member: RoomMember) {
  playerBubble.value = `你好呀，${member.nickname}！✨`
  setTimeout(() => {
    playerBubble.value = ''
  }, 3000)
}

async function syncRoomPresence() {
  try {
    const gridX = Math.round(playerPos.value.x / 9.5)
    const gridY = Math.round(playerPos.value.y / 9.5)
    const res = await syncRoomRoaming(currentRoomId.value, gridX, gridY)
    if (res.members) {
      roomMembers.value = res.members
    }
  } catch {}
}

function promptChangeRoom() {
  const input = window.prompt('请输入要进入的房间号（支持多人在一个房间）：', currentRoomId.value)
  if (input && input.trim()) {
    currentRoomId.value = input.trim()
    syncRoomPresence()
    playerBubble.value = `已切换到房间 #${currentRoomId.value}`
    setTimeout(() => {
      playerBubble.value = ''
    }, 3000)
  }
}

async function handleAuthChanged(user: AuthUser | null) {
  authUser.value = user
  roomMembers.value = []
  await fetchPlatformOverview()
  await syncRoomPresence()
}

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
}

/* Room Switcher & Top Shortcuts */
.room-selector-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: #fff0f3;
  border: 1px solid #ffccd5;
  font-size: 11px;
  font-weight: 700;
  color: #9c27b0;
  cursor: pointer;
}
.room-badge {
  font-size: 9px;
  background: #f48fb1;
  color: white;
  padding: 1px 5px;
  border-radius: 5px;
}
.switch-hint {
  font-size: 9px;
  color: #ad1457;
  text-decoration: underline;
}
.top-shortcut-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid #ebdbe0;
  background: #ffffff;
  font-size: 11px;
  font-weight: 700;
  color: #5d4037;
  cursor: pointer;
}
.top-shortcut-btn.leader {
  color: #ea580c;
  border-color: #fed7aa;
}
.top-shortcut-btn.auth {
  color: #0284c7;
  border-color: #bae6fd;
}

/* Quick Nav Bar */
.quick-nav-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.nav-chip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #f3e5e8;
  font-size: 11px;
  font-weight: 700;
  color: #634d53;
  cursor: pointer;
  position: relative;
}
.nav-chip.wish {
  border-color: #ffccd5;
  color: #d81b60;
}
.nav-chip.wrench {
  background: #fdf5e6;
  border-color: #ffe0b2;
  color: #e65100;
}
.notify-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: #e91e63;
  color: white;
  border-radius: 50%;
  font-size: 9px;
  display: grid;
  place-items: center;
}

/* Room Stage */
.room-stage-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
}
.room-isometric-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1.05;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(100, 30, 60, 0.14);
  background: #fff5e8;
  display: flex;
  flex-direction: column;
}
.room-wall {
  position: relative;
  width: 100%;
  height: 38%;
  background: linear-gradient(180deg, #fcece3 0%, #fae2d6 100%);
  border-bottom: 5px solid #d4a373;
}
.arched-window {
  position: absolute;
  top: 14px;
  left: 24px;
  width: 72px;
  height: 84px;
  border: 4px solid #ffffff;
  border-radius: 36px 36px 0 0;
  background: linear-gradient(180deg, #b3e5fc 0%, #e1f5fe 100%);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.window-pane {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, transparent 48%, #fff 48%, #fff 52%, transparent 52%),
    linear-gradient(to bottom, transparent 48%, #fff 48%, #fff 52%, transparent 52%);
}
.sunbeam-light {
  position: absolute;
  top: 0;
  left: -20px;
  width: 120px;
  height: 100px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, transparent 70%);
  transform: rotate(15deg);
  pointer-events: none;
}
.wall-hotspots {
  position: absolute;
  inset: 0;
}
.wall-hotspot-item {
  position: absolute;
  cursor: pointer;
  transition: transform 0.15s;
}
.wall-hotspot-item:hover {
  transform: scale(1.08);
}
.wall-hotspot-item.frame {
  top: 18px;
  left: 130px;
}
.wall-hotspot-item.mirror {
  top: 10px;
  right: 28px;
}
.hotspot-pill {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.92);
  color: #ad1457;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

/* Floor */
.room-floor {
  position: relative;
  width: 100%;
  height: 62%;
  background:
    repeating-linear-gradient(45deg, #e8c4a2 0px, #e8c4a2 28px, #dfb995 28px, #dfb995 30px),
    linear-gradient(180deg, #ecd0b5, #dfb895);
  cursor: crosshair;
}
.floor-ambient-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 40% 30%, rgba(255, 255, 255, 0.25) 0%, transparent 60%);
  pointer-events: none;
}
.floor-click-ripple {
  position: absolute;
  width: 24px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #ec407a;
  background: rgba(236, 64, 122, 0.2);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: ripple-pulse 0.5s ease-out forwards;
}
@keyframes ripple-pulse {
  from { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
  to { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
}

.furniture-instance {
  position: absolute;
  cursor: pointer;
  transition: transform 0.15s;
}
.furniture-instance:hover {
  transform: translateY(-2px);
}

/* Characters */
.room-character {
  position: absolute;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.room-character.partner {
  left: 28%;
  top: 32%;
  z-index: 45;
}
.room-character.dynamic-character {
  transition: left 0.42s cubic-bezier(0.25, 1, 0.5, 1), top 0.42s cubic-bezier(0.25, 1, 0.5, 1);
  transform: translate(-50%, -85%);
}
.player-doll-box.is-walking {
  animation: walk-bounce 0.22s infinite alternate ease-in-out;
}
@keyframes walk-bounce {
  from { transform: translateY(0) rotate(-1.5deg); }
  to { transform: translateY(-4px) rotate(1.5deg); }
}

.char-name-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #5d4037;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  margin-top: 2px;
  white-space: nowrap;
}
.char-name-tag.player-tag {
  background: #fce4ec;
  color: #c2185b;
}
.char-name-tag.peer-tag {
  background: #e0f2fe;
  color: #0369a1;
}

.love-speech-bubble {
  position: absolute;
  bottom: 105%;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  color: #d81b60;
  box-shadow: 0 4px 12px rgba(100, 30, 50, 0.16);
  white-space: nowrap;
  pointer-events: none;
  animation: float-bubble 0.3s ease-out;
}
.love-speech-bubble.my-bubble {
  color: #0284c7;
}
@keyframes float-bubble {
  from { transform: translateX(-50%) translateY(8px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

.room-pet {
  position: absolute;
  left: 18%;
  top: 72%;
  z-index: 55;
  font-size: 26px;
  cursor: pointer;
}
.pet-gift-bubble {
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  background: #ffeb3b;
  color: #795548;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

/* Footer Action */
.home-footer {
  width: 100%;
  padding: 4px 4px 8px;
}
.btn-launch-game {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #ec407a, #d81b60);
  box-shadow: 0 8px 24px rgba(216, 27, 96, 0.32);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn-launch-game:active {
  transform: scale(0.98);
}
.game-btn-icon {
  font-size: 26px;
}
.arrow-btn {
  color: #ffffff;
  font-size: 16px;
  opacity: 0.85;
}
</style>
