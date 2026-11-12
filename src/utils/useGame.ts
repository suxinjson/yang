import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import confetti from 'canvas-confetti'
import type { CardItem } from '../types/game'
import { applyGameAction, createGame, settleGame, type GameAction, type GameState } from '../../shared/gameEngine.js'
import { getBoardLayout } from '../../shared/boardGeometry.js'
import { loadAdminConfig, acceptServerConfig } from './adminConfig'
import { loadCardDefinitions } from './cardThemes'
import { loadCoupons, saveCoupons } from './coupons'
import { getBaseUrl } from './api'
import { serverState, acceptServerState } from './serverState'
import { actionBusy, operationError } from './clientSession'
import { playMode, roomInfo, roomGame, roomConnection, roomBusy, serverOffset, playPost, createRoom, joinRoom, retryRoomEntry, resumeRoom, stopRoom, leaveRoom, reconnectRoom, sendRoomAction } from './playSession'
import { sound } from './sound'

type SoloSave = { game: GameState; token: string; practice: boolean; pending?: { operationId: string; action: GameAction }; finishAck?: string; blockedPending?: boolean; blockedAck?: boolean }
const SOLO_KEY = 'gang_solo_v2'
export function useGame() {
  const currentAdminConfig = ref(loadAdminConfig()), cardDefs = ref(loadCardDefinitions())
  const solo = ref<SoloSave>({ game: createGame(currentAdminConfig.value), token: '', practice: true })
  const couple = computed(() => playMode.value === 'couple')
  const game = computed(() => couple.value && roomGame.value ? roomGame.value : solo.value.game)
  const allCards = computed({ get: () => game.value.cards, set: cards => { game.value.cards = cards } })
  const currentLevel = computed({ get: () => game.value.level, set: level => { game.value.level = level } })
  const activeGameSettings = computed({ get: () => game.value.settings, set: settings => { game.value.settings = settings } })
  const roundCardDefs = computed({ get: () => game.value.defs, set: defs => { game.value.defs = defs } })
  const byIds = (ids: number[]) => ids.map(id => game.value.cards.find(card => card.id === id)!).filter(Boolean)
  const slotCards = computed({ get: () => byIds(game.value.slots), set: cards => { game.value.slots = cards.map(card => card.id) } })
  const stagedCards = computed({ get: () => byIds(game.value.staged), set: cards => { game.value.staged = cards.map(card => card.id) } })
  const eliminatingIds = computed({ get: () => game.value.eliminating, set: ids => { game.value.eliminating = ids } })
  const unlockedSlots = computed({ get: () => game.value.unlocked, set: slots => { game.value.unlocked = slots } })
  const matchCountThisRound = computed({ get: () => game.value.matches, set: matches => { game.value.matches = matches } })
  const propsState = computed(() => game.value.tools)
  const hasPending = computed(() => !couple.value && !!solo.value.pending)
  const isResolving = computed(() => booting.value || !!game.value.resolveAt || actionBusy.value || roomBusy.value || hasPending.value || (couple.value && roomConnection.value !== 'ready'))
  const canRescue = computed(() => game.value.tools.rescue > 0 && game.value.slots.length > 0 && !game.value.staged.length)
  const activeBoardCards = computed(() => game.value.cards.filter(card => card.status === 'board'))
  const remainingCardsCount = computed(() => game.value.cards.filter(card => card.status !== 'cleared').length)
  const availableCardsCount = computed(() => activeBoardCards.value.filter(card => !card.isCovered).length)
  const totalCardsCount = computed(() => game.value.cards.length)
  const totalLevelsCount = computed(() => game.value.settings.levels.length)
  const slotUnlockProgress = computed(() => ({ current: game.value.matches, required: game.value.settings.slotUnlockMatchCount || 3 }))
  const boardLayout = computed(() => getBoardLayout(game.value.settings))
  const loveCoupons = ref(loadCoupons()), unusedCouponsCount = computed(() => loveCoupons.value.filter(coupon => !coupon.used).length)
  const couponDisplayName = computed(() => currentAdminConfig.value.couponName || '专属心愿券')
  const cardTextMode = computed(() => currentAdminConfig.value.cardTextMode)
  const latestWonCoupon = computed(() => loveCoupons.value.find(coupon => coupon.id === game.value.rewardId))
  const rewardUnconfirmed = computed(() => !couple.value && !solo.value.practice && game.value.phase === 'won' && solo.value.finishAck !== game.value.roundId)
  const rescueProfile = computed(() => game.value.profile)
  const booting = ref(true), soundEnabled = ref(true), rewardPending = ref(false)
  const showBoyfriendModal = computed(() => game.value.modal === 'rescue')
  const showCouponsModal = computed(() => game.value.modal === 'coupons')
  const showWinModal = computed(() => game.value.phase === 'won' && !game.value.modal)
  const showFailModal = computed(() => game.value.phase === 'lost' && !game.value.modal)
  const slotToastMessage = ref(''), now = ref(Date.now()), hasSavedRoom = ref(!!localStorage.getItem('gang_room_credentials'))
  const elapsedText = computed(() => {
    const elapsed = Math.max(0, (game.value.endedAt || now.value + serverOffset.value) - game.value.startedAt)
    return `${Math.floor(elapsed / 60000)}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}`
  })
  let timer: ReturnType<typeof setInterval> | undefined, settle: ReturnType<typeof setTimeout> | undefined
  let toastTimer: ReturnType<typeof setTimeout> | undefined, saveTimer: ReturnType<typeof setTimeout> | undefined
  let syncPending = false, etag = '', destroyed = false, inventoryGeneration = 0
  function persist() {
    if (saveTimer) clearTimeout(saveTimer)
    try { localStorage.setItem(SOLO_KEY, JSON.stringify(solo.value)); return true } catch { operationError.value = '本机空间不足，刷新可能丢失当前牌局；请释放空间'; return false }
  }
  function saveSoon() { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(persist, 80) }
  function showSlotToast(message: string) { slotToastMessage.value = message; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(() => { slotToastMessage.value = '' }, 3000) }
  watch(serverState, snapshot => {
    if (!snapshot) return
    saveCoupons(snapshot.coupons); loveCoupons.value = snapshot.coupons
    currentAdminConfig.value = acceptServerConfig(snapshot.config); cardDefs.value = loadCardDefinitions()
    // Names and photos update together through the room's global message. Geometry stays pinned.
    if (!couple.value) solo.value.game.defs = solo.value.game.defs.map(def => def.id === 'boyfriend_photo' ? def : ({ ...def, ...(cardDefs.value.find(item => item.id === def.id) || {}) }))
  }, { flush: 'sync' })
  watch(soundEnabled, enabled => { sound.enabled = enabled })
  watch(playMode, () => { hasSavedRoom.value = !!localStorage.getItem('gang_room_credentials') })
  watch(() => game.value.eliminating.join(','), (ids, old) => { if (ids && ids !== old) { sound.playMatch(); confetti({ particleCount: 16, spread: 45, origin: { y: 0.8 } }) } })
  watch(() => game.value.phase, phase => { if (phase === 'won') sound.playWin(); if (phase === 'lost') sound.playFail() })
  const definitions = computed(() => new Map(game.value.defs.map(def => [def.id, def])))
  function getCardDef(type: string) { return definitions.value.get(type) }
  function initLevel(level: number) {
    if (settle) clearTimeout(settle)
    solo.value = { game: createGame(loadAdminConfig(), level), token: '', practice: true }; persist()
  }
  async function startSolo(level = 1, initial = false) {
    if (settle) clearTimeout(settle)
    const key = 'gang_solo_start_operation_' + level, operationId = localStorage.getItem(key) || crypto.randomUUID()
    localStorage.setItem(key, operationId)
    try {
      const data = await playPost('solo/start', { operationId, level }, initial ? 3000 : 8000)
      if (!data.game?.roundId || !data.token) throw new Error('后台需要更新后才能记录本关')
      solo.value = { game: data.game, token: data.token, practice: false }; persist(); localStorage.removeItem(key)
    } catch (error) {
      if ((error as { status?: number }).status === 409) localStorage.removeItem(key)
      if (initial || solo.value.practice) { initLevel(level); showSlotToast('当前为本地练习；联网后重开即可使用道具与获得心愿券') }
      else { scheduleResolve(); throw error }
    }
  }
  function scheduleResolve() {
    if (settle) clearTimeout(settle)
    if (couple.value || !solo.value.game.resolveAt) return
    const roundId = solo.value.game.roundId
    settle = setTimeout(() => {
      if (couple.value || solo.value.game.roundId !== roundId) return
      settleGame(solo.value.game, Math.max(Date.now() + serverOffset.value, solo.value.game.resolveAt)); persist()
      if (solo.value.game.phase === 'won') void finishSolo()
    }, Math.max(0, solo.value.game.resolveAt - Date.now() - serverOffset.value))
  }
  async function finishSolo() {
    if (solo.value.practice || rewardPending.value || solo.value.finishAck === solo.value.game.roundId) return
    rewardPending.value = true
    const saved = solo.value, roundId = saved.game.roundId
    try {
      const data = await playPost('solo/finish', { roundId, token: saved.token, outcome: 'won' })
      saved.game.rewardId = data.rewardId; saved.finishAck = roundId
      if (solo.value === saved) { operationError.value = ''; persist() }
    } catch (error) { operationError.value = error instanceof Error ? error.message : '通关奖励未确认，点击重试' }
    finally { rewardPending.value = false }
  }
  function localAction(action: GameAction) {
    applyGameAction(solo.value.game, action, Date.now() + serverOffset.value); saveSoon(); scheduleResolve()
    if (action.type === 'pick' || action.type === 'return') sound.playSlot()
    if (solo.value.game.phase === 'lost' && !solo.value.practice && !solo.value.blockedAck) { solo.value.blockedPending = true; persist(); void reportBlocked() }
  }
  let reportingBlocked = false
  async function reportBlocked() {
    if (reportingBlocked || !solo.value.blockedPending) return
    reportingBlocked = true
    const saved = solo.value
    try { await playPost('solo/blocked', { roundId: saved.game.roundId, token: saved.token }); saved.blockedPending = false; saved.blockedAck = true; persist() }
    catch { /* Retry meaningful round status on the next periodic/foreground sync. */ }
    finally { reportingBlocked = false }
  }
  async function durableAction(action: GameAction) {
    inventoryGeneration++
    if (solo.value.practice) throw new Error('联网后重开本关，即可获得和使用道具')
    // Validate before spending. A pending receipt freezes solo input until retried.
    // Game state is JSON data. Nested reactive definitions can survive toRaw(),
    // so normalize the whole checkpoint before preparing a durable operation.
    const candidate = JSON.parse(JSON.stringify(solo.value.game)) as GameState
    applyGameAction(candidate, { ...action, couponConfirmed: action.type === 'unlock' }, Date.now() + serverOffset.value)
    const pending = solo.value.pending || { operationId: crypto.randomUUID(), action }
    solo.value.pending = pending
    if (!persist()) throw new Error('本机空间不足，无法保存操作凭据；请释放空间后重试')
    const { operationId } = pending
    const path = action.type === 'unlock' ? 'solo/unlock' : 'solo/tool'
    let data
    try { data = await playPost(path, { roundId: solo.value.game.roundId, token: solo.value.token, operationId, tool: action.type, couponId: action.couponId }) }
    catch (error) {
      const status = (error as { status?: number }).status
      if (status && status >= 400 && status < 500) { solo.value.pending = undefined; persist() }
      throw error
    }
    if (!solo.value.game.applied.includes(operationId)) {
      if (data.tools) candidate.tools = data.tools
      candidate.applied.push(operationId); solo.value.game = candidate
    }
    solo.value.pending = undefined; persist(); sound.playPowerUp()
  }
  function dispatch(action: GameAction) {
    if (isResolving.value || rewardPending.value) return
    operationError.value = ''
    if (couple.value) { sendRoomAction(action); return }
    if (['hint', 'rescue'].includes(action.type) || (action.type === 'unlock' && game.value.settings.slotUnlockCondition === 'love_coupon')) {
      void busy(() => durableAction(action)); return
    }
    try { localAction(action) } catch (error) { showSlotToast((error as Error).message) }
  }
  async function busy(action: () => Promise<unknown>) {
    if (actionBusy.value) return
    actionBusy.value = true; operationError.value = ''
    try { await action() } catch (error) { operationError.value = error instanceof Error ? error.message : '操作暂未确认，请重试' }
    finally { actionBusy.value = false }
  }
  function handleCardClick(card: CardItem) { dispatch({ type: 'pick', cardId: card.id }) }
  function handleReturnStaged(card: CardItem) { dispatch({ type: 'return', cardId: card.id }) }
  function handleHint() { dispatch({ type: 'hint' }) }
  function handleSummonBoyfriend() { dispatch({ type: 'rescue' }) }
  function handleUnlockSlot() {
    const couponId = loveCoupons.value.find(coupon => !coupon.used)?.id
    if (game.value.settings.slotUnlockCondition === 'love_coupon' && !couponId) { showSlotToast('没有可用的心愿券'); return }
    dispatch({ type: 'unlock', couponId })
  }
  function restartCurrentLevel() {
    if (booting.value || actionBusy.value || roomBusy.value || rewardPending.value || hasPending.value) return
    if (couple.value) sendRoomAction({ type: 'restart' })
    else void busy(() => startSolo(currentLevel.value))
  }
  function handleNextLevel() {
    if (booting.value || hasPending.value || actionBusy.value || roomBusy.value || rewardPending.value) return
    if (rewardUnconfirmed.value) { void finishSolo(); return }
    if (couple.value) sendRoomAction({ type: 'next' })
    else void busy(() => startSolo(currentLevel.value % totalLevelsCount.value + 1))
  }
  function setModal(type: 'open_coupons' | 'close_modal') {
    if (couple.value) sendRoomAction({ type })
    else { applyGameAction(solo.value.game, { type }); saveSoon() }
  }
  function filterCoupons(tab: GameState['couponTab']) {
    if (couple.value) sendRoomAction({ type: 'filter_coupons', tab })
    else { applyGameAction(solo.value.game, { type: 'filter_coupons', tab }); saveSoon() }
  }
  function openCoupons() { setModal('open_coupons') }
  function closeCoupons() { setModal('close_modal') }
  function closeBoyfriendModal() { setModal('close_modal') }
  async function handleRedeemCoupon(couponId: string) {
    await busy(async () => {
      const previous = localStorage.getItem('gang_pending_redeem')
      if (previous && previous !== couponId) throw new Error('上一张券尚未确认，请先重试未确认操作')
      const key = 'gang_redeem_' + couponId, operationId = localStorage.getItem(key) || crypto.randomUUID()
      localStorage.setItem(key, operationId)
      localStorage.setItem('gang_pending_redeem', couponId)
      try {
        await playPost('coupons/redeem', { couponId, operationId })
        localStorage.removeItem(key); localStorage.removeItem('gang_pending_redeem')
      } catch (error) {
        const status = (error as { status?: number }).status
        if (status && status >= 400 && status < 500) { localStorage.removeItem(key); localStorage.removeItem('gang_pending_redeem') }
        throw error
      }
    })
  }
  function retryPending() {
    if (localStorage.getItem('gang_room_entry')) { void busy(retryRoomEntry); return }
    const pendingCoupon = localStorage.getItem('gang_pending_redeem')
    if (pendingCoupon) { void handleRedeemCoupon(pendingCoupon); return }
    if (couple.value) { reconnectRoom(); return }
    if (solo.value.pending) void busy(() => durableAction(solo.value.pending!.action))
    else if (solo.value.game.phase === 'won') void finishSolo()
    else void busy(() => startSolo(currentLevel.value))
  }
  async function switchMode(action: 'create' | 'join' | 'resume' | 'solo', code = '') {
    if (booting.value || rewardPending.value || hasPending.value || roomBusy.value) return
    await busy(async () => {
      if (action === 'solo') { leaveRoom(); hasSavedRoom.value = true; scheduleResolve(); return }
      persist()
      if (action === 'create') await createRoom()
      if (action === 'join') await joinRoom(code)
      if (action === 'resume') await resumeRoom()
      hasSavedRoom.value = !!localStorage.getItem('gang_room_credentials')
    })
  }
  async function syncPageState() {
    if (couple.value || syncPending || document.hidden) return
    syncPending = true
    try {
      if (solo.value.blockedPending) void reportBlocked()
      const response = await fetch(getBaseUrl() + '/api/state', { headers: etag ? { 'If-None-Match': etag } : {}, cache: 'no-cache', signal: AbortSignal.timeout(5000) })
      if (response.ok) { const data = await response.json(); if (data.state) acceptServerState(data.state); etag = response.headers.get('etag') || '' }
      if (!solo.value.practice && solo.value.token && !solo.value.pending) {
        const id = solo.value.game.roundId, generation = inventoryGeneration
        const data = await playPost('solo/sync', { roundId: id, token: solo.value.token })
        if (solo.value.game.roundId === id && !solo.value.pending && inventoryGeneration === generation) { solo.value.game.tools = data.tools; saveSoon() }
      }
    } catch { /* Solo card input remains local. */ } finally { syncPending = false }
  }
  function visibility() { persist(); if (!document.hidden) { if (couple.value) reconnectRoom(false); else void syncPageState() } }
  onMounted(async () => {
    const raw = localStorage.getItem(SOLO_KEY)
    let restored = false
    if (raw) try {
      const saved = JSON.parse(raw) as SoloSave
      const g = saved.game
      if (g?.cards?.length && g.cards.every(c => Number.isSafeInteger(c.id) && typeof c.type === 'string' && ['board', 'slot', 'staged', 'cleared'].includes(c.status)) &&
        [g.slots, g.staged, g.eliminating, g.hinted, g.applied, g.defs].every(Array.isArray) && g.settings?.levels?.length &&
        Number.isFinite(g.startedAt) && Number.isInteger(g.tools?.hint) && Number.isInteger(g.tools?.rescue) && g.profile && typeof g.roundId === 'string') { solo.value = saved; restored = true }
    } catch { /* Start a fresh round if the local checkpoint is malformed. */ }
    await Promise.all([syncPageState(), !restored ? startSolo(1, true) : Promise.resolve()])
    if (destroyed) return
    if (hasSavedRoom.value && localStorage.getItem('gang_play_mode') !== 'solo') await resumeRoom()
    hasSavedRoom.value = !!localStorage.getItem('gang_room_credentials')
    booting.value = false
    if (solo.value.pending || localStorage.getItem('gang_pending_redeem') || localStorage.getItem('gang_room_entry')) operationError.value = '有操作尚未确认，请点击重试'
    if (!couple.value) { scheduleResolve(); if (game.value.phase === 'won') void finishSolo() }
    let ticks = 0
    timer = setInterval(() => { now.value = Date.now(); if (++ticks % 10 === 0) void syncPageState() }, 1000)
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', persist)
  })
  onUnmounted(() => {
    destroyed = true; persist(); stopRoom(false)
    if (timer) clearInterval(timer); if (settle) clearTimeout(settle); if (toastTimer) clearTimeout(toastTimer)
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', persist)
  })
  return { couple, roomInfo, roomConnection, roomBusy, hasSavedRoom, switchMode, reconnectRoom, actionBusy, operationError, rewardPending,
    game, solo, currentLevel, allCards, slotCards, stagedCards, eliminatingIds, unlockedSlots, matchCountThisRound, activeGameSettings, roundCardDefs, boardLayout, cardDefs,
    propsState, isResolving, canRescue, activeBoardCards, remainingCardsCount, availableCardsCount, totalCardsCount, totalLevelsCount, slotUnlockProgress,
    loveCoupons, unusedCouponsCount, couponDisplayName, cardTextMode, latestWonCoupon, rewardUnconfirmed, rescueProfile, soundEnabled, elapsedText, showBoyfriendModal, showWinModal, showFailModal, showCouponsModal,
    slotToastMessage, hasPending, booting, now, serverOffset, getCardDef, initLevel, handleCardClick, handleReturnStaged, handleHint, handleSummonBoyfriend, handleUnlockSlot,
    restartCurrentLevel, handleNextLevel, openCoupons, filterCoupons, closeCoupons, closeBoyfriendModal, handleRedeemCoupon, retryPending,
    toggleSound: () => { soundEnabled.value = !soundEnabled.value } }
}
