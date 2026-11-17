import { applyGameAction, settleGame } from './gameEngine.js'

// Card input remains local. Only a complete replay of the issued board can settle rewards.
export function verifySoloWin(round, actions) {
  const invalid = () => Object.assign(new Error('通关操作记录无效，请更新客户端后重新开始本关'), { status: 400 })
  if (!Array.isArray(actions) || !actions.length || actions.length > Math.min(100000, round.game.cards.length * 20 + 1000)) throw invalid()
  const game = structuredClone(round.game)
  game.unlocked = game.settings.initialSlots
  game.tools = { hint: 0, rescue: 0 }
  const spent = new Set()
  let now = game.startedAt, movesCount = 0
  for (const entry of actions) {
    if (!entry || !['pick', 'return', 'hint', 'rescue', 'unlock'].includes(entry.type)) throw invalid()
    if (game.resolveAt) { now = game.resolveAt; settleGame(game, now) }
    const action = { type: entry.type, cardId: entry.cardId }
    const paid = ['hint', 'rescue'].includes(entry.type) || (entry.type === 'unlock' && game.settings.slotUnlockCondition === 'love_coupon')
    if (paid) {
      const receipt = typeof entry.operationId === 'string' && Object.hasOwn(round.operations, entry.operationId) ? round.operations[entry.operationId] : null
      if (!receipt || receipt.tool !== entry.type || spent.has(entry.operationId)) throw invalid()
      spent.add(entry.operationId)
      if (entry.type === 'unlock') action.couponConfirmed = true
      else game.tools[entry.type]++
    }
    if (['pick', 'return'].includes(entry.type)) {
      if (!Number.isSafeInteger(entry.cardId)) throw invalid()
      movesCount++
    }
    applyGameAction(game, action, now)
  }
  if (game.resolveAt) settleGame(game, game.resolveAt)
  if (game.phase !== 'won' || game.cards.some(card => card.status !== 'cleared')) throw invalid()
  return { movesCount }
}
