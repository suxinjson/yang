import { applyGameAction, settleGame } from '../../shared/gameEngine.js'

// Small-board solver for integration tests: uses the real engine, never bypasses settlement.
export function winningActions(initial) {
  const seen = new Set()
  function visit(game, actions) {
    if (game.resolveAt) settleGame(game, game.resolveAt)
    if (game.phase === 'won') return actions
    if (game.phase !== 'playing') return null
    const key = game.cards.map(c => c.status).join(',') + ':' + game.slots.join(',')
    if (seen.has(key)) return null
    seen.add(key)
    const available = game.cards.filter(c => c.status === 'board' && !c.isCovered)
    available.sort((a, b) => game.slots.filter(id => game.cards[id].type === b.type).length - game.slots.filter(id => game.cards[id].type === a.type).length)
    for (const card of available) {
      const next = structuredClone(game), action = { type: 'pick', cardId: card.id }
      applyGameAction(next, action)
      const result = visit(next, [...actions, action])
      if (result) return result
    }
    return null
  }
  const actions = visit(structuredClone(initial), [])
  if (!actions) throw new Error('Test board has no winning path')
  return actions
}
