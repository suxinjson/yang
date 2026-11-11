export function defaultBoyfriendPhotos() {
  return Array.from({ length: 6 }, (_, index) => ({ name: '我的帅照', image: `/photos/bf_${index + 1}.jpg` }))
}

function validImage(value) {
  return typeof value === 'string' && value.length <= 2_000_000 &&
    (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || /^\/(?!\/)[^\s]+$/.test(value) || /^https?:\/\/[^\s]+$/.test(value))
}

export function normalizeBoyfriendSettings(input) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const legacy = Array.isArray(raw.customCards) ? raw.customCards.find(card => card?.id === 'boyfriend_photo') : null
  const selected = typeof raw.bfPhotoIndex === 'number' && raw.bfPhotoIndex >= 1 && raw.bfPhotoIndex <= 6 ? Math.round(raw.bfPhotoIndex) - 1 : 0
  const legacyImage = legacy?.customImage || raw.activeCardPhotos?.boyfriend_photo
  return {
    bfCardEnabled: typeof raw.bfCardEnabled === 'boolean' ? raw.bfCardEnabled : true,
    bfPhotos: defaultBoyfriendPhotos().map((fallback, index) => {
      const entry = Array.isArray(raw.bfPhotos) ? raw.bfPhotos[index] : null
      const name = typeof entry?.name === 'string' ? entry.name : legacy?.name
      // Old activeCardPhotos contained bf_1 by default, even after switching presets.
      const migratedImage = index === selected && legacyImage !== '/photos/bf_1.jpg' ? legacyImage : undefined
      return {
        name: typeof name === 'string' ? name.trim().slice(0, 20) || fallback.name : fallback.name,
        image: validImage(entry?.image) ? entry.image : validImage(migratedImage) ? migratedImage : fallback.image
      }
    })
  }
}
