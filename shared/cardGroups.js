import { DEFAULT_CARD_DEFINITIONS } from './cardDefinitions.js'
import { normalizeBoyfriendSettings } from './boyfriendConfig.js'

export const DEFAULT_CARD_GROUPS = Object.freeze([{ id: 'everyday', name: '甜蜜日常' }, { id: 'boyfriend', name: '男友帅照' }])
export function normalizeCardCatalog(config = {}) {
  const groups = Array.isArray(config.cardGroups) && config.cardGroups.length ? config.cardGroups : DEFAULT_CARD_GROUPS
  const seen = new Set()
  const cardGroups = groups.filter(g => g && /^[a-zA-Z0-9_-]{1,100}$/.test(g.id) && typeof g.name === 'string' && g.name.trim() && !seen.has(g.id) && seen.add(g.id)).map(g => ({ id: g.id, name: g.name.trim().slice(0, 30) }))
  if (!cardGroups.length) cardGroups.push(...DEFAULT_CARD_GROUPS.map(g => ({ ...g })))
  const legacy = !Array.isArray(config.cardGroups)
  if (legacy && !cardGroups.some(g => g.id === 'boyfriend')) cardGroups.push({ id: 'boyfriend', name: '男友帅照' })
  const valid = new Set(cardGroups.map(g => g.id))
  const source = config.customCards?.length >= 3 ? config.customCards : DEFAULT_CARD_DEFINITIONS
  let customCards = structuredClone(source).map(c => ({ ...c, groupId: valid.has(c.groupId) ? c.groupId : (c.id === 'boyfriend_photo' && valid.has('boyfriend') ? 'boyfriend' : cardGroups[0].id) }))
  // Convert the old dedicated six-photo feature once. Thereafter all photos are ordinary editable cards.
  if (legacy) {
    const photos = normalizeBoyfriendSettings(config).bfPhotos
    customCards = customCards.filter(c => c.id !== 'boyfriend_photo')
    if (config.bfCardEnabled !== false) photos.forEach((p, i) => customCards.push({ ...DEFAULT_CARD_DEFINITIONS.find(c => c.id === 'boyfriend_photo'), id: i === 0 ? 'boyfriend_photo' : `boyfriend_photo_${i + 1}`, groupId: 'boyfriend', name: p.name, staticImage: p.image }))
  }
  return { cardGroups, customCards }
}
