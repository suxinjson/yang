<template>
  <OnlineGate v-if="onlineRequired && onlineState !== 'ready'" @retry="connectOnline" />
  <div v-else class="game-wrapper min-h-screen w-full flex flex-col items-center justify-between bg-gradient-to-b from-rose-100 via-pink-50 to-purple-50 text-gray-800 select-none overflow-x-hidden font-sans">
    
    <!-- Top App Navigation / Header Bar -->
    <header class="w-full max-w-[440px] px-3 pt-3 pb-1 flex flex-col gap-1.5 z-20">
      <div class="flex items-center justify-between">
        <!-- Title & Slogan -->
        <div class="flex items-center gap-1.5 select-none" data-audit-control="game_title" @click="handleSecretLogoClick">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-rose-500 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-rose-300">
            钢
          </div>
          <div>
            <h1 class="text-base font-black tracking-tight text-gray-900 leading-none">
              《钢了钢》
            </h1>
            <p class="text-[10px] text-gray-500 font-medium leading-none mt-1">
              第 {{ currentLevel }} 关 · {{ currentLevelName }}
            </p>
          </div>
        </div>

        <!-- Quick Function Buttons -->
        <div class="flex items-center gap-1.5">
          <!-- Coupons Bag Button -->
          <button
            class="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/95 border border-rose-200 text-rose-700 shadow-xs active:scale-95 transition-all"
            @click="showCouponsModal = true"
            title="查看情侣心愿存折"
          >
            <span>🎁</span>
            <span class="relative">
              存折
              <span
                v-if="unusedCouponsCount > 0"
                class="absolute -top-1.5 -right-2.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-extrabold"
              >
                {{ unusedCouponsCount }}
              </span>
            </span>
          </button>

          <!-- Sound Toggle -->
          <button
            class="w-7 h-7 rounded-xl bg-white/95 border border-pink-200 text-gray-600 flex items-center justify-center text-xs active:scale-95 transition-all shadow-xs"
            @click="toggleSound"
            :title="soundEnabled ? '静音' : '开启音效'"
          >
            {{ soundEnabled ? '🔊' : '🔇' }}
          </button>

          <!-- Restart Level -->
          <button
            class="w-7 h-7 rounded-xl bg-white/95 border border-pink-200 text-gray-600 flex items-center justify-center text-xs active:scale-95 transition-all shadow-xs"
            @click="restartCurrentLevel"
            title="重新开始本关"
          >
            🔄
          </button>
        </div>
      </div>

      <!-- Level Progress Bar & Info -->
      <div class="flex items-center justify-between text-[11px] px-1 text-gray-600 font-medium">
        <div class="flex items-center gap-1">
          <span>剩余卡牌:</span>
          <span class="font-extrabold text-rose-600">{{ remainingCardsCount }}</span>
          <span class="text-gray-400">/ {{ totalCardsCount }}</span>
        </div>
        <div class="text-[10px] text-gray-400 font-medium">
          可选 {{ availableCardsCount }} 张 · 7格卡槽
        </div>
      </div>
    </header>

    <!-- Main Game Board Container -->
    <main class="board-section w-full flex-1 flex flex-col items-center justify-center relative py-1">
      <div
        class="board-arena relative rounded-3xl bg-pink-100/35 border-2 border-dashed border-pink-200/80 shadow-inner flex items-center justify-center overflow-hidden"
        :style="{ aspectRatio: `${boardLayout.width} / ${boardLayout.height}`, maxWidth: `${boardLayout.width}px` }"
        :aria-busy="isResolving"
      >
        <!-- Floating Romantic Background Doodles -->
        <div class="absolute inset-0 pointer-events-none opacity-20 flex flex-wrap gap-8 p-4 items-center justify-center text-2xl select-none">
          <span>❤️</span><span>✨</span><span>🔩</span><span>🛡️</span><span>🎂</span><span>🧦</span><span>🧋</span>
        </div>

        <!-- Render All Active Board Cards -->
        <CardComponent
          v-for="card in activeBoardCards"
          :key="card.id"
          :card="card"
          :def="getCardDef(card.type)"
          :board-layout="boardLayout"
          @click-card="handleCardClick"
        />

        <!-- Empty State / All Cleared Sparkle -->
        <div
          v-if="remainingCardsCount === 0"
          class="flex flex-col items-center justify-center text-rose-500 animate-bounce"
        >
          <span class="text-5xl mb-2">🎉</span>
          <span class="text-sm font-black">全部消除啦！</span>
        </div>
      </div>
    </main>

    <!-- Bottom Controls & Tray Section -->
    <footer class="w-full max-w-[440px] flex flex-col items-center pb-4 pt-1 z-20">
      <!-- 7 Slots Bottom Tray -->
      <SlotTray
        :slot-cards="slotCards"
        :staged-cards="stagedCards"
        :card-defs="roundCardDefs"
        :eliminating-ids="eliminatingIds"
        @return-staged="handleReturnStaged"
      />

      <!-- Props & Power-Ups Bar -->
      <PropsBar
        :move-out-count="propsState.moveOut"
        :undo-count="propsState.undo"
        :shuffle-count="propsState.shuffle"
        :slot-count="slotCards.length"
        :is-urgent="slotCards.length >= 6"
        :disabled="isResolving"
        :can-undo="canUndo"
        @use-move-out="handleMoveOut"
        @use-undo="handleUndo"
        @use-shuffle="handleShuffle"
        @summon-boyfriend="handleSummonBoyfriend"
      />

      <!-- Footer Subtitle -->
      <div class="mt-2 text-center text-[10px] text-gray-400 font-medium">
        铁了心爱你 · 钢了心宠你
      </div>
    </footer>

    <p v-if="operationError" role="alert" class="text-xs text-red-600 p-2">{{ operationError }}</p>
    <p v-if="onlineRequired" class="text-[10px] text-gray-400 px-3 pb-2">全程在线 · 应用内使用与操作记录可由管理员查看</p>
    <Teleport to="body"><div v-if="onlineRequired && (actionBusy || rewardPending)" class="fixed inset-0 z-[20000] cursor-wait" aria-label="正在确认操作"></div></Teleport>
    <!-- Modals -->
    <!-- 1. Boyfriend Superhero Rescue Modal -->
    <BoyfriendModal
      v-if="showBoyfriendModal"
      :custom-photo="rescueProfile.image"
      :photo-name="rescueProfile.name"
      :penalty-coupon="summonCostCoupon"
      :coupon-name="couponDisplayName"
      @close="closeBoyfriendModal"
    />

    <!-- 2. Win Celebration Modal -->
    <WinModal
      v-if="showWinModal"
      :level="currentLevel"
      :reward-coupon="latestWonCoupon"
      :has-next-level="currentLevel < 3"
      :coupon-name="couponDisplayName"
      @next-level="handleNextLevel"
      @replay-egg="restartCurrentLevel"
      @open-coupons="openCouponsFromWin"
    />

    <!-- 3. Fail / Over Capacity Modal -->
    <FailModal
      v-if="showFailModal"
      @summon="handleSummonFromFail"
      @restart="restartCurrentLevel"
    />

    <!-- 4. Love Coupons Modal -->
    <CouponsModal
      v-if="showCouponsModal"
      :coupons="loveCoupons"
      :coupon-name="couponDisplayName"
      @close="showCouponsModal = false"
      @redeem="handleRedeemCoupon"
    />

    <!-- 5. Admin Control Center Modal (Password Protected) -->
    <AdminModal
      :key="onlineSessionId"
      v-if="showAdminModal"
      :card-defs="cardDefs"
      @close="showAdminModal = false"
      @config-updated="handleAdminConfigUpdated"
      @update-card-image="handleUpdateCardImage"
      @reset-card="handleResetCard"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import type { CardItem, CardDefinition, LoveCoupon, AdminConfig } from './types/game'
import { sound } from './utils/sound'
import { loadCardDefinitions, saveCustomImage, removeCustomImage } from './utils/cardThemes'
import { createLevel, updateCardCoverage } from './utils/levelGenerator'
import { loadCoupons, redeemCoupon, generateRandomCoupon, syncCouponsFromServer } from './utils/coupons'
import { loadAdminConfig, syncAdminConfigFromServer, getActiveBfProfile, acceptServerConfig } from './utils/adminConfig'
import { getBaseUrl } from './utils/api'
import { onlineRequired, onlineState, onlineSessionId, actionBusy, openOnlineSession, activateOnlineSession, recordClientEvent, runClientAction, installClientLifecycle, stopClientSession, blockOnline } from './utils/clientSession'
import { saveCoupons } from './utils/coupons'
import OnlineGate from './components/OnlineGate.vue'
import { serverState, acceptServerState } from './utils/serverState'
import { clientFetch, operationError } from './utils/clientSession'
import { getBoardLayout } from './utils/boardGeometry'
import { defaultGameSettings, normalizeGameSettings } from '../shared/gameConfig.js'

// Components
import CardComponent from './components/Card.vue'
import SlotTray from './components/SlotTray.vue'
import PropsBar from './components/PropsBar.vue'
import BoyfriendModal from './components/BoyfriendModal.vue'
import WinModal from './components/WinModal.vue'
import FailModal from './components/FailModal.vue'
import CouponsModal from './components/CouponsModal.vue'
import AdminModal from './components/AdminModal.vue'

// --- Game State ---
const currentLevel = ref<number>(1)
const allCards = ref<CardItem[]>([])
const slotCards = ref<CardItem[]>([])
const stagedCards = ref<CardItem[]>([])
const eliminatingIds = ref<number[]>([])
const rewardPending = ref(false)
const cardHistory = ref<{ card: CardItem; fromStatus: 'board' | 'staged' }[]>([])
const isResolving = computed(() => eliminatingIds.value.length > 0 || actionBusy.value || rewardPending.value)
const canUndo = computed(() => cardHistory.value.some(({ card }) => card.status === 'slot' || card.status === 'staged'))
const gameTimers = new Set<ReturnType<typeof setTimeout>>()

function scheduleGameAction(action: () => void, delay: number) {
  const timer = setTimeout(() => {
    gameTimers.delete(timer)
    action()
  }, delay)
  gameTimers.add(timer)
}

function clearGameTimers() {
  gameTimers.forEach(timer => clearTimeout(timer))
  gameTimers.clear()
}

// Card definitions and theme
const cardDefs = ref<CardDefinition[]>(loadCardDefinitions())
const roundCardDefs = ref<CardDefinition[]>([])
const activeGameSettings = ref(defaultGameSettings())
const boardLayout = computed(() => getBoardLayout(activeGameSettings.value))
const soundEnabled = ref<boolean>(true)

// Modals
const showBoyfriendModal = ref<boolean>(false)
const showWinModal = ref<boolean>(false)
const showFailModal = ref<boolean>(false)
const showCouponsModal = ref<boolean>(false)
const showAdminModal = ref<boolean>(false)
const latestWonCoupon = ref<LoveCoupon | undefined>(undefined)
const summonCostCoupon = ref<LoveCoupon | undefined>(undefined)

// Coupons
const loveCoupons = ref<LoveCoupon[]>(loadCoupons())

// Props Counts
const propsState = ref({
  moveOut: 3,
  undo: 3,
  shuffle: 3
})

// --- Computed Properties ---
const activeBoardCards = computed(() => {
  return allCards.value.filter(c => c.status === 'board')
})

const remainingCardsCount = computed(() => {
  return allCards.value.filter(c => c.status !== 'cleared').length
})

const availableCardsCount = computed(() => activeBoardCards.value.filter(c => !c.isCovered).length)

const totalCardsCount = computed(() => {
  return allCards.value.length
})

const currentLevelName = computed(() => {
  if (currentLevel.value === 1) return '铁了心'
  if (currentLevel.value === 2) return '钢了心'
  return '心心相印'
})

const rescueProfile = ref(getActiveBfProfile(loadAdminConfig()))

let logoClickTimes = 0
let logoClickTimer: any = null
function handleSecretLogoClick() {
  logoClickTimes++
  clearTimeout(logoClickTimer)
  if (logoClickTimes >= 5) {
    logoClickTimes = 0
    showAdminModal.value = true
  } else {
    logoClickTimer = setTimeout(() => {
      logoClickTimes = 0
    }, 1500)
  }
}

const currentAdminConfig = ref<AdminConfig>(loadAdminConfig())
watch(serverState, (snapshot, previous) => {
  if (!snapshot) return
  saveCoupons(snapshot.coupons)
  loveCoupons.value = snapshot.coupons
  latestWonCoupon.value = snapshot.coupons.find(coupon => coupon.id === latestWonCoupon.value?.id)
  summonCostCoupon.value = snapshot.coupons.find(coupon => coupon.id === summonCostCoupon.value?.id)
  if (previous?.configVersion === snapshot.configVersion) return
  currentAdminConfig.value = acceptServerConfig(snapshot.config)
  rescueProfile.value = getActiveBfProfile(currentAdminConfig.value)
  cardDefs.value = loadCardDefinitions()
  // Keep the active board geometry and type set stable, but propagate changed names/photos immediately.
  roundCardDefs.value = roundCardDefs.value.map(def => ({ ...def, ...(cardDefs.value.find(latest => latest.id === def.id) || {}) }))
}, { flush: 'sync' })
const couponDisplayName = computed(() => currentAdminConfig.value.couponName || '专属心愿券')

function handleAdminConfigUpdated() {
  currentAdminConfig.value = loadAdminConfig()
  cardDefs.value = loadCardDefinitions()
  loveCoupons.value = loadCoupons()
}

const unusedCouponsCount = computed(() => {
  return loveCoupons.value.filter(c => !c.used).length
})

// --- Methods ---

function getCardDef(type: string): CardDefinition | undefined {
  return roundCardDefs.value.find(d => d.id === type)
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  sound.enabled = soundEnabled.value
}

// Start / Initialize Level
function initLevel(level: number) {
  if (onlineRequired && !['ready', 'connecting'].includes(onlineState.value)) return
  clearGameTimers()
  currentLevel.value = level
  slotCards.value = []
  stagedCards.value = []
  eliminatingIds.value = []
  cardHistory.value = []
  showWinModal.value = false
  showFailModal.value = false

  // Reset Props
  propsState.value = {
    moveOut: 3,
    undo: 3,
    shuffle: 3
  }

  currentAdminConfig.value = loadAdminConfig()
  cardDefs.value = loadCardDefinitions()
  roundCardDefs.value = cardDefs.value.filter(def => def.id !== 'boyfriend_photo' || currentAdminConfig.value.bfCardEnabled).map(def => ({ ...def }))
  activeGameSettings.value = normalizeGameSettings(currentAdminConfig.value.gameSettings)
  const availableTypes = roundCardDefs.value.map(d => d.id)
  allCards.value = createLevel(level as 1 | 2 | 3, availableTypes, Math.random, activeGameSettings.value).cards
  if (onlineRequired) void recordClientEvent('round_start', { level, total: allCards.value.length, roundId: crypto.randomUUID() }).catch(() => {})
}

function restartCurrentLevel() {
  if (rewardPending.value || (onlineRequired && isResolving.value)) return
  return runClientAction('restart', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value }, () => restartCurrentLevelImpl())
}

function restartCurrentLevelImpl() {
  initLevel(currentLevel.value)
}

function handleNextLevel() {
  if (isResolving.value) return
  return runClientAction('next_level', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value }, () => handleNextLevelImpl())
}

function handleNextLevelImpl() {
  if (currentLevel.value < 3) {
    initLevel(currentLevel.value + 1)
  } else {
    initLevel(1)
  }
}

// Click Board Card -> Move into Slot
function handleCardClick(card: CardItem) {
  if (isResolving.value) return
  return runClientAction('card_pick', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value, cardId: card.id, cardType: card.type }, () => handleCardClickImpl(card))
}

function handleCardClickImpl(card: CardItem) {
  if (eliminatingIds.value.length || showFailModal.value || showWinModal.value) return
  if (card.status !== 'board' || card.isCovered) return
  if (slotCards.value.length >= 7) return

  // Push to history for undo
  cardHistory.value.push({ card, fromStatus: 'board' })

  // Move card to slot
  card.status = 'slot'

  // Smart Slot Sorting: group cards of same type together
  insertCardIntoSlot(card)

  // Recalculate board coverage
  updateCardCoverage(allCards.value, boardLayout.value.cardWidth / boardLayout.value.stepX, boardLayout.value.cardHeight / boardLayout.value.stepY)

  sound.playSlot()

  // Check for 3-match elimination
  checkMatchElimination()
}

// Insert card into slot next to matching type if possible
function insertCardIntoSlot(card: CardItem) {
  const currentSlots = [...slotCards.value]
  const lastIndex = currentSlots.map(c => c.type).lastIndexOf(card.type)

  if (lastIndex !== -1) {
    // Insert right after the last card of the same type
    currentSlots.splice(lastIndex + 1, 0, card)
  } else {
    // Otherwise append to end
    currentSlots.push(card)
  }

  slotCards.value = currentSlots
}

// Check for 3 identical cards
function checkMatchElimination() {
  if (eliminatingIds.value.length) return
  const typeCountMap: Record<string, CardItem[]> = {}
  for (const card of slotCards.value) {
    if (!typeCountMap[card.type]) {
      typeCountMap[card.type] = []
    }
    typeCountMap[card.type].push(card)
  }

  let matched = false

  for (const type in typeCountMap) {
    const list = typeCountMap[type]
    if (list.length >= 3) {
      matched = true
      const threeCards = list.slice(0, 3)
      const ids = threeCards.map(c => c.id)

      eliminatingIds.value.push(...ids)
      sound.playMatch()

      // 关键修复：从撤回历史中彻底剔除已被三消的卡牌，防止消除后撤回产生“孤儿牌”导致死局
      cardHistory.value = cardHistory.value.filter(h => !ids.includes(h.card.id))

      // Sparkle Confetti on match
      triggerMatchConfetti()

      scheduleGameAction(() => {
        // Mark cleared
        threeCards.forEach(c => {
          c.status = 'cleared'
        })
        slotCards.value = slotCards.value.filter(c => !ids.includes(c.id))
        eliminatingIds.value = eliminatingIds.value.filter(id => !ids.includes(id))

        // Check Victory
        void checkWinCondition().catch(() => {
          operationError.value = '奖励同步失败，请联网后重新连接或重试'
          blockOnline('奖励同步失败，请重新连接')
        })
      }, 240)
      break
    }
  }

  // If no match and slots are full (>= 7), trigger alert/fail
  if (!matched && slotCards.value.length >= 7) {
    scheduleGameAction(() => {
      if (slotCards.value.length >= 7 && !isResolving.value) {
        sound.playFail()
        showFailModal.value = true
        if (onlineRequired) void recordClientEvent('lose', { level: currentLevel.value }).catch(() => {})
      }
    }, 280)
  }
}

// Check if all cards on board and slots are cleared
async function checkWinCondition() {
  const remainingActive = allCards.value.filter(c => c.status !== 'cleared')
  if (remainingActive.length === 0) {
    rewardPending.value = true
    try {
      sound.playWin()
      triggerVictoryConfetti()

      if (onlineRequired) await recordClientEvent('win', { level: currentLevel.value })
      const won = await generateRandomCoupon(`第 ${currentLevel.value} 关通关`)
      latestWonCoupon.value = won
      loveCoupons.value = loadCoupons()
      showWinModal.value = true
    } finally { rewardPending.value = false }
  }
}

// Move Out 3 Cards (Props 1)
function handleMoveOut() {
  if (isResolving.value) return
  return runClientAction('move_out', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value }, () => handleMoveOutImpl())
}

function handleMoveOutImpl() {
  if (eliminatingIds.value.length) return
  if (propsState.value.moveOut <= 0 || slotCards.value.length === 0) return

  propsState.value.moveOut--
  sound.playPowerUp()

  // Take up to 3 cards from slot and put into staged
  const cardsToMove = slotCards.value.slice(0, 3)
  cardsToMove.forEach(c => {
    c.status = 'staged'
  })

  stagedCards.value.push(...cardsToMove)
  slotCards.value = slotCards.value.slice(3)
}

// Return Staged card to Slot
function handleReturnStaged(card: CardItem) {
  if (isResolving.value) return
  return runClientAction('return_staged', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value, cardId: card.id, cardType: card.type }, () => handleReturnStagedImpl(card))
}

function handleReturnStagedImpl(card: CardItem) {
  if (eliminatingIds.value.length || card.status !== 'staged') return
  if (slotCards.value.length >= 7) return

  stagedCards.value = stagedCards.value.filter(c => c.id !== card.id)
  card.status = 'slot'
  insertCardIntoSlot(card)
  sound.playSlot()
  checkMatchElimination()
}

// Undo Last Card (Props 2)
function handleUndo() {
  if (isResolving.value) return
  return runClientAction('undo', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value }, () => handleUndoImpl())
}

function handleUndoImpl() {
  if (eliminatingIds.value.length) return
  if (propsState.value.undo <= 0 || cardHistory.value.length === 0) return

  // 严格寻找最近一张仍在卡槽或暂存区（未被消除）的卡牌进行安全撤回
  let restored = false
  while (cardHistory.value.length > 0) {
    const lastMove = cardHistory.value.pop()
    if (!lastMove) break

    const card = lastMove.card
    if (card.status === 'slot' || card.status === 'staged') {
      propsState.value.undo--
      sound.playPowerUp()

      slotCards.value = slotCards.value.filter(c => c.id !== card.id)
      stagedCards.value = stagedCards.value.filter(c => c.id !== card.id)

      card.status = 'board'
      updateCardCoverage(allCards.value, boardLayout.value.cardWidth / boardLayout.value.stepX, boardLayout.value.cardHeight / boardLayout.value.stepY)
      restored = true
      break
    }
  }

  if (!restored) {
    sound.playClick()
  }
}

// Shuffle Board Cards (Props 3)
function handleShuffle() {
  if (isResolving.value) return
  return runClientAction('shuffle', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value }, () => handleShuffleImpl())
}

function handleShuffleImpl() {
  if (eliminatingIds.value.length) return
  if (propsState.value.shuffle <= 0) return

  const boardCards = allCards.value.filter(c => c.status === 'board')
  if (boardCards.length <= 1) return

  propsState.value.shuffle--
  sound.playPowerUp()

  const types = boardCards.map(c => c.type)
  // 使用 Fisher-Yates (Knuth) 算法实现完全均匀随机洗牌
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]]
  }

  boardCards.forEach((c, idx) => {
    c.type = types[idx]
  })
}

// Summon Boyfriend (Ultimate Rescue)
function handleSummonBoyfriend() {
  if (isResolving.value) return
  return runClientAction('summon', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value }, () => handleSummonBoyfriendImpl())
}

async function handleSummonBoyfriendImpl() {
  if (eliminatingIds.value.length) return
  sound.playRescue()

  const admin = loadAdminConfig()
  rescueProfile.value = getActiveBfProfile(admin)
  if (admin.summonCostEnabled) {
    summonCostCoupon.value = await generateRandomCoupon('召唤男友救场')
  } else {
    summonCostCoupon.value = undefined
  }
  loveCoupons.value = loadCoupons()
  showFailModal.value = false
  showBoyfriendModal.value = true

  // Automatically solve 3 cards from slot (or clear 3 cards directly)
  if (slotCards.value.length > 0) {
    const toRescue = slotCards.value.slice(0, 3)
    toRescue.forEach(c => {
      c.status = 'staged'
    })
    stagedCards.value.push(...toRescue)
    slotCards.value = slotCards.value.slice(3)
  }
}

function handleSummonFromFail() {
  handleSummonBoyfriend()
}

function closeBoyfriendModal() {
  showBoyfriendModal.value = false
}

// Custom Photos Management
function handleUpdateCardImage(cardId: string, base64: string) {
  saveCustomImage(cardId, base64)
  cardDefs.value = loadCardDefinitions()
  // AdminModal saves the image in its versioned config transaction.
}

function handleResetCard(cardId: string) {
  removeCustomImage(cardId)
  cardDefs.value = loadCardDefinitions()
}

// Coupon Actions
function handleRedeemCoupon(couponId: string) {
  if (isResolving.value) return
  return runClientAction('redeem', { level: currentLevel.value, slotCount: slotCards.value.length, remaining: remainingCardsCount.value, couponId }, () => handleRedeemCouponImpl(couponId))
}

async function handleRedeemCouponImpl(couponId: string) {
  sound.playPowerUp()
  loveCoupons.value = await redeemCoupon(couponId)
}

function openCouponsFromWin() {
  showWinModal.value = false
  showCouponsModal.value = true
}

// Visual Effects
function triggerMatchConfetti() {
  confetti({
    particleCount: 22,
    spread: 55,
    origin: { y: 0.8 },
    colors: ['#FF69B4', '#FFB6C1', '#FF6347', '#FFD700']
  })
}

function triggerVictoryConfetti() {
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.5 },
    colors: ['#FF1493', '#FF69B4', '#FFA07A', '#FFD700', '#00CED1']
  })
}

let connecting = false
let webSyncTimer: ReturnType<typeof setInterval> | undefined
let webSyncPending = false
async function syncPageState() {
  if (onlineRequired || webSyncPending || document.hidden) return
  webSyncPending = true
  try {
    const response = await clientFetch(`${getBaseUrl()}/api/state`, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('State unavailable')
    const data = await response.json()
    acceptServerState(data.state)
  } catch { /* Keep drafts intact; native clients are locked by their strict session checks. */ }
  finally { webSyncPending = false }
}
async function connectOnline() {
  if (connecting || document.hidden) return
  connecting = true
  clearGameTimers()
  allCards.value = []
  showAdminModal.value = false
  showCouponsModal.value = false
  showBoyfriendModal.value = false
  try {
    const snapshot = await openOnlineSession(getBaseUrl())
    currentAdminConfig.value = acceptServerConfig(snapshot.config)
    saveCoupons(snapshot.coupons)
    loveCoupons.value = snapshot.coupons
    cardDefs.value = loadCardDefinitions()
    initLevel(currentLevel.value)
    await recordClientEvent('ui_change', { control: 'online_ready' })
    activateOnlineSession()
  } catch { blockOnline('无法连接在线服务，请检查网络后重试') }
  finally { connecting = false }
}
watch(onlineState, state => { if (onlineRequired && state !== 'ready') clearGameTimers() })
onMounted(async () => {
  if (onlineRequired) {
    installClientLifecycle(() => { void connectOnline() })
    await connectOnline()
    return
  }
  // Sync latest config and shared coupons from server
  try {
    const [config, coupons] = await Promise.all([
      syncAdminConfigFromServer(),
      syncCouponsFromServer()
    ])
    currentAdminConfig.value = config
    cardDefs.value = loadCardDefinitions()
    loveCoupons.value = coupons
  } catch (e) {
    console.warn('Initial server sync failed, running in local mode', e)
  }

  await syncPageState()
  webSyncTimer = setInterval(() => { void syncPageState() }, 2000)
  document.addEventListener('visibilitychange', syncPageState)
  initLevel(1)

  if (
    window.location.search.includes('admin') ||
    window.location.hash.includes('admin') ||
    window.location.pathname.includes('/admin')
  ) {
    showAdminModal.value = true
  }
})

onUnmounted(() => {
  if (webSyncTimer) clearInterval(webSyncTimer)
  document.removeEventListener('visibilitychange', syncPageState)
  stopClientSession()
  clearGameTimers()
  clearTimeout(logoClickTimer)
})
</script>

<style>
/* Global Responsive Mobile Layout */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow-x: hidden;
  background-color: #FFF0F5;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
}

.game-wrapper {
  max-width: 440px;
  min-height: 100svh;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.fixed.inset-0 {
  padding-top: max(12px, env(safe-area-inset-top, 0px));
  padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
}

.board-section {
  padding-inline: 10px;
}

.board-arena {
  width: 100%;
  max-width: 420px;
  flex-shrink: 0;
  isolation: isolate;
}

.board-arena[aria-busy="true"] .game-card {
  pointer-events: none;
}
</style>
