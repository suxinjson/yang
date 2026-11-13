import { createLevel, updateCardCoverage } from './levelGenerator.js'
import { getBoardLayout } from './boardGeometry.js'
import { normalizeGameSettings } from './gameConfig.js'
import { normalizeBoyfriendSettings } from './boyfriendConfig.js'
import { normalizeCardCatalog } from './cardGroups.js'

const ruleError = message => Object.assign(new Error(message), { status: 400 })

export const INITIAL_TOOLS = Object.freeze({ hint: 2, rescue: 1 })

export function createGame(config, level = 1, roundId = crypto.randomUUID(), now = Date.now()) {
  config = JSON.parse(JSON.stringify(config))
  const settings = normalizeGameSettings(config.gameSettings)
  level = Math.max(1, Math.min(settings.levels.length, level))
  const boyfriend = normalizeBoyfriendSettings(config)
  const photos = boyfriend.bfPhotos
  const profile = photos[config.bfPhotoIndex === 0 ? Math.floor(Math.random() * photos.length) : Math.max(0, Math.min(5, (config.bfPhotoIndex || 1) - 1))]
  const catalog = normalizeCardCatalog(config)
  const selected = settings.levels[level - 1].cardGroupIds
  const defs = catalog.customCards.filter(def => !selected || selected.includes(def.groupId)).map(def => ({ ...def, staticImage: config.activeCardPhotos?.[def.id] || def.staticImage }))
  if (!defs.length) throw ruleError('本关选中的卡片分组没有卡片，请在后台调整')
  const { cards } = createLevel(level, defs.map(def => def.id), Math.random, settings)
  return { roundId, level, settings, defs, profile, cards, slots: [], staged: [], eliminating: [], resolveAt: 0,
    phase: 'playing', modal: '', couponTab: 'all', startedAt: now, endedAt: 0, matches: 0, unlocked: settings.initialSlots,
    tools: { hint: 0, rescue: 0 }, hinted: [], hintUntil: 0, rewardId: '', applied: [] }
}

function coverage(game) {
  const layout = getBoardLayout(game.settings)
  updateCardCoverage(game.cards, layout.cardWidth / layout.stepX, layout.cardHeight / layout.stepY)
}
function addToSlot(game, card) {
  card.status = 'slot'
  const last = game.slots.findLastIndex(id => game.cards.find(card => card.id === id).type === card.type)
  game.slots.splice(last === -1 ? game.slots.length : last + 1, 0, card.id)
}
function checkMatch(game, now) {
  const counts = new Map()
  for (const id of game.slots) {
    const type = game.cards.find(card => card.id === id).type
    const group = counts.get(type) || []
    group.push(id); counts.set(type, group)
    if (group.length === 3) {
      game.eliminating = group
      game.resolveAt = now + 240
      game.matches++
      if (game.settings.slotUnlockCondition === 'match_count' && game.unlocked < game.settings.maxSlots && game.matches >= game.settings.slotUnlockMatchCount) {
        game.matches -= game.settings.slotUnlockMatchCount
        game.unlocked++
      }
      return
    }
  }
  if (game.slots.length >= game.unlocked || (!game.staged.length && game.cards.every(card => card.status !== 'board'))) { game.phase = 'lost'; game.endedAt = now }
}

export function settleGame(game, now = Date.now()) {
  if (!game.resolveAt || now < game.resolveAt) return false
  const ids = new Set(game.eliminating)
  const group = game.cards.filter(card => ids.has(card.id))
  const validMatch = group.length === 3 && group.every(card => card.status === 'slot' && card.type === group[0].type)
  if (validMatch) {
    game.cards.forEach(card => { if (ids.has(card.id)) card.status = 'cleared' })
    game.slots = game.slots.filter(id => !ids.has(id))
  }
  game.eliminating = []; game.resolveAt = 0
  if (game.cards.every(card => card.status === 'cleared')) { game.phase = 'won'; game.endedAt = now }
  else if (!game.staged.length && game.cards.every(card => card.status !== 'board')) { game.phase = 'lost'; game.endedAt = now }
  return true
}

// Shared validation ensures both modes have the same rules. The room server is
// the sole writer in couple mode; solo card picks run entirely on the device.
export function applyGameAction(game, action, now = Date.now()) {
  const { type } = action
  if (type === 'filter_coupons') {
    if (!['all', 'unredeemed', 'redeemed'].includes(action.tab)) throw ruleError('筛选条件无效')
    game.couponTab = action.tab; return
  }
  if (type === 'open_coupons') { game.modal = 'coupons'; return }
  if (type === 'close_modal') { game.modal = ''; return }
  if (game.resolveAt) throw ruleError('正在消除，请稍候')
  if (!['playing', 'lost'].includes(game.phase)) throw ruleError('本关已结束')
  if (type === 'pick' || type === 'return') {
    if (game.phase !== 'playing' || game.slots.length >= game.unlocked) throw ruleError('卡槽已满，请先救场')
    const card = game.cards.find(card => card.id === action.cardId)
    if (!card || (type === 'pick' ? card.status !== 'board' || card.isCovered : card.status !== 'staged')) throw ruleError('这张卡片暂时不能选择')
    if (type === 'return') game.staged = game.staged.filter(id => id !== card.id)
    addToSlot(game, card); coverage(game); checkMatch(game, now)
    return
  }
  if (type === 'hint') {
    if (game.phase !== 'playing' || game.tools.hint <= 0) throw ruleError('没有可用的提示')
    const exposed = game.cards.filter(card => card.status === 'board' && !card.isCovered)
    if (!exposed.length) throw ruleError('请先放回暂存区卡片')
    const score = card => game.slots.filter(id => game.cards.find(item => item.id === id).type === card.type).length * 10 + exposed.filter(item => item.type === card.type).length
    exposed.sort((a, b) => score(b) - score(a))
    game.hinted = exposed.filter(card => card.type === exposed[0].type).slice(0, 3).map(card => card.id)
    game.hintUntil = now + 5000; game.tools.hint--
    return
  }
  if (type === 'rescue') {
    if (game.tools.rescue <= 0 || !game.slots.length || game.staged.length) throw ruleError('救场需要卡槽有牌且暂存区为空')
    game.tools.rescue--
    game.staged = game.slots.splice(0, 3)
    game.cards.forEach(card => { if (game.staged.includes(card.id)) card.status = 'staged' })
    game.phase = 'playing'; game.endedAt = 0; game.modal = 'rescue'
    if (game.settings.slotUnlockCondition === 'boyfriend_rescue') game.unlocked = Math.min(game.settings.maxSlots, game.unlocked + 1)
    return
  }
  if (type === 'unlock') {
    if (game.unlocked >= game.settings.maxSlots) throw ruleError('卡槽已全部解锁')
    const condition = game.settings.slotUnlockCondition
    if (condition === 'love_coupon' && !action.couponConfirmed) throw ruleError('需要消耗一张未使用的心愿券')
    if (condition === 'match_count') throw ruleError(`每消除 ${game.settings.slotUnlockMatchCount} 组自动解锁一格`)
    if (condition === 'boyfriend_rescue') throw ruleError('使用救场道具后自动解锁')
    if (condition === 'urgent_click' && game.slots.length < game.unlocked - 1) throw ruleError('剩余不超过一格时可以解锁')
    game.unlocked++
    if (game.phase === 'lost') { game.phase = 'playing'; game.endedAt = 0 }
    return
  }
  throw ruleError('不支持的操作')
}
