// Shared by generation, coverage and rendering. Positions use these grid steps.
export const BOARD_LAYOUT = {
  width: 420,
  height: 540,
  padding: 12,
  cardWidth: 54,
  cardHeight: 64,
  stepX: 58,
  stepY: 68
} as const

export const CARD_GRID_WIDTH = BOARD_LAYOUT.cardWidth / BOARD_LAYOUT.stepX
export const CARD_GRID_HEIGHT = BOARD_LAYOUT.cardHeight / BOARD_LAYOUT.stepY
export const BOARD_MAX_X = (BOARD_LAYOUT.width - BOARD_LAYOUT.padding * 2 - BOARD_LAYOUT.cardWidth) / BOARD_LAYOUT.stepX
export const BOARD_MAX_Y = (BOARD_LAYOUT.height - BOARD_LAYOUT.padding * 2 - BOARD_LAYOUT.cardHeight) / BOARD_LAYOUT.stepY

export function getBoardCardStyle(card: { x: number; y: number; layer: number }) {
  return {
    left: `${(BOARD_LAYOUT.padding + card.x * BOARD_LAYOUT.stepX) / BOARD_LAYOUT.width * 100}%`,
    top: `${(BOARD_LAYOUT.padding + card.y * BOARD_LAYOUT.stepY) / BOARD_LAYOUT.height * 100}%`,
    width: `${BOARD_LAYOUT.cardWidth / BOARD_LAYOUT.width * 100}%`,
    height: `${BOARD_LAYOUT.cardHeight / BOARD_LAYOUT.height * 100}%`,
    zIndex: card.layer + 1
  }
}
