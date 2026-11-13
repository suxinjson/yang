import { defaultGameSettings } from './gameConfig.js'
import { normalizeBoyfriendSettings } from './boyfriendConfig.js'
import { defaultWishPools } from './wishPools.js'
import { normalizeCardCatalog } from './cardGroups.js'

export function defaultPublicConfig() {
  return {
    ...normalizeCardCatalog({}),
    rewardPolicy: { simultaneous: true, hintChance: 35, rescueChance: 20, couponChance: 100 },
    cardTextMode: 'name',
    ...normalizeBoyfriendSettings({}),
    gameSettings: defaultGameSettings(),
    bfPhotoIndex: 1,
    couponName: '专属心愿券',
    gfPenaltyRatio: 50,
    activeCardPhotos: {
      iron_heart: '/photos/iron_heart.jpg', steel_heart: '/photos/steel_heart.jpg',
      sock_meme: '/photos/sock_meme.png', birthday_photo: '/photos/birthday_photo.jpg',
      flower_photo: '/photos/flower_photo.jpg', boyfriend_photo: '/photos/bf_1.jpg'
    },
    ...defaultWishPools()
  }
}
