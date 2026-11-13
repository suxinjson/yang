<template>
  <HomeHub
    v-if="currentView === 'home'"
    @start-game="currentView = 'game'"
    @redeem-coupon="handleRedeemCoupon"
  />
  <div v-else class="game-wrapper">
    <header class="game-header">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button class="icon-button" title="返回温馨小家" aria-label="返回温馨小家" @click="currentView = 'home'">🏡</button>
          <h1 class="game-title">钢了钢<span aria-hidden="true">✦</span></h1>
        </div>
        <div class="flex items-center gap-2">
          <button class="coupon-shortcut" title="查看个人背包" @click="openCoupons">背包<span v-if="unusedCouponsCount">{{ unusedCouponsCount }}</span></button>
          <button class="icon-button" :title="soundEnabled ? '静音' : '开启音效'" :aria-label="soundEnabled ? '静音' : '开启音效'" @click="toggleSound">{{ soundEnabled ? '🔊' : '🔇' }}</button>
          <button class="icon-button" title="重新开始本关" aria-label="重新开始本关" :disabled="booting || actionBusy || roomBusy || rewardPending || hasPending" @click="restartCurrentLevel">↻</button>
        </div>
      </div>
      <div class="game-stats">
        <span>第 {{ currentLevel }} 关</span>
        <time aria-label="本关用时">{{ elapsedText }}<span v-if="!couple && solo.practice"> · 本地练习</span></time>
        <span aria-label="剩余卡牌">{{ remainingCardsCount }}<span class="text-stone-400"> / {{ totalCardsCount }}</span></span>
      </div>
      <progress class="level-progress" :max="Math.max(1, totalCardsCount)" :value="totalCardsCount - remainingCardsCount" aria-label="关卡进度"></progress>
      <ModePanel :couple="couple" :room="roomInfo" :connection="roomConnection" :busy="booting || actionBusy || roomBusy || rewardPending || hasPending" :has-saved-room="hasSavedRoom"
        @create="switchMode('create')" @join="code => switchMode('join', code)" @resume="switchMode('resume')" @solo="switchMode('solo')" @reconnect="reconnectRoom" />
    </header>
    <main class="board-section">
      <p v-if="totalCardsCount % 3" role="alert" class="mb-3 text-xs leading-relaxed text-amber-800">本关 {{ totalCardsCount }} 张卡片不是 3 的倍数，无法全部消除，请调整关卡配置。</p>
      <div class="board-arena" :style="{ aspectRatio: `${boardLayout.width} / ${boardLayout.height}`, maxWidth: `${boardLayout.width}px` }" :aria-busy="isResolving">
        <CardComponent v-for="card in activeBoardCards" :key="card.id" :card="card" :def="getCardDef(card.type)" :board-layout="boardLayout" :text-mode="cardTextMode"
          :class="{ 'hint-card': game.hinted.includes(card.id) && game.hintUntil > now + serverOffset }" @click-card="handleCardClick" />
        <span v-if="remainingCardsCount === 0" class="board-cleared" aria-hidden="true">✦</span>
      </div>
    </main>
    <footer class="game-controls">
      <SlotTray :slot-cards="slotCards" :staged-cards="stagedCards" :card-defs="roundCardDefs" :text-mode="cardTextMode"
        :eliminating-ids="eliminatingIds" :unlocked-slots="unlockedSlots" :max-slots="activeGameSettings.maxSlots || 8"
        :unlock-condition="activeGameSettings.slotUnlockCondition || 'match_count'" :unlock-progress="slotUnlockProgress"
        @return-staged="handleReturnStaged" @unlock-slot="handleUnlockSlot" />
      <PropsBar :hint-count="propsState.hint" :rescue-count="propsState.rescue" :can-hint="availableCardsCount > 0"
        :can-rescue="canRescue" :disabled="isResolving || (!couple && solo.practice)" :couple="couple" @hint="handleHint" @rescue="handleSummonBoyfriend" />
    </footer>
    <Transition name="fade"><p v-if="slotToastMessage" class="game-toast" role="status">{{ slotToastMessage }}</p></Transition>
    <div v-if="(operationError || hasPending) && !showCouponsModal && !showWinModal" class="operation-notice">
      <p v-if="operationError" role="alert">{{ operationError }}</p>
      <button class="mt-2 font-semibold underline" :disabled="actionBusy || rewardPending" @click="retryPending">重试未确认操作</button>
    </div>
    <Teleport to="body"><div v-if="actionBusy || rewardPending" class="operation-overlay" aria-label="正在确认操作"><span class="busy-spinner"></span></div></Teleport>
    <BoyfriendModal v-if="showBoyfriendModal" :custom-photo="rescueProfile.image" :photo-name="rescueProfile.name" :staged-count="stagedCards.length" :couple="couple" @close="closeBoyfriendModal" />
    <WinModal v-if="showWinModal" :level="currentLevel" :reward-coupon="latestWonCoupon" :rewards="latestWonItems" :reward-unconfirmed="rewardUnconfirmed" :reward-pending="rewardPending"
      :reward-error="rewardUnconfirmed ? operationError : ''" :has-next-level="currentLevel < totalLevelsCount" :coupon-name="couponDisplayName"
      @retry-reward="retryPending" @next-level="handleNextLevel" @replay-egg="restartCurrentLevel" @open-coupons="openCoupons" @return-home="currentView = 'home'" />
    <FailModal v-if="showFailModal" :capacity="unlockedSlots" :can-rescue="canRescue" :unmatchable="!activeBoardCards.length && !stagedCards.length && slotCards.length < unlockedSlots" @summon="handleSummonBoyfriend" @restart="restartCurrentLevel" />
    <CouponsModal v-if="showCouponsModal" :coupons="loveCoupons" :items="backpackItems" :coupon-name="couponDisplayName" :active-tab="game.couponTab" :error="operationError" :busy="actionBusy"
      @retry="retryPending" @filter="filterCoupons" @close="closeCoupons" @redeem="handleRedeemCoupon" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGame } from './utils/useGame'
import HomeHub from './components/home/HomeHub.vue'
import CardComponent from './components/Card.vue'
import SlotTray from './components/SlotTray.vue'
import PropsBar from './components/PropsBar.vue'
import BoyfriendModal from './components/BoyfriendModal.vue'
import WinModal from './components/WinModal.vue'
import FailModal from './components/FailModal.vue'
import CouponsModal from './components/CouponsModal.vue'
import ModePanel from './components/ModePanel.vue'

function getInitialView(): 'home' | 'game' {
  if (typeof window === 'undefined') return 'home'
  const params = new URLSearchParams(window.location.search)
  const viewParam = params.get('view')
  if (viewParam === 'home') return 'home'
  if (viewParam === 'game') return 'game'
  if (window.location.hash === '#game') return 'game'
  if (window.location.hash === '#home') return 'home'
  const isHeadless = typeof navigator !== 'undefined' && /Headless|Playwright/i.test(navigator.userAgent)
  return isHeadless ? 'game' : 'home'
}
const currentView = ref<'home' | 'game'>(getInitialView())

const {
  couple, roomInfo, roomConnection, roomBusy, hasSavedRoom, switchMode, reconnectRoom, actionBusy, operationError, rewardPending,
  game, solo, currentLevel, allCards, slotCards, stagedCards, eliminatingIds, unlockedSlots, matchCountThisRound, activeGameSettings, roundCardDefs, boardLayout,
  propsState, isResolving, canRescue, activeBoardCards, remainingCardsCount, availableCardsCount, totalCardsCount, totalLevelsCount, slotUnlockProgress, cardTextMode,
  backpackItems, latestWonItems, loveCoupons, unusedCouponsCount, couponDisplayName, latestWonCoupon, rewardUnconfirmed, rescueProfile, soundEnabled, elapsedText, showBoyfriendModal, showWinModal, showFailModal, showCouponsModal,
  slotToastMessage, hasPending, booting, now, serverOffset, getCardDef, initLevel, handleCardClick, handleReturnStaged, handleHint, handleSummonBoyfriend, handleUnlockSlot,
  restartCurrentLevel, handleNextLevel, openCoupons, filterCoupons, closeCoupons, closeBoyfriendModal, handleRedeemCoupon, retryPending, toggleSound
} = useGame()

function wrappedInitLevel(level: any) {
  currentView.value = 'game'
  return initLevel(level)
}

defineExpose({
  initLevel: wrappedInitLevel,
  allCards,
  game,
  solo,
  matchCountThisRound,
  roundCardDefs,
  currentView,
  switchToGame: () => { currentView.value = 'game' },
  switchToHome: () => { currentView.value = 'home' }
})
</script>

<style scoped>
.game-wrapper { width: 100%; max-width: 440px; min-height: 100svh; margin: auto; padding: max(18px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); display: flex; flex-direction: column; background: linear-gradient(180deg, #fff9f5, #f7edf0); user-select: none; }
.game-header { width: 100%; padding: 0 4px; }
.game-title { display: flex; gap: 8px; align-items: center; margin: 0; font-size: 23px; font-weight: 800; letter-spacing: -.04em; color: #68414d; }
.game-title span { color: #b18474; font-size: 18px; }
.icon-button { display: grid; place-items: center; width: 34px; height: 34px; font-size: 15px; border: 1px solid #eddee0; border-radius: 11px; color: #835263; background: #fffcfa; cursor: pointer; }
.coupon-shortcut { display: flex; gap: 7px; align-items: center; min-height: 34px; padding: 0 10px; border-radius: 11px; color: #8b4e62; background: #f5e8ec; font-size: 11px; font-weight: 600; cursor: pointer; }
.coupon-shortcut span { font-variant-numeric: tabular-nums; font-size: 10px; opacity: .7; }
.game-stats { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; font-size: 11px; color: #8b777b; font-variant-numeric: tabular-nums; }
.level-progress { display: block; width: 100%; height: 3px; margin: 9px 0 2px; border: 0; border-radius: 3px; overflow: hidden; background: #eddee2; }
.level-progress::-webkit-progress-bar { background: #eddee2; }
.level-progress::-webkit-progress-value { background: #bd8497; transition: width .2s; }
.level-progress::-moz-progress-bar { background: #bd8497; }
.board-section { display: flex; flex: 1; width: 100%; justify-content: center; align-items: center; padding-bottom: 14px; }
.board-arena { position: relative; width: 100%; flex-shrink: 0; isolation: isolate; overflow: hidden; border-radius: 24px; background: #f1e4e8; box-shadow: inset 0 1px 6px #67384a08; }
.board-arena[aria-busy="true"] .game-card { pointer-events: none; }
.board-cleared { display: grid; place-items: center; height: 100%; color: #bd8497; font-size: 64px; }
.game-controls { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.hint-card { outline: 3px solid #d5a649; outline-offset: 2px; filter: drop-shadow(0 0 5px #e8c979); }
.game-toast { position: fixed; top: max(16px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); z-index: 15000; width: max-content; max-width: calc(100vw - 32px); padding: 12px 18px; border-radius: 14px; background: #775260; color: white; font-size: 12px; box-shadow: 0 8px 30px #53213224; }
.operation-notice { padding: 14px 4px 0; font-size: 12px; color: #a44d4d; }
</style>
