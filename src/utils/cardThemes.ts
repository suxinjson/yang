import type { CardDefinition } from '../types/game'
import { loadAdminConfig } from './adminConfig'
import { serverState } from './serverState'

import { DEFAULT_CARD_DEFINITIONS } from '../../shared/cardDefinitions.js'

// Storage key for user customized photos via UI
const STORAGE_KEY = 'couple_game_custom_tiles_v1'

export function loadCardDefinitions(): CardDefinition[] {
  const admin = loadAdminConfig()

  let baseDefs = DEFAULT_CARD_DEFINITIONS
  if (admin.customCards && Array.isArray(admin.customCards) && admin.customCards.length >= 3) {
    baseDefs = admin.customCards
  }

  let savedUserPhotos: Record<string, string> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        savedUserPhotos = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      }
    }
  } catch (e) {
    console.error('Failed to load customized tiles', e)
  }

  return baseDefs.map(def => {
    let staticImg = def.staticImage

    // Photo overrides for the other card types.
    if (admin.activeCardPhotos && admin.activeCardPhotos[def.id]) {
      staticImg = admin.activeCardPhotos[def.id]
    }

    return {
      ...def,
      staticImage: staticImg,
      customImage: def.customImage || (!serverState.value ? savedUserPhotos[def.id] : undefined)
    }
  })
}
