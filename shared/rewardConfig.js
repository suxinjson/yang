export function normalizeRewardPolicy(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const percent = (number, fallback) => typeof number === 'number' && Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number * 100) / 100)) : fallback
  return {
    simultaneous: input.simultaneous !== false,
    hintChance: percent(input.hintChance, 35),
    rescueChance: percent(input.rescueChance, 20),
    couponChance: percent(input.couponChance, 100),
    clothingChance: percent(input.clothingChance, 0)
  }
}
